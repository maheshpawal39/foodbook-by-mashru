$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$Backend = Join-Path $ProjectRoot "backend"
$Frontend = Join-Path $ProjectRoot "frontend"

function New-Secret {
    $bytes = New-Object byte[] 48
    [Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    return [Convert]::ToBase64String($bytes)
}

Write-Host "FoodieBook setup" -ForegroundColor Magenta
Write-Host "Project: $ProjectRoot"

foreach ($tool in @("python", "node", "npm")) {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
        throw "$tool is required but was not found on PATH."
    }
}

if (-not (Test-Path (Join-Path $Backend ".env"))) {
    Copy-Item (Join-Path $Backend ".env.example") (Join-Path $Backend ".env")
    $content = Get-Content (Join-Path $Backend ".env") -Raw
    $content = $content.Replace("replace-with-a-long-random-secret", (New-Secret))
    Set-Content (Join-Path $Backend ".env") $content -Encoding utf8
    Write-Host "Created backend/.env with a generated SECRET_KEY."
}

if (-not (Test-Path (Join-Path $Frontend ".env"))) {
    Copy-Item (Join-Path $Frontend ".env.example") (Join-Path $Frontend ".env")
    Write-Host "Created frontend/.env."
}

Write-Host "`nCreating backend virtual environment ..." -ForegroundColor Cyan
if (-not (Test-Path (Join-Path $Backend ".venv\Scripts\python.exe"))) {
    Push-Location $Backend
    python -m venv .venv
    Pop-Location
}
& (Join-Path $Backend ".venv\Scripts\python.exe") -m pip install --upgrade pip --quiet
& (Join-Path $Backend ".venv\Scripts\pip.exe") install -r (Join-Path $Backend "requirements.txt")

Write-Host "`nInstalling frontend dependencies ..." -ForegroundColor Cyan
Push-Location $Frontend
npm install
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "npm install failed." }
Pop-Location

Write-Host "`nStarting local PostgreSQL ..." -ForegroundColor Cyan
& (Join-Path $PSScriptRoot "start-db.ps1")

Write-Host "`nApplying migrations and seeding ..." -ForegroundColor Cyan
Push-Location $Backend
$env:FLASK_APP = "run.py"
& ".\.venv\Scripts\flask.exe" db upgrade
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "Database migrations failed." }
& ".\.venv\Scripts\flask.exe" seed
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "Seeding failed." }
Pop-Location

Write-Host "`nSetup complete." -ForegroundColor Green
Write-Host "Start the app with: .\scripts\dev.ps1"
Write-Host "Frontend: http://127.0.0.1:5189"
Write-Host "Admin:    admin@foodiebook.com / Admin@12345"
Write-Host "Demo:     demo@foodiebook.com / Demo@12345"
