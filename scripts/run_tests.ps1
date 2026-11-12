# XRAR Complete Test Suite Execution Script
$ErrorActionPreference = "Stop"
$WorkspaceRoot = (Resolve-Path "$PSScriptRoot\..").Path
Set-Location $WorkspaceRoot

$env:PATH = "C:\msys64\mingw64\bin;$env:USERPROFILE\.cargo\bin;$env:PATH"

Write-Host "==> Running Complete XRAR Workspace Tests..." -ForegroundColor Cyan
& cargo test --workspace -- --nocapture
if ($LASTEXITCODE -ne 0) {
    Write-Error "Workspace tests failed."
}

Write-Host "`n==> All XRAR Workspace Tests Passed 100%!" -ForegroundColor Green

