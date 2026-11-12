# XRAR Portable Packaging Script
param(
    [string]$Version = "1.0.0",
    [string]$OutputDir = "$PSScriptRoot\..\dist"
)

$ErrorActionPreference = "Stop"
Write-Host "==> Packaging XRAR Portable v$Version (x64)..." -ForegroundColor Cyan

$TargetExe = "C:\Users\USER\.cargo_target\xrar\release\xrar.exe"
if (-not (Test-Path $TargetExe)) {
    Write-Error "Release executable not found at $TargetExe. Run cargo build --release first."
}

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

$TempPortable = "$OutputDir\XRAR-Portable-x64"
if (Test-Path $TempPortable) {
    Remove-Item -Recurse -Force $TempPortable
}
New-Item -ItemType Directory -Path $TempPortable | Out-Null

# Copy binary, license, docs, and registry scripts
Copy-Item $TargetExe -Destination "$TempPortable\xrar.exe"
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
Get-Item $ZipPath | Select-Object Name, Length, LastWriteTime
