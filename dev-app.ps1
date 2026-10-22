Set-Location $PSScriptRoot
Get-Content packages\app-lib\.env | ForEach-Object {
  if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
    Set-Item "env:$($matches[1])" ($matches[2].Trim().Trim('"'))
  }
}
$env:CARGO_PROFILE_DEV_DEBUG = "0"
Set-Location apps\app
cargo run --no-default-features --features export-app-events
