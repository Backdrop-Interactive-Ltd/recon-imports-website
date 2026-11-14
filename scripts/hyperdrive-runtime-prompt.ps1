$ErrorActionPreference='Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
$node=(Get-Command node.exe).Source;$script=Join-Path $PSScriptRoot 'hyperdrive-runtime-update.mjs'
$run=(& $node $script --prepare).Trim();if($LASTEXITCODE -ne 0){throw 'Private directory preparation failed.'}
$secret=$null;$pointer=[IntPtr]::Zero;$payload=$null
try{
  Add-Type -Path (Join-Path $PSScriptRoot 'launch06-runtime-password.cs') -ReferencedAssemblies 'System.Windows.Forms.dll','System.Drawing.dll'
  $secret=[ReconRuntimePassword]::PromptHyperdriveRuntime()
  $pointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
  $payload=@{password=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)}|ConvertTo-Json -Compress
  $payload=[regex]::Replace($payload,'[^\u0000-\u007F]',{param($m)'\u'+([int][char]$m.Value).ToString('x4')})
  $start=New-Object Diagnostics.ProcessStartInfo;$start.FileName=$node;$start.Arguments='"'+$script+'" "'+$run+'"';$start.UseShellExecute=$false;$start.CreateNoWindow=$true;$start.RedirectStandardInput=$true;$start.RedirectStandardOutput=$true;$start.RedirectStandardError=$true
  $child=[Diagnostics.Process]::Start($start);$child.StandardInput.Write($payload);$child.StandardInput.Close();$payload=$null
  $output=$child.StandardOutput.ReadToEnd();$null=$child.StandardError.ReadToEnd();$child.WaitForExit();Write-Host $output
}catch{Write-Host 'STOPPED SAFELY. No automatic retry.'}
finally{if($pointer -ne [IntPtr]::Zero){[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)};if($secret){$secret.Dispose()};$payload=$null}
Write-Host ('Private receipt directory: '+$run)
Read-Host 'Press Enter to close'|Out-Null
