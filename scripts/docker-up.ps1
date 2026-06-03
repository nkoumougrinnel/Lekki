# Lance la stack Lekki (backend + frontend)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

if (-not (Test-Path ".env") -and (Test-Path ".env.example")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Fichier .env créé depuis .env.example — renseignez GEMINI_API_KEY si besoin."
}

docker version | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker n'est pas disponible. Démarrez Docker Desktop puis relancez ce script."
}

docker compose up --build @args
