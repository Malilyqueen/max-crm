# QA & Merge – M.A.X. (Reporting + Audit + Persistence + SSE)

## À vérifier
- Reporting : KPIs + timeline + filtre de période, fallback mock si live KO.
- Audit : GET /api/actions/:id/audit → modal affiche steps masqués.
- Contexte UI : tenant/role/preview persistent, priorité serveur si différent.
- SSE : TaskTray reçoit les events en temps réel et se reconnecte après restart API.

## Scripts
# Health
Invoke-RestMethod http://127.0.0.1:3005/api/health
# Dashboard
Invoke-RestMethod http://127.0.0.1:3005/api/dashboard?range=7d -Headers @{
 "X-Tenant"="damath"; "X-Role"="admin"; "X-Preview"="true"
}
# Audit (OK)
Invoke-RestMethod http://127.0.0.1:3005/api/actions/act-123/audit

## Critères d'acceptation
- Aucun warning bloquant en console.
- Aucun 404 sur /api/actions/:id/audit quand n8n est up.
- SSE : transitions visibles sans refresh.

## Commits
chore(qa): finalize reporting/audit/persistence/sse – ready to merge