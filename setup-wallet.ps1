Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  APEX UHI - 1-CLICK AUTOMATIC PRIVATE KEY GENERATOR" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan
Set-Location -Path $PSScriptRoot
node scripts/setup-wallet.js
