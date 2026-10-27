$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$pidFile = Join-Path $projectRoot '.preview.pid'
$url = 'http://localhost:4173'
$available = $false
try {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
    $available = $response.StatusCode -eq 200 -and $response.Content.Contains('batcomplekt')
} catch {}
if (-not $available) {
    $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
    if ($nodeCommand) { $node = $nodeCommand.Source }
    else {
        $node = Join-Path $env:USERPROFILE '.local\node\node.exe'
        if (-not (Test-Path -LiteralPath $node)) { throw 'Node.js is required. Install Node.js or open index.html directly.' }
    }
    $server = Join-Path $projectRoot 'server.mjs'
    $process = Start-Process -FilePath $node -ArgumentList ('"' + $server + '"') -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru
    Set-Content -LiteralPath $pidFile -Value $process.Id
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        Start-Sleep -Milliseconds 200
        try {
            $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 1
            if ($response.StatusCode -eq 200) { $available = $true; break }
        } catch {}
    }
}
if (-not $available) { throw 'Preview did not start. Run npm start to see the error.' }
Start-Process -FilePath $url -WindowStyle Hidden
Write-Host $url
