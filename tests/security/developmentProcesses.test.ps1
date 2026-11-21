$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot '../../scripts/development-processes.ps1') -Mode Library
function Assert-True($Value,$Message){if(-not $Value){throw $Message}}
function Assert-Throws([scriptblock]$Action){$threw=$false;try{& $Action}catch{$threw=$true};Assert-True $threw 'Expected refusal'}
$script:Stopped=@()
$script:Processes=@{}
$script:Listeners=@()
function Get-NetTCPConnection {[CmdletBinding()]param($LocalPort,$State) return $script:Listeners}
function Get-CimInstance {[CmdletBinding()]param($ClassName,$Filter) $identifier=[int]([regex]::Match($Filter,'\d+').Value);return $script:Processes[$identifier]}
function Stop-Process {[CmdletBinding()]param([int]$Id) $script:Stopped+=@($Id)}
function Reset-Fixture {
  $script:Stopped=@()
  $script:Processes=@{
    11=[pscustomobject]@{ProcessId=11;ParentProcessId=12;Name='node.exe';CreationDate=[datetime]'2026-11-15T01:00:00Z';CommandLine=('node.exe "'+$script:ReconProjectRoot+'\node_modules\next\dist\server\lib\start-server.js"')}
    12=[pscustomobject]@{ProcessId=12;ParentProcessId=13;Name='node.exe';CreationDate=[datetime]'2026-11-15T00:59:59Z';CommandLine=('node.exe "'+$script:ReconProjectRoot+'\node_modules\next\dist\bin\next" dev --webpack')}
    13=[pscustomobject]@{ProcessId=13;ParentProcessId=14;Name='node.exe';CreationDate=[datetime]'2026-11-15T00:59:58Z';CommandLine='node scripts/eid04-disposable.mjs dev'}
    14=[pscustomobject]@{ProcessId=14;ParentProcessId=15;Name='powershell.exe';CreationDate=[datetime]'2026-11-15T00:59:57Z';CommandLine='powershell.exe'}
  }
  $script:Listeners=@([pscustomobject]@{OwningProcess=11;LocalAddress='::1'})
}
Reset-Fixture
$groups=@(Get-ReconDevelopmentGroups)
Assert-True ($groups[0].kind -eq 'RECON_NEXT_DEV') 'Project dev server should be recognized'
Assert-True (($groups[0].members.id -join ',') -eq '11,12,13') 'Only verified Node launchers should be selected'
Assert-Throws {Stop-ConfirmedReconDevelopmentGroups $groups ''}
Assert-True ($script:Stopped.Count -eq 0) 'No termination without confirmation'
$null=Stop-ConfirmedReconDevelopmentGroups $groups 'STOP'
Assert-True (($script:Stopped -join ',') -eq '11,12,13') 'Only approved Node processes may stop'

foreach($case in @('postgres','unrelated','production','reused')) {
  Reset-Fixture
  $expected=@(Get-ReconDevelopmentGroups)
  switch($case) {
    'postgres' {$script:Processes[11].Name='postgres.exe'}
    'unrelated' {$script:Processes[11].CommandLine='node C:\another-project\server.js'}
    'production' {$script:Processes[12].CommandLine=$script:Processes[12].CommandLine.Replace(' dev ',' start ')}
    'reused' {$script:Processes[11].CreationDate=$script:Processes[11].CreationDate.AddSeconds(2)}
  }
  Assert-Throws {Stop-ConfirmedReconDevelopmentGroups $expected 'STOP'}
  Assert-True ($script:Stopped.Count -eq 0) "Unsafe process was terminated in case $case"
}
Write-Output 'PROCESS_GUARD_TESTS_PASSED: confirmation, exact project/dev scope, terminal exclusion, PostgreSQL exclusion, production exclusion, unrelated process exclusion and PID reuse'
