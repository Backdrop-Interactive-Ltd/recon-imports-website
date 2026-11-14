param([Parameter(Mandatory=$true)][string]$PlanDirectory,[Parameter(Mandatory=$true)][string]$CertificateFile)
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot;Set-Location -LiteralPath $root
$node=(Get-Command node.exe).Source;$script=Join-Path $PSScriptRoot 'launch06-execute.mjs'
# The Node controller independently rejects missing/mismatched owner authorization before any write.
& $node $script --check-authorization $PlanDirectory
if($LASTEXITCODE -ne 0){throw 'Fresh explicit owner authorization is required. The prior stop remains effective; no credential prompt or write will run.'}
$run=(& $node $script --prepare).Trim();if($LASTEXITCODE -ne 0){throw 'Execution directory preparation failed.'}
$Host.UI.RawUI.WindowTitle='RECON IMPORTS LAUNCH-06 - AUTHORIZED DATABASE EXECUTION'
Write-Host 'Authorized scope only: new roles, reviewed hardening, 12 migrations, exact approved 31 rows.'
Write-Host 'No reset/repair/retry, local owner writes, media changes, push or deployment.'
$backupKey=Read-Host 'Backup encryption passphrase from the separate password manager (hidden)' -AsSecureString
$operator=Read-Host 'Existing Supabase provisioning operator password (hidden)' -AsSecureString
Write-Host 'The existing WEBSITE SUPER_ADMIN password is read privately from local .env and verified against the unchanged approved hash. No reset or password display.'
function Invoke-PrivateNode([hashtable]$Values,[hashtable]$Secrets){
  $pointers=@();$payload=$null
  try{
    foreach($name in $Secrets.Keys){$ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secrets[$name]);$pointers+=,$ptr;$Values[$name]=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)}
    $payload=$Values|ConvertTo-Json -Compress;$payload=[regex]::Replace($payload,'[^\u0000-\u007F]',{param($m)'\u'+([int][char]$m.Value).ToString('x4')})
    $start=New-Object System.Diagnostics.ProcessStartInfo;$start.FileName=$node;$start.Arguments='--import tsx --experimental-vm-modules "'+$script+'" "'+$run+'"';$start.WorkingDirectory=$root
    $start.UseShellExecute=$false;$start.CreateNoWindow=$true;$start.RedirectStandardInput=$true;$start.RedirectStandardOutput=$true;$start.RedirectStandardError=$true
    $child=[System.Diagnostics.Process]::Start($start);$child.StandardInput.Write($payload);$child.StandardInput.Close();$payload=$null
    $out=$child.StandardOutput.ReadToEnd();$null=$child.StandardError.ReadToEnd();$child.WaitForExit();Write-Host $out
    if($child.ExitCode -ne 0){throw 'Execution stopped. Retain evidence; do not retry or repair automatically.'}
  }finally{foreach($ptr in $pointers){[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)};$payload=$null;foreach($name in $Secrets.Keys){$Values[$name]=$null}}
}
$oldPg=@{};foreach($name in @('PGSERVICEFILE','PGPASSFILE','PGOPTIONS')){$oldPg[$name]=[Environment]::GetEnvironmentVariable($name,'Process')}
$migrator=$null;$runtime=$null
try{
  Invoke-PrivateNode @{phase='provision';planDirectory=$PlanDirectory;caFile=$CertificateFile} @{encryptionPassword=$backupKey;operatorPassword=$operator}
  $env:PGSERVICEFILE=Join-Path $run 'connection.service.tmp';$env:PGPASSFILE=Join-Path $run 'connection.pgpass.tmp';$env:PGOPTIONS='-c row_security=off -c password_encryption=scram-sha-256'
  $psql=Join-Path $env:LOCALAPPDATA 'ReconImports/PostgreSQL-17.11-rehearsal/pgsql/bin/psql.exe'
  Write-Host 'Native psql now prompts twice per NEW role. Use distinct strong generated passwords and save them in your password manager.'
  Write-Host 'The standard \password command hashes on the client; no plaintext password is placed in SQL/history or our logs.'
  foreach($role in @('recon_migrator','recon_runtime')){& $psql '-X' '-w' '-v' 'ON_ERROR_STOP=1' '--dbname=service=recon_backup' '-c' ('\password '+$role);if($LASTEXITCODE -ne 0){throw 'Native role password setup failed. Stop; no automatic retry.'}}
  foreach($name in $oldPg.Keys){[Environment]::SetEnvironmentVariable($name,$oldPg[$name],'Process')}
  $migrator=Read-Host 'Re-enter saved NEW recon_migrator password for migrations (hidden)' -AsSecureString
  $runtime=Read-Host 'Re-enter saved NEW recon_runtime password for read-only verification (hidden)' -AsSecureString
  Invoke-PrivateNode @{phase='migrate-import';planDirectory=$PlanDirectory;caFile=$CertificateFile} @{encryptionPassword=$backupKey;migratorPassword=$migrator;runtimePassword=$runtime}
  Write-Host ('Execution report directory: '+$run)
}catch{Write-Host 'STOPPED SAFELY. Review sanitized private execution reports. No automatic retries.';Write-Host ('Private execution directory: '+$run)}
finally{
  foreach($name in $oldPg.Keys){[Environment]::SetEnvironmentVariable($name,$oldPg[$name],'Process')}
  foreach($file in @('connection.service.tmp','connection.pgpass.tmp','connection-ca.tmp')){$target=Join-Path $run $file;if(Test-Path -LiteralPath $target){Remove-Item -LiteralPath $target}}
  $backupKey.Dispose();$operator.Dispose();if($migrator){$migrator.Dispose()};if($runtime){$runtime.Dispose()}
}
Read-Host 'Press Enter to close'|Out-Null
