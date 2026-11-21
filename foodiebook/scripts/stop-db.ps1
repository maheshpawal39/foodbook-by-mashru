$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$DataDir = Join-Path $ProjectRoot "backend\.pgdata"

if (-not (Test-Path (Join-Path $DataDir "PG_VERSION"))) {
    Write-Host "No local PostgreSQL cluster found in $DataDir. Nothing to stop."
    exit 0
}

function Find-PgBin {
    if ($env:PG_BIN -and (Test-Path (Join-Path $env:PG_BIN "pg_ctl.exe"))) { return $env:PG_BIN }
    $cmd = Get-Command pg_ctl -ErrorAction SilentlyContinue
    if ($cmd) { return (Split-Path -Parent $cmd.Source) }
    $install = Get-ChildItem "C:\Program Files\PostgreSQL" -Directory -ErrorAction SilentlyContinue |
        Sort-Object Name -Descending | Select-Object -First 1
    if ($install) { return (Join-Path $install.FullName "bin") }
    throw "PostgreSQL was not found. Set `$env:PG_BIN."
}

$pgCtl = Join-Path (Find-PgBin) "pg_ctl.exe"
& $pgCtl -D $DataDir status 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Local PostgreSQL is not running."
    exit 0
}

& $pgCtl -D $DataDir stop -m fast
Write-Host "Local PostgreSQL stopped." -ForegroundColor Green
