$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root
$node = (Get-Command node.exe).Source
$script = Join-Path $PSScriptRoot 'launch05f-upload.mjs'
$directory = (& $node $script --prepare).Trim()
if ($LASTEXITCODE -ne 0) { throw 'Private media preflight failed. No upload attempted.' }
$Host.UI.RawUI.WindowTitle = 'RECON IMPORTS LAUNCH-05F-UPLOAD - Three approved assets'
Write-Host 'LAUNCH-05F-UPLOAD: Only websiteLogo, footerLogo and favicon. No DB writes or asset deletions.'
Write-Host 'Use the verified product environment and API KEY / NEWLY ROTATED SECRET from the SAME ENABLED key entry.'
Write-Host 'Do not paste a connection URL. Do not enter credentials into chat.'
$cloudName = Read-Host 'CLOUDINARY_CLOUD_NAME (from the intended product environment dashboard)'
$confirmCloudName = Read-Host 'Repeat that SAME CLOUD NAME (not the API key)'
$key = Read-Host 'CLOUDINARY_API_KEY (hidden)' -AsSecureString
$secret = Read-Host 'NEWLY ROTATED CLOUDINARY_API_SECRET (hidden)' -AsSecureString
$keyPointer = [IntPtr]::Zero
$secretPointer = [IntPtr]::Zero
try {
  $keyPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($key)
  $secretPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
  $payload = @{ cloudName=$cloudName.Trim(); confirmCloudName=$confirmCloudName.Trim(); apiKey=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($keyPointer); apiSecret=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($secretPointer); newlyRotated=$true } | ConvertTo-Json -Compress
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
  if ($child.ExitCode -ne 0) { Write-Host 'Stopped safely. Retain originals and reports. No automatic deletion. Inspect sanitized failure before retry.' }
} finally {
  if ($keyPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($keyPointer) }
  if ($secretPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretPointer) }
  $payload = $null; $cloudName = $null; $confirmCloudName = $null
  $key.Dispose(); $secret.Dispose()
}
Read-Host 'Press Enter to close this window' | Out-Null
