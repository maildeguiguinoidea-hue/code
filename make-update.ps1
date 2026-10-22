# Builds a signed release and the latest.json file for auto-updates.
# Usage:  .\make-update.ps1 -Version 1.0.1 -Notes "Added the logo easter egg"

param(
	[Parameter(Mandatory = $true)][string]$Version,
	[string]$Notes = "New update"
)

# --- Change these once ---------------------------------------------------
$Repo = "maildeguiguinoidea-hue/my-modrinth-releases"          # GitHub repo that hosts the releases
$KeyPath = "$HOME\.tauri\myapp.key"           # private key made with "pnpm tauri signer generate"
# -------------------------------------------------------------------------

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# 1. Set the app version
$pkgPath = "$PSScriptRoot\apps\app-frontend\package.json"
$pkg = [IO.File]::ReadAllText($pkgPath)
$pkg = ([regex]'"version":\s*"[^"]*"').Replace($pkg, "`"version`": `"$Version`"", 1)
[IO.File]::WriteAllText($pkgPath, $pkg)   # UTF-8 without BOM
Write-Host "Version set to $Version"

# 2. Load the server addresses from .env
Get-Content packages\app-lib\.env | ForEach-Object {
	if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
		Set-Item "env:$($matches[1])" ($matches[2].Trim().Trim('"'))
	}
}

# 3. Signing key
$env:TAURI_SIGNING_PRIVATE_KEY = $KeyPath
$securePassword = Read-Host "Signing key password (just press Enter if you didn't set one)" -AsSecureString
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = [System.Net.NetworkCredential]::new("", $securePassword).Password

# 4. Build
Set-Location apps\app
pnpm tauri build --bundles nsis --config tauri-myrelease.conf.json
if ($LASTEXITCODE -ne 0) { throw "Build failed" }
Set-Location $PSScriptRoot

# 5. Write latest.json
$bundleDir = "$PSScriptRoot\target\release\bundle\nsis"
$exeName = "Modrinth App_${Version}_x64-setup.exe"
$signature = (Get-Content "$bundleDir\$exeName.sig" -Raw).Trim()
$assetName = $exeName -replace ' ', '.'   # GitHub turns spaces into dots in uploaded file names

$manifest = [ordered]@{
	version   = $Version
	notes     = $Notes
	pub_date  = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
	platforms = @{
		"windows-x86_64" = @{
			signature = $signature
			url       = "https://github.com/$Repo/releases/download/v$Version/$assetName"
		}
	}
}
[IO.File]::WriteAllText("$bundleDir\latest.json", ($manifest | ConvertTo-Json -Depth 5))

Write-Host ""
Write-Host "Done. Now create a GitHub release with tag v$Version and upload these 2 files:"
Write-Host "  $bundleDir\$exeName"
Write-Host "  $bundleDir\latest.json"
explorer $bundleDir

# 6. Publish the release on GitHub
Write-Host "Publishing v$Version to GitHub..."
gh release create "v$Version" "$bundleDir\$exeName" "$bundleDir\latest.json" --repo $Repo --title $Version --notes $Notes --latest
if ($LASTEXITCODE -ne 0) { throw "Upload to GitHub failed - you can still upload the 2 files by hand" }
Write-Host "Published: https://github.com/$Repo/releases/tag/v$Version"
