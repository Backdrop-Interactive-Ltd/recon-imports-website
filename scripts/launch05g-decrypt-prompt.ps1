$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root
$node = (Get-Command node.exe).Source
$script = Join-Path $PSScriptRoot 'launch05g-decrypt.mjs'
$directory = (& $node $script --prepare).Trim()
if ($LASTEXITCODE -ne 0) { throw 'Private decryption directory preparation failed.' }
$Host.UI.RawUI.WindowTitle = 'RECON IMPORTS LAUNCH-05G - VERIFY AND DECRYPT ONLY'
Write-Host 'No database connection or restore SQL. Use only trusted owner-created archives.'
Write-Host 'Decrypted output is sensitive plaintext in a restricted Git-ignored directory; keep it local.'
$backupDirectory = Read-Host 'Directory containing backup-index.json and the three encrypted artifacts'
$secret = Read-Host 'Encryption passphrase from the separate password manager (hidden)' -AsSecureString
$pointer = [IntPtr]::Zero
try {
  $pointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
  $payload=@{backupDirectory=$backupDirectory.Trim('"');encryptionPassword=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)} | ConvertTo-Json -Compress
  $payload=[regex]::Replace($payload,'[^\u0000-\u007F]',{param($match) '\u'+([int][char]$match.Value).ToString('x4')})
  $start=New-Object System.Diagnostics.ProcessStartInfo
  $start.FileName=$node; $start.Arguments='"'+$script+'" "'+$directory+'"'; $start.WorkingDirectory=$root
  $start.UseShellExecute=$false; $start.CreateNoWindow=$true; $start.RedirectStandardInput=$true; $start.RedirectStandardOutput=$true; $start.RedirectStandardError=$true
  $child=[System.Diagnostics.Process]::Start($start); $child.StandardInput.Write($payload); $child.StandardInput.Close(); $payload=$null
  $output=$child.StandardOutput.ReadToEnd(); $null=$child.StandardError.ReadToEnd(); $child.WaitForExit(); Write-Host $output
  Write-Host 'Stopped. SQL restoration requires a separate verified target and owner authorization.'
} finally {if($pointer -ne [IntPtr]::Zero){[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)};$payload=$null;$secret.Dispose()}
Read-Host 'Press Enter to close' | Out-Null
