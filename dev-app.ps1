# Builds and runs the Modrinth App (Tauri/Rust) against the Vite dev server.
# Start dev-frontend.ps1 first. Turbo filters env vars, so the app runs here
# with packages\app-lib\.env loaded into the process environment.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$envFile = Join-Path $PSScriptRoot 'packages\app-lib\.env'
if (-not (Test-Path $envFile)) { throw "Missing $envFile (copy packages\app-lib\.env.prod to it)" }
foreach ($line in Get-Content $envFile) {
	if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$') {
		$value = $Matches[2] -replace '^"(.*)"$', '$1' -replace "^'(.*)'$", '$1'
		Set-Item -Path "Env:$($Matches[1])" -Value $value
	}
}

$env:CARGO_PROFILE_DEV_DEBUG = "0"

Set-Location (Join-Path $PSScriptRoot 'apps\app')
cargo run --no-default-features --features export-app-events
