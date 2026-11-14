$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root
$node = (Get-Command node.exe).Source
$script = Join-Path $PSScriptRoot 'launch05f-auth.mjs'
$directory = (& $node $script --prepare).Trim()
if ($LASTEXITCODE -ne 0) { throw 'Private authentication report directory could not be prepared.' }
$Host.UI.RawUI.WindowTitle = 'RECON IMPORTS LAUNCH-05F-AUTH - PING ONLY'
Write-Host 'AUTHENTICATION ONLY: one Admin API GET /ping. Stops on success or failure.'
Write-Host 'No asset lookups, uploads, updates, deletions, database connections or automatic retries.'
Write-Host 'Select the intended product environment. Use the API KEY and NEWLY ROTATED SECRET from the SAME ENABLED key entry.'
Write-Host 'Enter values only here, without quotes or surrounding spaces. Never paste credentials into chat.'
$cloudName = Read-Host 'Cloud name'
$confirmCloudName = Read-Host 'Repeat that SAME CLOUD NAME (not the API key)'
$key = Read-Host 'API key from that enabled key entry (hidden)' -AsSecureString
$secret = Read-Host 'Newly rotated API secret paired with that key (hidden)' -AsSecureString
$keyPointer = [IntPtr]::Zero
$secretPointer = [IntPtr]::Zero
$payload = $null
try {
  $keyPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($key)
  $secretPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
  $payload = @{ cloudName=$cloudName.Trim(); confirmCloudName=$confirmCloudName.Trim(); apiKey=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($keyPointer); apiSecret=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($secretPointer); newlyRotated=$true } | ConvertTo-Json -Compress
  # Preserve Unicode across the Windows PowerShell 5 redirected stdin pipe.
  $payload = [regex]::Replace($payload, '[^\u0000-\u007F]', { param($match) '\u' + ([int][char]$match.Value).ToString('x4') })
  $start = New-Object System.Diagnostics.ProcessStartInfo
  $start.FileName = $node
  $start.Arguments = '"' + $script + '" "' + $directory + '"'
  $start.WorkingDirectory = $root
  $start.UseShellExecute = $false
  $start.CreateNoWindow = $true
  $start.RedirectStandardInput = $true
  $start.RedirectStandardOutput = $true
  $start.RedirectStandardError = $true
  $child = [System.Diagnostics.Process]::Start($start)
  $child.StandardInput.Write($payload)
  $child.StandardInput.Close()
  $payload = $null
  $output = $child.StandardOutput.ReadToEnd()
  $null = $child.StandardError.ReadToEnd()
  $child.WaitForExit()
  Write-Host $output
  Write-Host ('Private report directory: ' + $directory)
  Write-Host 'Stopped. No asset operation was attempted. Credentials will not be reused.'
} finally {
  if ($keyPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($keyPointer) }
  if ($secretPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretPointer) }
  $payload = $null; $cloudName = $null; $confirmCloudName = $null
  $key.Dispose(); $secret.Dispose()
}
Read-Host 'Press Enter to close this authentication-only window' | Out-Null
