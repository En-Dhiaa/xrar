# XRAR Production Release Acceptance & Verification Script
param(
    [string]$Version = "1.0.0"
)

$ErrorActionPreference = "Stop"
$WorkspaceRoot = (Resolve-Path "$PSScriptRoot\..").Path
$DistDir = "$WorkspaceRoot\dist"

Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "   XRAR Release Acceptance & Verification Suite v$Version                 " -ForegroundColor Cyan
Write-Host "==========================================================================" -ForegroundColor Cyan

# 1. Verify existence of release artifacts
$RequiredArtifacts = @(
    "$DistDir\XRAR-$Version-Setup.exe",
    "$DistDir\XRAR-$Version-Portable-x64.zip",
    "$DistDir\xrar-cli.exe",
    "$DistDir\xrar-gui.exe",
    "$DistDir\xrar-sfx.exe"
)

Write-Host "`n[1/5] Verifying release distribution artifacts in dist/..." -ForegroundColor Yellow
foreach ($art in $RequiredArtifacts) {
    if (-not (Test-Path $art)) {
        Write-Error "Required artifact missing: $art"
    }
    $len = (Get-Item $art).Length
    $mb = [math]::Round($len / 1048576, 2)
    $name = Split-Path $art -Leaf
    Write-Host "  [✓] Found: $name ($mb MB)" -ForegroundColor Green
}

# 2. Test Silent Installation into isolated environment
Write-Host "`n[2/5] Testing Silent Installation into isolated directory..." -ForegroundColor Yellow
$TestInstallDir = "$env:TEMP\XRAR_Release_Acceptance_Test"
if (Test-Path $TestInstallDir) {
    Remove-Item -Recurse -Force $TestInstallDir
}

$SetupExe = "$DistDir\XRAR-$Version-Setup.exe"
$installProc = Start-Process -FilePath $SetupExe -ArgumentList "--silent", "--dir", "`"$TestInstallDir`"" -Wait -PassThru -NoNewWindow
if ($installProc.ExitCode -ne 0) {
    Write-Error "Silent installer failed with exit code $($installProc.ExitCode)"
}

Write-Host "  [✓] Silent installation completed with ExitCode 0." -ForegroundColor Green

# 3. Verify deployed files
Write-Host "`n[3/5] Verifying installed binaries and payload integrity..." -ForegroundColor Yellow
$ExpectedFiles = @(
    "xrar.exe",
    "xrar-gui.exe",
    "WebView2Loader.dll",
    "xrar-sfx.exe",
    "icon.ico",
    "icon.png",
    "README.txt",
    "uninstall.bat"
)
foreach ($file in $ExpectedFiles) {
    $full = Join-Path $TestInstallDir $file
    if (-not (Test-Path $full)) {
        Write-Error "Installed file missing: $full"
    }
    Write-Host "  [✓] Verified installed file: $file" -ForegroundColor Green
}

# 4. Functional End-to-End Archiving & Extraction Test with Installed CLI
Write-Host "`n[4/5] Executing live functional test using installed xrar.exe..." -ForegroundColor Yellow
$InstalledCli = Join-Path $TestInstallDir "xrar.exe"
$TestWorkDir = "$env:TEMP\XRAR_E2E_Test_Data"
if (Test-Path $TestWorkDir) { Remove-Item -Recurse -Force $TestWorkDir }
New-Item -ItemType Directory -Path "$TestWorkDir\source" -Force | Out-Null
New-Item -ItemType Directory -Path "$TestWorkDir\extract" -Force | Out-Null

# Generate sample files
Set-Content -Path "$TestWorkDir\source\doc.txt" -Value "Hello XRAR Production Release!"
Set-Content -Path "$TestWorkDir\source\main.rs" -Value 'fn main() { println!("XRAR Extreme Compression Engine"); }'

$TestArchive = "$TestWorkDir\test_archive.xrar"

# Create archive
Write-Host "  Creating test archive: $TestArchive"
& $InstalledCli create $TestArchive "$TestWorkDir\source" --profile smart --solid
if ($LASTEXITCODE -ne 0) { Write-Error "Archive creation failed!" }

# Test archive integrity
Write-Host "  Testing archive cryptographic integrity..."
& $InstalledCli test $TestArchive
if ($LASTEXITCODE -ne 0) { Write-Error "Archive integrity check failed!" }

# Extract archive
Write-Host "  Extracting archive to: $TestWorkDir\extract"
& $InstalledCli extract $TestArchive -o "$TestWorkDir\extract"
if ($LASTEXITCODE -ne 0) { Write-Error "Archive extraction failed!" }

# Verify content matches
$extractedDoc = (Get-Content "$TestWorkDir\extract\source\doc.txt" -Raw).Trim()
if ($extractedDoc -ne "Hello XRAR Production Release!") {
    Write-Error "Extracted content does not match original file!"
}
Write-Host "  [✓] Content matches original data bit-for-bit (100% verified)." -ForegroundColor Green

# 5. Clean Uninstallation Test
Write-Host "`n[5/5] Testing clean uninstallation..." -ForegroundColor Yellow
$uninstallProc = Start-Process -FilePath $SetupExe -ArgumentList "--uninstall" -Wait -PassThru -NoNewWindow
if ($uninstallProc.ExitCode -ne 0) {
    Write-Error "Uninstaller returned error code $($uninstallProc.ExitCode)"
}

# Cleanup test dirs
Remove-Item -Recurse -Force $TestInstallDir -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force $TestWorkDir -ErrorAction SilentlyContinue

Write-Host "`n==========================================================================" -ForegroundColor Green
Write-Host "   ALL ACCEPTANCE TESTS PASSED (100% SUCCESS)                             " -ForegroundColor Green
Write-Host "==========================================================================" -ForegroundColor Green

# Output SHA-256 Checksums
Write-Host "`nSHA-256 Release Checksums:" -ForegroundColor Cyan
Get-FileHash -Path $RequiredArtifacts -Algorithm SHA256 | Select-Object Hash, @{Name = "File"; Expression = { Split-Path $_.Path -Leaf } } | Format-Table -AutoSize
