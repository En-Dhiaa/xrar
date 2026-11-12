# XRAR Portable Packaging Script
param(
    [string]$Version = "1.0.0",
    [string]$OutputDir = "$PSScriptRoot\..\dist"
)

$ErrorActionPreference = "Stop"
Write-Host "==> Packaging XRAR Portable & Release Artifacts v$Version (x64)..." -ForegroundColor Cyan

$ReleaseDir = "C:\Users\USER\.cargo_target\xrar\release"
$TargetCli = "$ReleaseDir\xrar.exe"
$TargetGui = "$ReleaseDir\xrar-gui.exe"
$TargetSfx = "$ReleaseDir\xrar-sfx.exe"
$TargetSetup = "$ReleaseDir\xrar-setup.exe"

if (-not (Test-Path $TargetCli)) {
    Write-Error "Release executable not found at $TargetCli. Run cargo build --release first."
}

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

# 1. Update standalone Setup executable in dist
if (Test-Path $TargetSetup) {
    Copy-Item $TargetSetup -Destination "$OutputDir\XRAR-$Version-x64-Setup.exe" -Force
    Write-Host "==> Setup wizard updated: $OutputDir\XRAR-$Version-x64-Setup.exe" -ForegroundColor Green
}

# 2. Update SFX stub in dist
if (Test-Path $TargetSfx) {
    Copy-Item $TargetSfx -Destination "$OutputDir\XRAR-$Version-SFX-Stub.exe" -Force
}

# 3. Create portable directory
$TempPortable = "$OutputDir\XRAR-Portable-x64"
if (Test-Path $TempPortable) {
    Remove-Item -Recurse -Force $TempPortable
}
New-Item -ItemType Directory -Path $TempPortable | Out-Null

Copy-Item $TargetCli -Destination "$TempPortable\xrar.exe"
Copy-Item $TargetGui -Destination "$TempPortable\xrar-gui.exe"
Copy-Item $TargetSfx -Destination "$TempPortable\xrar-sfx.exe"
Copy-Item "$PSScriptRoot\..\frontend\public\icon.ico" -Destination "$TempPortable\icon.ico"
Copy-Item "$PSScriptRoot\..\frontend\public\icon.png" -Destination "$TempPortable\icon.png"
Copy-Item "$PSScriptRoot\..\LICENSE" -Destination "$TempPortable\LICENSE.txt"
Copy-Item "$PSScriptRoot\..\README.md" -Destination "$TempPortable\README.txt"
Copy-Item "$PSScriptRoot\..\docs" -Destination "$TempPortable\docs" -Recurse
Copy-Item "$PSScriptRoot\register_explorer_context_menu.reg" -Destination "$TempPortable\register_explorer_context_menu.reg"
Copy-Item "$PSScriptRoot\unregister_explorer_context_menu.reg" -Destination "$TempPortable\unregister_explorer_context_menu.reg"

# Create portable flag file
Set-Content -Path "$TempPortable\portable.flag" -Value "XRAR_PORTABLE_MODE=1"

$ZipPath = "$OutputDir\XRAR-$Version-Portable-x64.zip"
if (Test-Path $ZipPath) {
    Remove-Item -Force $ZipPath
}

Compress-Archive -Path "$TempPortable\*" -DestinationPath $ZipPath -CompressionLevel Optimal
Remove-Item -Recurse -Force $TempPortable

Write-Host "==> Successfully created portable package: $ZipPath" -ForegroundColor Green
Get-ChildItem -Path $OutputDir | Select-Object Name, Length, LastWriteTime
