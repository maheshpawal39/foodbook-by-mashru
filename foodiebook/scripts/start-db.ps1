param(
    [int]$Port = 5434,
    [string]$Database = "foodiebook",
    [string]$DbUser = "postgres"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$DataDir = Join-Path $ProjectRoot "backend\.pgdata"
$LogFile = Join-Path $DataDir "server.log"

function Find-PgBin {
    if ($env:PG_BIN -and (Test-Path (Join-Path $env:PG_BIN "pg_ctl.exe"))) {
        return $env:PG_BIN
    }
    $cmd = Get-Command pg_ctl -ErrorAction SilentlyContinue
    if ($cmd) { return (Split-Path -Parent $cmd.Source) }
    $install = Get-ChildItem "C:\Program Files\PostgreSQL" -Directory -ErrorAction SilentlyContinue |
        Sort-Object Name -Descending | Select-Object -First 1
    if ($install) { return (Join-Path $install.FullName "bin") }
    throw "PostgreSQL was not found. Install PostgreSQL or set `$env:PG_BIN to its bin folder."
}

$pgBin = Find-PgBin
$pgCtl = Join-Path $pgBin "pg_ctl.exe"
$initdb = Join-Path $pgBin "initdb.exe"
$psql = Join-Path $pgBin "psql.exe"
$createdb = Join-Path $pgBin "createdb.exe"

New-Item -ItemType Directory -Force -Path $DataDir | Out-Null

if (-not (Test-Path (Join-Path $DataDir "PG_VERSION"))) {
    Write-Host "Initialising local PostgreSQL cluster in $DataDir ..."
    & $initdb -D $DataDir -U $DbUser --auth=trust --encoding=UTF8 --no-locale | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "initdb failed. See the output above." }
}

& $pgCtl -D $DataDir status 2>$null | Out-Null
$running = ($LASTEXITCODE -eq 0)

if (-not $running) {
    Write-Host "Starting PostgreSQL on port $Port ..."
    & $pgCtl -D $DataDir -l $LogFile -o "-p $Port" start | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "PostgreSQL failed to start. Last log lines:" -ForegroundColor Red
        Get-Content $LogFile -Tail 20 -ErrorAction SilentlyContinue
        throw "Could not start PostgreSQL. The port may already be in use."
    }
    Start-Sleep -Seconds 2
}

$exists = & $psql -h 127.0.0.1 -p $Port -U $DbUser -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$Database'"
if (($exists | Out-String).Trim() -ne "1") {
    Write-Host "Creating database '$Database' ..."
    & $createdb -h 127.0.0.1 -p $Port -U $DbUser $Database
    if ($LASTEXITCODE -ne 0) { throw "createdb failed." }
}

Write-Host "PostgreSQL is ready: postgresql://${DbUser}@127.0.0.1:$Port/$Database" -ForegroundColor Green
Write-Host "Use DATABASE_URL=postgresql+psycopg://${DbUser}@127.0.0.1:$Port/$Database in backend/.env"
