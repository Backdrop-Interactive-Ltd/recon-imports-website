param([Parameter(Mandatory=$true)][string]$PreparationDirectory)
$ErrorActionPreference='Stop';Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
$node=(Get-Command node.exe).Source;$script=Join-Path $PSScriptRoot 'workers-initial-deploy.mjs'
& $node $script --check $PreparationDirectory
if($LASTEXITCODE -ne 0){throw 'Explicit deployment authorization missing or mismatched; stopped.'}
$bytes=$null;$created=$false;$file=Join-Path $PreparationDirectory '.secrets-upload.tmp.json'
try{
  Add-Type -AssemblyName System.Security
  $encrypted=[IO.File]::ReadAllBytes((Join-Path $PreparationDirectory 'production-secrets.dpapi'))
  $bytes=[Security.Cryptography.ProtectedData]::Unprotect($encrypted,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
  $stream=[IO.File]::Open($file,[IO.FileMode]::CreateNew);$created=$true;try{$stream.Write($bytes,0,$bytes.Length)}finally{$stream.Dispose()}
  & $node $script --deploy $PreparationDirectory $file
}finally{if($bytes){[Array]::Clear($bytes,0,$bytes.Length)};if($created -and (Test-Path -LiteralPath $file)){Remove-Item -LiteralPath $file}}
