# Test E2E Consent Gate
Write-Host "Step 1: Create field request" -ForegroundColor Cyan
$r = Invoke-RestMethod -Uri "https://max-api.studiomacrea.cloud/api/chat" -Method POST -Headers @{"Content-Type"="application/json"; "X-Tenant"="macrea-admin"} -Body '{"message": "Crée maxE2E text sur Lead", "sessionId": "e2e"}'
$sid = $r.sessionId
$cid = $r.pendingConsent.consentId
Write-Host "Session: $sid" -ForegroundColor Yellow
Write-Host "Consent: $cid" -ForegroundColor Yellow
Write-Host "`nStep 2: Execute" -ForegroundColor Cyan
$ex = Invoke-RestMethod -Uri "https://max-api.studiomacrea.cloud/api/consent/execute/$cid" -Method POST -Headers @{"Content-Type"="application/json"; "X-Tenant"="macrea-admin"} -Body "{`"sessionId`": `"$sid`"}"
$ex | ConvertTo-Json
