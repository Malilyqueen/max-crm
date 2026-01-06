$H = @{ "X-Tenant"="damath"; "X-Role"="admin"; "X-Preview"="true" }

Invoke-RestMethod http://127.0.0.1:3005/api/resolve-tenant -Headers $H
Invoke-RestMethod http://127.0.0.1:3005/api/reporting -Headers $H
Invoke-RestMethod http://127.0.0.1:3005/api/workflows -Headers $H
Invoke-RestMethod http://127.0.0.1:3005/api/segments/build -Method POST -Headers $H -ContentType "application/json" -Body (@{ code="serum_carotte_90j" } | ConvertTo-Json)