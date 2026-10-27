$pidFile = Join-Path $PSScriptRoot '.preview.pid'
if (Test-Path -LiteralPath $pidFile) {
    $previewProcessId = [int](Get-Content -LiteralPath $pidFile)
    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $previewProcessId" -ErrorAction SilentlyContinue
    $expectedScript = Join-Path $PSScriptRoot 'server.mjs'
    if ($process -and $process.Name -eq 'node.exe' -and $process.CommandLine.Contains($expectedScript)) {
        Stop-Process -Id $previewProcessId
    }
    Remove-Item -LiteralPath $pidFile
}
