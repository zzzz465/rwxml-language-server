# RimWorld XML Language Server Auto Build and Package Script

$ErrorActionPreference = "Stop"

Write-Host ">>> Step 1/5: Compiling analyzer..." -ForegroundColor Cyan
Set-Location "$PSScriptRoot/analyzer"
npx tsc -b
if ($LASTEXITCODE -ne 0) { Write-Error "analyzer build failed"; exit $LASTEXITCODE }

Write-Host "`n>>> Step 2/5: Compiling language-server..." -ForegroundColor Cyan
Set-Location "$PSScriptRoot/language-server"
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "language-server build failed"; exit $LASTEXITCODE }

Write-Host "`n>>> Step 3/5: Preparing vsc-extension..." -ForegroundColor Cyan
$vscDir = "$PSScriptRoot/vsc-extension"

# Copy language-server to vsc-extension internal directory
Write-Host ">>> Copying language-server to vsc-extension/server-dist..." -ForegroundColor Gray
$serverDistTarget = "$vscDir/server-dist"
if (Test-Path $serverDistTarget) { Remove-Item -Recurse -Force $serverDistTarget }
Copy-Item -Path "$PSScriptRoot/language-server/dist" -Destination $serverDistTarget -Recurse -Force

# Update webpack config to use internal paths
$webpackConfig = "$vscDir/webpack.config.js"
$webpackConfigBackup = "$vscDir/webpack.config.js.bak"
if (!(Test-Path $webpackConfigBackup)) {
    Copy-Item -Path $webpackConfig -Destination $webpackConfigBackup -Force
}
(Get-Content $webpackConfigBackup) -replace "'\.\./language-server/dist/index\.js'", "'./server-dist/index.js'" | Set-Content $webpackConfig

# Copy extractor to vsc-extension/bin
Write-Host ">>> Copying extractor to vsc-extension/bin..." -ForegroundColor Gray
$vscBinDir = "$vscDir/bin"
if (!(Test-Path $vscBinDir)) { New-Item -ItemType Directory -Path $vscBinDir }
$extractorSrc = "$PSScriptRoot/extractor/extractor/bin/Debug/net472/*"
Copy-Item -Path $extractorSrc -Destination $vscBinDir -Recurse -Force

Write-Host "`n>>> Step 4/5: Compiling vsc-extension..." -ForegroundColor Cyan
Set-Location $vscDir
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "vsc-extension build failed"; exit $LASTEXITCODE }

Write-Host "`n>>> Step 5/5: Packaging extension..." -ForegroundColor Cyan
# Move to temporary directory to avoid packaging the parent git repository
$tempDir = "$env:TEMP/rwxml-vsix-pack"
$packDir = "$tempDir/vsc-extension"

Write-Host ">>> Preparing packaging environment..." -ForegroundColor Gray
if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }
New-Item -ItemType Directory -Path $packDir -Force | Out-Null

# Copy only required files to the packaging directory
Copy-Item -Path "$vscDir/package.json" -Destination $packDir -Force
Copy-Item -Path "$PSScriptRoot/LICENSE" -Destination "$packDir/LICENSE" -Force
Copy-Item -Path "$vscDir/dist" -Destination $packDir -Recurse -Force
Copy-Item -Path "$vscDir/bin" -Destination $packDir -Recurse -Force
Copy-Item -Path "$vscDir/server-dist" -Destination $packDir -Recurse -Force

# Create an empty .vscodeignore in the packaging directory
"" | Out-File -FilePath "$packDir/.vscodeignore" -Encoding UTF8

# Install dependencies in the temporary directory (vsce requires checking, even though bundled by webpack)
Set-Location $packDir
Write-Host ">>> Installing dependencies (for vsce check)..." -ForegroundColor Gray
npm install --omit=dev --silent 2>$null | Out-Null

# Package from the temporary directory
vsce package --allow-missing-repository
if ($LASTEXITCODE -ne 0) {
    Set-Location $PSScriptRoot
    Remove-Item -Recurse -Force $tempDir
    Write-Error "Extension packaging failed"
    exit $LASTEXITCODE
}

# Move the packaged file back to the original directory
$vsixFile = Get-ChildItem -Path "$packDir/*.vsix" | Select-Object -First 1
Move-Item -Path $vsixFile.FullName -Destination $vscDir -Force

# Cleanup the temporary directory
Set-Location $PSScriptRoot
Remove-Item -Recurse -Force $tempDir

Write-Host "`n[Success] All modules compiled and packaged!" -ForegroundColor Green
Write-Host ">>> Extension package location: $vscDir/$($vsixFile.Name)" -ForegroundColor Green