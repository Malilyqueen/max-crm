param([string]$question)

Invoke-RestMethod `
  -Uri "http://localhost:3005/api/ask-task" `
  -Method POST `
  -Body (@{prompt=$question} | ConvertTo-Json) `
  -ContentType "application/json"
