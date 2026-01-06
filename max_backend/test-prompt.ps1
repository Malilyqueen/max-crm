# Lire le prompt brut
$promptText = Get-Content -Raw -Path "D:\Macrea\CRMACREA\ia_admin_api\prompt.txt"

# Échapper proprement pour JSON : guillemets, retours chariot, tab, etc.
$escapedPrompt = $promptText `
  -replace '\\', '\\\\' `
  -replace '"', '\"' `
  -replace "`r", '\r' `
  -replace "`n", '\n' `
  -replace "`t", '\t'

# Reconstituer un objet JSON valide
$jsonBody = '{ "prompt": "' + $escapedPrompt + '" }'

# Appel de l'API
Invoke-RestMethod -Method Post `
  -Uri "http://127.0.0.1:3005/api/ask-task" `
  -ContentType "application/json" `
  -Body $jsonBody

