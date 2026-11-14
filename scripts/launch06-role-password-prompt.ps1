param([Parameter(Mandatory=$true)][ValidateSet('Inspect','InspectLogin','InspectDialog','Passwords','ContinueVerified')][string]$Mode,[Parameter(Mandatory=$true)][string]$PlanDirectory,[Parameter(Mandatory=$true)][string]$ExecutionDirectory,[Parameter(Mandatory=$true)][string]$CertificateFile,[string]$InspectionDirectory,[switch]$ContinueLaunch06)
$ErrorActionPreference='Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
$node=(Get-Command node.exe).Source;$script=Join-Path $PSScriptRoot 'launch06-role-passwords.mjs'
$run=(& $node $script --prepare).Trim();if($LASTEXITCODE -ne 0){throw 'Private directory preparation failed.'}
$Host.UI.RawUI.WindowTitle='RECON IMPORTS LAUNCH-06 - '+$(if($Mode -eq 'InspectLogin'){'READ ONLY EXISTING MIGRATOR LOGIN'}elseif($Mode -in @('Inspect','InspectDialog')){'READ ONLY PASSWORD STATE'}elseif($ContinueLaunch06){'AUTHORIZED REMAINING STEPS'}else{'AUTHORIZED PASSWORD SETUP ONLY'})
Write-Host $(if($Mode -in @('Inspect','InspectLogin','InspectDialog')){'Read-only check only. No password changes, migrations or import.'}elseif($ContinueLaunch06){'Only approved missing passwords, then remaining migrations/import. Completed provisioning is skipped.'}else{'Only approved missing role passwords. No role creation, migrations or import.'})
$key=$null;$operator=$null;$savedMigrator=$null
$verifiedPasswords=@{}
function Invoke-PrivateNode([string]$Operation,[string]$Role='', [Security.SecureString]$RolePassword=$null){
  $values=@{mode=$Operation;planDirectory=$PlanDirectory;executionDirectory=$ExecutionDirectory;caFile=$CertificateFile;inspectionDirectory=$InspectionDirectory;role=$Role;continuationRequested=[bool]$ContinueLaunch06};$secrets=@{encryptionPassword=$key;operatorPassword=$operator};if($RolePassword){$secrets.rolePassword=$RolePassword}
  $selectedScript=$script;$selectedRun=$run;$nodeOptions=''
  if($Operation -eq 'continue'){
    if(-not $ContinueLaunch06){throw 'Continuation was not selected.'}
    $values=@{phase='migrate-import';planDirectory=$PlanDirectory;caFile=$CertificateFile}
    $secrets=@{encryptionPassword=$key;migratorPassword=$verifiedPasswords['recon_migrator'];runtimePassword=$verifiedPasswords['recon_runtime']}
    $selectedScript=Join-Path $PSScriptRoot 'launch06-execute.mjs';$selectedRun=$ExecutionDirectory;$nodeOptions='--import tsx --experimental-vm-modules '
  }
  $pointers=@();$payload=$null
  try{
    foreach($name in $secrets.Keys){$ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secrets[$name]);$pointers+=,$ptr;$values[$name]=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)}
    $payload=$values|ConvertTo-Json -Compress;$payload=[regex]::Replace($payload,'[^\u0000-\u007F]',{param($m)'\u'+([int][char]$m.Value).ToString('x4')})
    $start=New-Object System.Diagnostics.ProcessStartInfo;$start.FileName=$node;$start.Arguments=$nodeOptions+'"'+$selectedScript+'" "'+$selectedRun+'"';$start.UseShellExecute=$false;$start.CreateNoWindow=$true;$start.RedirectStandardInput=$true;$start.RedirectStandardOutput=$true;$start.RedirectStandardError=$true
    $child=[System.Diagnostics.Process]::Start($start);$child.StandardInput.Write($payload);$child.StandardInput.Close();$payload=$null
    $output=$child.StandardOutput.ReadToEnd();$null=$child.StandardError.ReadToEnd();$child.WaitForExit();Write-Host $output
    if($child.ExitCode -ne 0){throw 'Stopped safely; no automatic retry.'}
  }finally{foreach($ptr in $pointers){[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)};$payload=$null;foreach($name in $secrets.Keys){$values[$name]=$null}}
}
$oldPg=@{};foreach($name in @('PGSERVICEFILE','PGPASSFILE','PGOPTIONS','PGPASSWORD')){$oldPg[$name]=[Environment]::GetEnvironmentVariable($name,'Process')}
$wrapperStage='private-credential-entry';$currentRole=$null;$nativeExitCode=$null
try{
  if($Mode -eq 'ContinueVerified'){
    if(-not $ContinueLaunch06){throw 'Continuation selection required.'}
    if(-not ('ReconRuntimePassword' -as [type])){Add-Type -Path (Join-Path $PSScriptRoot 'launch06-runtime-password.cs') -ReferencedAssemblies 'System.Windows.Forms.dll','System.Drawing.dll'}
    $credentials=[ReconRuntimePassword]::PromptMigrationCredentials()
    $key=$credentials['backup'];$verifiedPasswords['recon_migrator']=$credentials['migrator'];$verifiedPasswords['recon_runtime']=$credentials['runtime'];$credentials.Clear();$credentials=$null
  }elseif($Mode -in @('Passwords','InspectDialog')){
    if(-not ('ReconRuntimePassword' -as [type])){Add-Type -Path (Join-Path $PSScriptRoot 'launch06-runtime-password.cs') -ReferencedAssemblies 'System.Windows.Forms.dll','System.Drawing.dll'}
    $credentials=if($Mode -eq 'InspectDialog'){[ReconRuntimePassword]::PromptOperatorCredentials()}else{[ReconRuntimePassword]::PromptCredentials()}
    $key=$credentials['backup'];$operator=$credentials['operator'];if($Mode -eq 'Passwords'){$savedMigrator=$credentials['migrator']};$credentials.Clear();$credentials=$null
  }else{
    $key=Read-Host 'Existing backup encryption passphrase (hidden)' -AsSecureString
    $operator=Read-Host 'Supabase operator password (hidden)' -AsSecureString
  }
  if($Mode -eq 'ContinueVerified'){
    $wrapperStage='remaining-migrations-import'
    Invoke-PrivateNode 'continue'
  }elseif($Mode -eq 'InspectLogin'){
    $existing=Read-Host 'EXISTING saved recon_migrator password for read-only verification only (hidden)' -AsSecureString
    try{Invoke-PrivateNode 'inspect-login' 'recon_migrator' $existing}finally{$existing.Dispose()}
  }elseif($Mode -in @('Inspect','InspectDialog')){Invoke-PrivateNode 'inspect'}else{
    $wrapperStage='read-only-password-preparation'
    Invoke-PrivateNode 'prepare-passwords'
    $scope=Get-Content -LiteralPath (Join-Path $run 'password-scope.json') -Raw | ConvertFrom-Json
    foreach($role in @('recon_migrator','recon_runtime') | Where-Object { $_ -notin $scope.roles }){
      $wrapperStage='existing-role-login-verification';$currentRole=$role
      Write-Host ('Skipping password setup for existing configured role: '+$role)
      $existing=if($role -eq 'recon_migrator'){$savedMigrator.Copy()}else{[ReconRuntimePassword]::PromptExistingRuntime()}
      try{Invoke-PrivateNode 'after' $role $existing;$verifiedPasswords[$role]=$existing;$existing=$null}finally{if($existing){$existing.Dispose()}}
    }
    $env:PGSERVICEFILE=Join-Path $run 'connection.service.tmp';$env:PGPASSFILE=Join-Path $run 'connection.pgpass.tmp';$env:PGOPTIONS='-c row_security=off -c password_encryption=scram-sha-256';[Environment]::SetEnvironmentVariable('PGPASSWORD',$null,'Process')
    foreach($role in $scope.roles){
      if($role -ne 'recon_runtime'){throw 'Only the incomplete runtime password setup is allowed; migrator must be preserved.'}
      $wrapperStage='runtime-masked-confirmation';$currentRole=$role;$nativeExitCode=$null;$confirmed=$null
      try{
        if(-not ('ReconRuntimePassword' -as [type])){Add-Type -Path (Join-Path $PSScriptRoot 'launch06-runtime-password.cs') -ReferencedAssemblies 'System.Windows.Forms.dll','System.Drawing.dll'}
        $libpq=Join-Path $env:LOCALAPPDATA 'ReconImports/PostgreSQL-17.11-rehearsal/pgsql/bin/libpq.dll'
        $null=[ReconRuntimePassword]::InitializeLibrary($libpq)
        Write-Host 'A masked local dialog now confirms the runtime password before any write. Save the password separately. No native console password entry is used.'
        $confirmed=[ReconRuntimePassword]::Prompt()
        $wrapperStage='runtime-password-write'
        & $node $script --check-runtime-write-authorization $PlanDirectory $InspectionDirectory
        if($LASTEXITCODE -ne 0){throw 'Fresh runtime-password authorization is required; no write attempted.'}
        $result=[ReconRuntimePassword]::SetMissingRuntimePassword($confirmed,$run)
        [pscustomobject]@{status=$result;role='recon_runtime';method='OFFICIAL_LIBPQ_PQCHANGEPASSWORD';localConfirmationMatched=$true;migratorPasswordChanged=$false} | ConvertTo-Json | Out-File -LiteralPath (Join-Path $run 'runtime-password-write.json') -NoClobber -Encoding UTF8
        $wrapperStage='role-login-verification'
        Invoke-PrivateNode 'after' $role $confirmed;$verifiedPasswords[$role]=$confirmed;$confirmed=$null
      }finally{if($confirmed){$confirmed.Dispose()}}
    }
    $wrapperStage='password-state-final-verification';$currentRole=$null;$nativeExitCode=$null
    Invoke-PrivateNode 'final'
    if($ContinueLaunch06){
      foreach($name in $oldPg.Keys){[Environment]::SetEnvironmentVariable($name,$oldPg[$name],'Process')}
      Write-Host 'Password verification passed. Continuing only the freshly authorized remaining migrations/import; role provisioning is skipped.'
      $wrapperStage='remaining-migrations-import'
      Invoke-PrivateNode 'continue'
    }
  }
}catch{
  $safeRole=if($currentRole -in @('recon_migrator','recon_runtime')){$currentRole}else{$null}
  $safeCode=[regex]::Match([string]$_.Exception,'\b(PASSWORD_ENTRY_CANCELLED|PASSWORD_FORMAT_INVALID|LIBPQ_SQLSTATE_[A-Z0-9]+|LIBPQ_CONNECTION_FAILED|LIBPQ_SERVICE_FILE_UNAVAILABLE|LIBPQ_PASSWORD_FILE_UNAVAILABLE|LIBPQ_AUTHENTICATION_FAILED|LIBPQ_TLS_VERIFICATION_FAILED|LIBPQ_DNS_FAILED|LIBPQ_CONNECTION_REFUSED|LIBPQ_CONNECTION_TIMEOUT|CONNECTION_PARAMETERS_INVALID|TLS_REQUIRED|TARGET_IDENTITY_MISMATCH|RUNTIME_ALREADY_CONFIGURED_NO_OVERWRITE|MIGRATOR_PASSWORD_MUST_BE_PRESERVED|POSTGRES_CLIENT_API_UNAVAILABLE|POSTGRES_CLIENT_VERSION_MISMATCH|UNEXPECTED_LIBPQ_PATH)\b').Value
  if(-not $safeCode){$safeCode='WRAPPER_STOPPED'}
  [pscustomobject]@{status='STOPPED_SAFELY';stage=$wrapperStage;role=$safeRole;code=$safeCode;nativeExitCode=$nativeExitCode;automaticRetry=$false;passwordState='REQUIRES_READ_ONLY_VERIFICATION'} | ConvertTo-Json | Out-File -LiteralPath (Join-Path $run 'wrapper-failure.json') -NoClobber -Encoding UTF8
  Write-Host 'STOPPED SAFELY. No automatic retries. Review private receipts.'
}
finally{
  foreach($name in $oldPg.Keys){[Environment]::SetEnvironmentVariable($name,$oldPg[$name],'Process')}
  foreach($file in @('connection.service.tmp','connection.pgpass.tmp','connection-ca.tmp')){$target=Join-Path $run $file;if(Test-Path -LiteralPath $target){Remove-Item -LiteralPath $target}}
  if($key){$key.Dispose()};if($operator){$operator.Dispose()};if($savedMigrator){$savedMigrator.Dispose()}
  foreach($password in $verifiedPasswords.Values){$password.Dispose()}
}
Write-Host ('Private report directory: '+$run)
Read-Host 'Press Enter to close'|Out-Null
