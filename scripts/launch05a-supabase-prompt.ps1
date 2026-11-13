param([string]$CertificateFile, [ValidateSet('LAUNCH-05A','LAUNCH-05C')][string]$Task = 'LAUNCH-05A')
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root
$node = (Get-Command node.exe).Source
$probeName = if ($Task -eq 'LAUNCH-05C') { 'launch05c-preflight.mjs' } else { 'launch05a-supabase-probe.mjs' }
$script = Join-Path $PSScriptRoot $probeName
$directory = (& $node $script --prepare).Trim()
if ($LASTEXITCODE -ne 0) { throw 'Private report directory could not be prepared.' }
$Host.UI.RawUI.WindowTitle = "RECON IMPORTS $Task - Read-only Supabase"
Write-Host "RECON IMPORTS ${Task}: READ-ONLY Supabase check. No migrations or data transfer."
Write-Host 'Use Dashboard > Connect > Session pooler. Enter individual fields; never paste a full connection URL.'
$poolerHost = Read-Host 'Session pooler hostname only'
$projectRef = Read-Host 'Supabase project reference'
$databaseUser = Read-Host 'Session pooler username (role.project-reference)'
if (-not $CertificateFile) { $CertificateFile = Read-Host 'Supabase Dashboard CA certificate file path (Enter uses system trust only)' }
else { Write-Host 'Using the supplied, verified Supabase CA for this connection only.' }
$secret = Read-Host 'Database password (hidden)' -AsSecureString
$pointer = [IntPtr]::Zero
try {
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
  $payload = @{ host=$poolerHost; project=$projectRef; user=$databaseUser; database='postgres'; port=5432; caFile=$CertificateFile.Trim('"'); password=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) } | ConvertTo-Json -Compress
  # Windows PowerShell 5 has no StandardInputEncoding option. ASCII JSON escapes
  # preserve Unicode passwords across its redirected-process pipe without echoing.
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
  $output = $child.StandardOutput.ReadToEnd()
  $null = $child.StandardError.ReadToEnd()
  $child.WaitForExit()
  Write-Host $output
  if ($child.ExitCode -ne 0) { Write-Host 'Check failed safely. Credentials were not written to disk. A retry can use this same prompt script.' }
} finally {
  if ($pointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
  $payload = $null; $secret.Dispose()
}
Read-Host 'Press Enter to close this window' | Out-Null
