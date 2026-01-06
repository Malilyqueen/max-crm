$logFile = "d:\Macrea\CRM\max_backend\logs\max_activity.jsonl"
$logsDir = "d:\Macrea\CRM\max_backend\logs"

# Create logs directory
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
    Write-Host "Created logs directory"
}

# Add test activities
$activity1 = @{
    timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    actor = "M.A.X."
    type = "field_created"
    entity = "Lead"
    fieldName = "testField"
    fieldType = "varchar"
    details = "Champ testField (varchar) cree et ajoute aux layouts"
} | ConvertTo-Json -Compress

$activity2 = @{
    timestamp = (Get-Date).AddMinutes(-5).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    actor = "M.A.X."
    type = "data_listed"
    entity = "Lead"
    count = 15
    total = 42
    details = "Listage de 15 leads sur 42 total"
} | ConvertTo-Json -Compress

$activity3 = @{
    timestamp = (Get-Date).AddMinutes(-10).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    actor = "M.A.X."
    type = "data_updated"
    entity = "Lead"
    count = 3
    leadIds = @("lead-001", "lead-002", "lead-003")
    details = "Mise a jour de 3 leads"
} | ConvertTo-Json -Compress

Add-Content -Path $logFile -Value $activity1
Add-Content -Path $logFile -Value $activity2
Add-Content -Path $logFile -Value $activity3

Write-Host "3 test activities added to log file"
Write-Host "Log file: $logFile"

# Display recent activities
if (Test-Path $logFile) {
    $lines = Get-Content $logFile
    Write-Host "`nTotal activities: $($lines.Count)"
    Write-Host "`nLast 3 activities:"
    $lines | Select-Object -Last 3 | ForEach-Object {
        $act = $_ | ConvertFrom-Json
        Write-Host "- $($act.type): $($act.details)"
    }
}
