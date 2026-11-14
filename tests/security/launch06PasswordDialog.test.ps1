$ErrorActionPreference='Stop'
$root=Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Add-Type -Path (Join-Path $root 'scripts/launch06-runtime-password.cs') -ReferencedAssemblies 'System.Windows.Forms.dll','System.Drawing.dll'
$library=Join-Path $env:LOCALAPPDATA 'ReconImports/PostgreSQL-17.11-rehearsal/pgsql/bin/libpq.dll'
$version=[ReconRuntimePassword]::InitializeLibrary($library)
if($version -lt 170000 -or $version -ge 180000){throw 'Client version test failed.'}
$synthetic='synthetic-only-confirmation-32!'
if([ReconRuntimePassword]::ConfirmationStatus($synthetic,$synthetic) -ne 'MATCH'){throw 'Matching confirmation rejected.'}
if([ReconRuntimePassword]::ConfirmationStatus($synthetic,$synthetic+'x') -ne 'PASSWORDS_DO_NOT_MATCH'){throw 'Mismatch accepted.'}
if([ReconRuntimePassword]::ConfirmationStatus($synthetic+"`r`n",$synthetic) -ne 'USE_SINGLE_LINE_PRINTABLE_ASCII'){throw 'Multiline input accepted.'}
if([ReconRuntimePassword]::ConfirmationStatus('short','short') -ne 'USE_24_TO_128_CHARACTERS'){throw 'Short input accepted.'}
if([ReconRuntimePassword]::SafeCharacters($synthetic+"`t")){throw 'Hidden tab accepted.'}
if([ReconRuntimePassword]::SafeCharacters($synthetic+[char]0x200b)){throw 'Hidden Unicode input accepted.'}
if([ReconRuntimePassword]::ConnectionValue('path with spaces') -ne "'path with spaces'"){throw 'Connection value quoting failed.'}
$invalidRejected=$false;try{$null=[ReconRuntimePassword]::ConnectionValue("invalid`nvalue")}catch{$invalidRejected=$true};if(-not $invalidRejected){throw 'Multiline connection option accepted.'}
$form=[ReconRuntimePassword]::CreateDialog()
try{
  $first=$form.Controls['RuntimePassword'];$second=$form.Controls['RuntimeConfirmation'];$button=$form.Controls['ConfirmPassword']
  if(-not $first.UseSystemPasswordChar -or -not $second.UseSystemPasswordChar){throw 'Masking disabled.'}
  if($button.Enabled){throw 'Blank confirmation enabled.'}
  $first.Text=$synthetic;$second.Text=$synthetic+'x';if($button.Enabled){throw 'Mismatched confirmation enabled.'}
  $second.Text=$synthetic;if(-not $button.Enabled){throw 'Matching confirmation disabled.'}
  $first.Clear();$second.Clear();if($button.Enabled){throw 'Cleared confirmation enabled.'}
}finally{$form.Dispose();$synthetic=$null}
$receipt=Join-Path ([IO.Path]::GetTempPath()) ('recon-dialog-receipt-'+[guid]::NewGuid().ToString('N')+'.json')
try{
  '{"synthetic":true}' | Out-File -LiteralPath $receipt -NoClobber -Encoding UTF8
  $rejected=$false;try{'overwrite' | Out-File -LiteralPath $receipt -NoClobber -Encoding UTF8 -ErrorAction Stop}catch{$rejected=$true}
  if(-not $rejected -or -not (Get-Content -LiteralPath $receipt -Raw | ConvertFrom-Json).synthetic){throw 'Receipt preservation test failed.'}
}finally{if(Test-Path -LiteralPath $receipt){Remove-Item -LiteralPath $receipt}}
$probeFile=Join-Path ([IO.Path]::GetTempPath()) ('recon-native-service-'+[guid]::NewGuid().ToString('N')+'.ini')
$priorServiceFile=$env:PGSERVICEFILE
try{
  @('[recon_launch06_offline_probe]','host=127.0.0.1','port=1','user=offline_probe','dbname=postgres','connect_timeout=1') | Out-File -LiteralPath $probeFile -Encoding ascii -NoClobber
  $env:PGSERVICEFILE=$probeFile
  $nativeLookup=[ReconRuntimePassword]::ProbeSyntheticConnection($true)
  $emptyService=[ReconRuntimePassword]::ProbeSyntheticEmptyService()
  if($emptyService -ne 'LIBPQ_SERVICE_FILE_UNAVAILABLE'){throw 'Empty-service failure was not reproduced.'}
  $explicitLookup=[ReconRuntimePassword]::ProbeSyntheticConnection($false)
  if($explicitLookup -notin @('LIBPQ_CONNECTION_REFUSED','LIBPQ_CONNECTION_TIMEOUT')){throw 'Explicit connection options did not bypass service lookup.'}
  Write-Output ('Local-only probe: native service lookup='+$nativeLookup+'; empty service='+$emptyService+'; explicit parameters='+$explicitLookup)
}finally{[Environment]::SetEnvironmentVariable('PGSERVICEFILE',$priorServiceFile,'Process');if(Test-Path -LiteralPath $probeFile){Remove-Item -LiteralPath $probeFile}}
Write-Output 'PASS: official PostgreSQL 17 API, masked confirmation, hidden-input rejection, explicit parameters and preserved receipts. No production connections or database writes.'
