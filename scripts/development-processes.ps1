param([ValidateSet('Inspect','Stop','Library')][string]$Mode='Inspect')
$ErrorActionPreference='Stop'
$script:ReconProjectRoot=Split-Path -Parent $PSScriptRoot

function Get-ReconDevelopmentGroups {
  $listeners=@(Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue)
  foreach($group in @($listeners | Group-Object OwningProcess)) {
    $listenerId=[int]$group.Name
    $members=@();$chain=@();$nextId=$listenerId
    for($depth=0;$depth -lt 8;$depth++) {
      $entry=Get-CimInstance Win32_Process -Filter "ProcessId=$nextId" -ErrorAction SilentlyContinue
      if(-not $entry -or $entry.Name -ne 'node.exe'){break}
      $chain+=@($entry)
      $nextId=[int]$entry.ParentProcessId
    }
    $projectNext=$chain.Count -gt 0 -and $chain[0].CommandLine.IndexOf(($script:ReconProjectRoot+'\'),[StringComparison]::OrdinalIgnoreCase) -ge 0 -and $chain[0].CommandLine -match '[\\/]node_modules[\\/]next[\\/]'
    $development=@($chain | Where-Object { $_.CommandLine -match '[\\/]next[\\/]dist[\\/]bin[\\/]next(?:\.js)?["\s]+dev(?:\s|$)' }).Count -gt 0
    if($projectNext -and $development) {
      foreach($entry in $chain) {
        $knownLauncher=$entry.CommandLine -match '[\\/]next[\\/]dist[\\/](?:server[\\/]lib[\\/]start-server\.js|bin[\\/]next(?:\.js)?["\s]+dev)|(?:^|[\\/\s])(?:dev-local|dev-next|eid04-disposable)\.mjs(?:\s|$)'
        if(-not $knownLauncher){break}
        $members+=@([pscustomobject]@{id=[int]$entry.ProcessId;created=$entry.CreationDate.ToUniversalTime().ToString('o')})
      }
    }
    [pscustomobject]@{listenerId=$listenerId;kind=$(if($members.Count -gt 0){'RECON_NEXT_DEV'}else{'UNVERIFIED'});members=$members;addresses=@($group.Group | ForEach-Object LocalAddress)}
  }
}

function Stop-ConfirmedReconDevelopmentGroups($Expected,[string]$Confirmation) {
  if($Confirmation -cne 'STOP'){throw 'Explicit STOP confirmation is required.'}
  $current=@(Get-ReconDevelopmentGroups)
  if($current.Count -eq 0){return}
  if($current.Count -ne @($Expected).Count){throw 'Listeners changed; confirmation is no longer valid.'}
  foreach($group in $current) {
    if($group.kind -ne 'RECON_NEXT_DEV'){throw 'An unrelated or unverified process owns port 3000. Nothing was stopped.'}
    $prior=@($Expected | Where-Object listenerId -eq $group.listenerId)
    if($prior.Count -ne 1 -or (ConvertTo-Json -Compress -Depth 5 $prior[0].members) -cne (ConvertTo-Json -Compress -Depth 5 $group.members)){throw 'Process identities changed; confirmation is no longer valid.'}
  }
  $stopped=@()
  foreach($member in @($current | ForEach-Object { $_.members } | Sort-Object id -Unique)) {
    $entry=Get-CimInstance Win32_Process -Filter "ProcessId=$($member.id)" -ErrorAction SilentlyContinue
    if(-not $entry){continue}
    if($entry.Name -ne 'node.exe' -or $entry.CreationDate.ToUniversalTime().ToString('o') -cne $member.created){throw 'Process changed before stopping; stopped safely.'}
    Stop-Process -Id $member.id -ErrorAction Stop
    $stopped+=@($member.id)
  }
  [pscustomobject]@{stoppedNodeProcesses=$stopped}
}

if($Mode -eq 'Inspect') {
  ConvertTo-Json -Compress -Depth 6 -InputObject @(Get-ReconDevelopmentGroups)
} elseif($Mode -eq 'Stop') {
  $request=[Console]::In.ReadToEnd() | ConvertFrom-Json
  Stop-ConfirmedReconDevelopmentGroups $request.groups $request.confirmation | ConvertTo-Json -Compress -Depth 6
}
