$ErrorActionPreference='Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
$node=(Get-Command node.exe).Source;$script=Join-Path $PSScriptRoot 'workers-secret-prepare.mjs'
$run=(& $node $script --prepare).Trim();if($LASTEXITCODE -ne 0){throw 'Private directory preparation failed.'}
$secrets=$null;$values=@{};$pointers=@();$bytes=$null;$roundtrip=$null;$payload=$null
try{
  Add-Type -AssemblyName System.Security
  Add-Type -Path (Join-Path $PSScriptRoot 'launch06-runtime-password.cs') -ReferencedAssemblies 'System.Windows.Forms.dll','System.Drawing.dll'
  $secrets=[ReconRuntimePassword]::PromptWorkerSecrets()
  foreach($name in $secrets.Keys){$ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secrets[$name]);$pointers+=,$ptr;$values[$name]=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)}
  $random=New-Object byte[] 48;$rng=[Security.Cryptography.RandomNumberGenerator]::Create();try{$rng.GetBytes($random)}finally{$rng.Dispose()}
  $bundle=@{AUTH_SECRET=[Convert]::ToBase64String($random);AUTH_URL='https://recon-imports-website.backdropinteractiveltd.workers.dev';CLOUDINARY_CLOUD_NAME=$values.cloud;CLOUDINARY_API_KEY=$values.apiKey;CLOUDINARY_API_SECRET=$values.apiSecret};[Array]::Clear($random,0,$random.Length)
  $payload=@{secrets=$bundle;confirmCloudName=$values.confirmCloud}|ConvertTo-Json -Compress
  $payload=[regex]::Replace($payload,'[^\u0000-\u007F]',{param($m)'\u'+([int][char]$m.Value).ToString('x4')})
  $start=New-Object Diagnostics.ProcessStartInfo;$start.FileName=$node;$start.Arguments='"'+$script+'" "'+$run+'"';$start.UseShellExecute=$false;$start.CreateNoWindow=$true;$start.RedirectStandardInput=$true;$start.RedirectStandardOutput=$true;$start.RedirectStandardError=$true
  $child=[Diagnostics.Process]::Start($start);$child.StandardInput.Write($payload);$child.StandardInput.Close();$payload=$null
  $output=$child.StandardOutput.ReadToEnd();$null=$child.StandardError.ReadToEnd();$child.WaitForExit();Write-Host $output
  if($child.ExitCode -ne 0){throw 'Private input validation stopped; no retry.'}
  $bytes=[Text.Encoding]::UTF8.GetBytes(($bundle|ConvertTo-Json -Compress))
  $encrypted=[Security.Cryptography.ProtectedData]::Protect($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
  $roundtrip=[Security.Cryptography.ProtectedData]::Unprotect($encrypted,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
  $hash=[Security.Cryptography.SHA256]::Create();try{if([Convert]::ToBase64String($hash.ComputeHash($bytes)) -ne [Convert]::ToBase64String($hash.ComputeHash($roundtrip))){throw 'Encryption roundtrip failed.'}}finally{$hash.Dispose()}
  $target=Join-Path $run 'production-secrets.dpapi';$stream=[IO.File]::Open($target,[IO.FileMode]::CreateNew);try{$stream.Write($encrypted,0,$encrypted.Length)}finally{$stream.Dispose()}
  @{status='ENCRYPTED_WORKER_SECRETS_PREPARED';encryption='Windows DPAPI CurrentUser';secretNames=@($bundle.Keys);deployed=$false;remoteSecretsWritten=$false}|ConvertTo-Json|Out-File -LiteralPath (Join-Path $run 'completion.json') -Encoding UTF8 -NoClobber
  Write-Host 'ENCRYPTED_WORKER_SECRETS_PREPARED'
}catch{Write-Host 'STOPPED SAFELY. No deployment or automatic retry.'}
finally{foreach($ptr in $pointers){[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)};if($secrets){foreach($secret in $secrets.Values){$secret.Dispose()};$secrets.Clear()};$values.Clear();if($bundle){$bundle.Clear()};$payload=$null;if($bytes){[Array]::Clear($bytes,0,$bytes.Length)};if($roundtrip){[Array]::Clear($roundtrip,0,$roundtrip.Length)}}
Write-Host ('Private preparation directory: '+$run)
Read-Host 'Press Enter to close'|Out-Null
