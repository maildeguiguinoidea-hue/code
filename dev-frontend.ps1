Set-Location $PSScriptRoot
Get-NetTCPConnection -LocalPort 1420 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
pnpm turbo run dev --filter=@modrinth/app-frontend
