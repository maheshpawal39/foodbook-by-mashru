$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$Backend = Join-Path $ProjectRoot "backend"
$Frontend = Join-Path $ProjectRoot "frontend"

if (-not (Test-Path (Join-Path $Backend ".venv\Scripts\python.exe"))) {
    throw "Backend dependencies are missing. Run .\scripts\setup.ps1 first."
}
if (-not (Test-Path (Join-Path $Frontend "node_modules"))) {
    throw "Frontend dependencies are missing. Run .\scripts\setup.ps1 first."
}

& (Join-Path $PSScriptRoot "start-db.ps1")

Write-Host "Starting FoodieBook API ..." -ForegroundColor Cyan
Start-Process -FilePath (Join-Path $Backend ".venv\Scripts\python.exe") `
    -ArgumentList "run.py" -WorkingDirectory $Backend -WindowStyle Normal

Start-Sleep -Seconds 2

Write-Host "Starting FoodieBook frontend ..." -ForegroundColor Cyan
Start-Process -FilePath (Get-Command npm.cmd).Source `
    -ArgumentList "run", "dev" -WorkingDirectory $Frontend -WindowStyle Normal

Write-Host ""
Write-Host "API:      http://127.0.0.1:5399/api" -ForegroundColor Green
Write-Host "Frontend: http://127.0.0.1:5189" -ForegroundColor Green
Write-Host "Admin:    admin@foodiebook.com / Admin@12345"
Write-Host "Demo:     demo@foodiebook.com / Demo@12345"
