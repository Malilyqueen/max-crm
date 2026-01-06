Write-Host "🔧 Fermeture de tous les processus node.exe..."
taskkill /F /IM node.exe /T

# Vérifie les ports de 3000 à 3200
$ports = 3000..3200
foreach ($port in $ports) {
    $pids = netstat -ano | findstr ":$port" | ForEach-Object {
        ($_ -split "\s+")[-1]
    } | Sort-Object -Unique

    foreach ($pid in $pids) {
        if ($pid -match "^\d+$") {
            try {
                taskkill /F /PID $pid | Out-Null
                Write-Host "✅ Port $port libéré (PID $pid)"
            } catch {
                Write-Host "⚠️ Impossible de tuer PID $pid"
            }
        }
    }
}

Write-Host "✅ Tous les ports Node (3000 à 3200) sont maintenant libres."
