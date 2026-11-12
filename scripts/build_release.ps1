# XRAR Master Production Build & Packaging Script
param(
    [string]$Version = "1.0.0"
)

$ErrorActionPreference = "Stop"
$WorkspaceRoot = (Resolve-Path "$PSScriptRoot\..").Path
Set-Location $WorkspaceRoot

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "   XRAR — Extreme Compression Archive v$Version Production Build" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

# 1. Ensure MinGW64 and Cargo toolchain are present in PATH
$cargoBin = Join-Path $env:USERPROFILE ".cargo\bin"
$env:PATH = "C:\msys64\mingw64\bin;$cargoBin;$env:PATH"

# 2. Build Frontend Production Assets
Write-Host "`n[1/6] Building Production React/TypeScript Frontend..." -ForegroundColor Yellow
Set-Location "$WorkspaceRoot\frontend"
& cmd.exe /c "npm.cmd run build"
if ($LASTEXITCODE -ne 0) {
    Write-Error "Frontend compilation failed."
}
Set-Location $WorkspaceRoot

# Ensure branding icon is in frontend dist
Copy-Item "$WorkspaceRoot\apps\desktop\assets\icon.png" "$WorkspaceRoot\frontend\dist\icon.png" -Force

# 3. Build Core Crates, SFX & CLI
Write-Host "`n[2/6] Compiling XRAR CLI and SFX (Release)..." -ForegroundColor Yellow
& cargo build --release -p xrar -p xrar-sfx-stub
if ($LASTEXITCODE -ne 0) {
    Write-Error "CLI/SFX compilation failed."
}

# 4. Build Desktop GUI (Tauri 2 + Native WebView2)
Write-Host "`n[3/6] Compiling XRAR Desktop Application (Tauri 2 Native)..." -ForegroundColor Yellow
& cargo build --release -p xrar-desktop
if ($LASTEXITCODE -ne 0) {
    Write-Error "Desktop GUI compilation failed."
}

$TargetDir = "C:\Users\USER\.cargo_target\xrar\release"
$PayloadDir = "$WorkspaceRoot\apps\installer\payload"
New-Item -ItemType Directory -Force -Path $PayloadDir | Out-Null

# 5. Populate Installer Payload
Write-Host "`n[4/6] Updating Installer Payload Binaries..." -ForegroundColor Yellow
Copy-Item "$TargetDir\xrar.exe" "$PayloadDir\xrar.exe" -Force
Copy-Item "$TargetDir\xrar-gui.exe" "$PayloadDir\xrar-gui.exe" -Force
Copy-Item "$TargetDir\xrar-sfx.exe" "$PayloadDir\xrar-sfx.exe" -Force
Copy-Item "$WorkspaceRoot\apps\desktop\assets\icon.ico" "$PayloadDir\icon.ico" -Force
Copy-Item "$WorkspaceRoot\apps\desktop\assets\icon.png" "$PayloadDir\icon.png" -Force

# 6. Build Windows Setup Wizard Executable
Write-Host "`n[5/6] Compiling Standalone Windows Setup Installer..." -ForegroundColor Yellow
& cargo build --release -p xrar-installer
if ($LASTEXITCODE -ne 0) {
    Write-Error "Installer compilation failed."
}

# 7. Package Distribution Artifacts
Write-Host "`n[6/6] Packaging Final Release Artifacts into dist/..." -ForegroundColor Yellow
$DistDir = "$WorkspaceRoot\dist"
New-Item -ItemType Directory -Force -Path $DistDir | Out-Null

Copy-Item "$TargetDir\xrar-setup.exe" "$DistDir\XRAR-$Version-Setup.exe" -Force
Copy-Item "$TargetDir\xrar.exe" "$DistDir\xrar-cli.exe" -Force
Copy-Item "$TargetDir\xrar-gui.exe" "$DistDir\xrar-gui.exe" -Force
Copy-Item "$TargetDir\WebView2Loader.dll" "$DistDir\WebView2Loader.dll" -Force
Copy-Item "$TargetDir\xrar-sfx.exe" "$DistDir\xrar-sfx.exe" -Force

# Run Portable Packager
& "$PSScriptRoot\build_portable.ps1" -Version $Version -OutputDir $DistDir

Write-Host "`n=================================================================" -ForegroundColor Green
Write-Host "   XRAR Release Build Successfully Completed!" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Green

Get-ChildItem -Path $DistDir | Select-Object Name, Length, LastWriteTime | Format-Table -AutoSize

