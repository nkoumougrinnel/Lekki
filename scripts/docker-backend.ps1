# Lance uniquement le backend Docker
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

if (-not (Test-Path ".env") -and (Test-Path ".env.example")) {
    Copy-Item ".env.example" ".env"
    Write-Host ".env créé — renseignez GEMINI_API_KEY pour le RAG."
}

docker version | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker indisponible. Démarrez Docker Desktop."
}

docker compose up --build backend @args
