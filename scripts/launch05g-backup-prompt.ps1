param([ValidateSet('LAUNCH-05G','LAUNCH-06')][string]$Task='LAUNCH-05G', [string]$CertificateFile)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root
$node = (Get-Command node.exe).Source
$script = Join-Path $PSScriptRoot $(if ($Task -eq 'LAUNCH-06') { 'launch06-preflight.mjs' } else { 'launch05g-backup.mjs' })
$directory = (& $node $script --prepare).Trim()
if ($LASTEXITCODE -ne 0) { throw 'Private export directory preparation failed.' }
$Host.UI.RawUI.WindowTitle = "RECON IMPORTS $Task - READ-ONLY PREFLIGHT AND BACKUP"
Write-Host 'Operator-triggered public application schema/data export only. No migrations, imports, permissions or media operations.'
Write-Host 'Use the approved Supabase Session Pooler on port 5432 and its trusted Dashboard CA.'
$poolerHost = Read-Host 'Session Pooler hostname only'
$project = Read-Host 'Supabase project reference'
$confirmProject = Read-Host 'Repeat the SAME project reference'
$user = Read-Host 'Session Pooler username (role.project-reference)'
$certificate = if($CertificateFile) { $CertificateFile } else { Read-Host 'Trusted Dashboard CA certificate file path' }
$password = Read-Host 'Database password (hidden)' -AsSecureString
Write-Host 'Use a separate strong encryption passphrase (16+ characters), saved in your password manager independently of the archives.'
$encryption = Read-Host 'Backup encryption passphrase (hidden)' -AsSecureString
$confirmEncryption = Read-Host 'Repeat encryption passphrase (hidden)' -AsSecureString
$pointers = @()
try {
  foreach ($value in @($password,$encryption,$confirmEncryption)) { $pointers += [Runtime.InteropServices.Marshal]::SecureStringToBSTR($value) }
  $payload = @{host=$poolerHost.Trim();project=$project.Trim();confirmProject=$confirmProject.Trim();user=$user.Trim();database='postgres';port=5432;caFile=$certificate.Trim('"');password=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointers[0]);encryptionPassword=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointers[1]);confirmEncryptionPassword=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointers[2])} | ConvertTo-Json -Compress
  $payload = [regex]::Replace($payload, '[^\u0000-\u007F]', {param($match) '\u'+([int][char]$match.Value).ToString('x4')})
  $start = New-Object System.Diagnostics.ProcessStartInfo
  $start.FileName=$node; $start.Arguments='"'+$script+'" "'+$directory+'"'; $start.WorkingDirectory=$root
  $start.UseShellExecute=$false; $start.CreateNoWindow=$true; $start.RedirectStandardInput=$true; $start.RedirectStandardOutput=$true; $start.RedirectStandardError=$true
  $child=[System.Diagnostics.Process]::Start($start); $child.StandardInput.Write($payload); $child.StandardInput.Close(); $payload=$null
  $output=$child.StandardOutput.ReadToEnd(); $null=$child.StandardError.ReadToEnd(); $child.WaitForExit(); Write-Host $output
  Write-Host ('Private export directory: '+$directory)
  Write-Host 'Stopped. Preserve all artifacts. Export success is not a completed restore test or permission to migrate.'
} finally {
  foreach ($pointer in $pointers) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
  $payload=$null; $password.Dispose(); $encryption.Dispose(); $confirmEncryption.Dispose()
}
Read-Host 'Press Enter to close' | Out-Null
