# Starts the Modrinth App frontend (Vite on port 1420).
# Run dev-app.ps1 in a second window once Vite is ready.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

# Free port 1420 if something is still holding it (e.g. a previous Vite run).
$pids = Get-NetTCPConnection -LocalPort 1420 -State Listen -ErrorAction SilentlyContinue |
	Select-Object -ExpandProperty OwningProcess -Unique
foreach ($p in $pids) {
	Write-Host "Stopping process $p holding port 1420"
	Stop-Process -Id $p -Force
}

pnpm -w i18n:coverage
if ($LASTEXITCODE -ne 0) { throw "i18n:coverage failed" }

pnpm turbo run dev --filter=@modrinth/app-frontend
