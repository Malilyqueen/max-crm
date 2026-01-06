# M.A.X. Admin UI

Frontend for M.A.X. multi-tenant admin interface.

## Environment Variables

Create `.env` file with:

```
VITE_API_BASE=http://127.0.0.1:3005
VITE_FLAG_USE_MOCKS=false
VITE_FLAG_WORKFLOWS_READONLY=false
VITE_FLAG_PREVIEW_DEFAULT=false
```

## How to Run

```bash
# Backend
cd ../ia_admin_api && node server.js

# Frontend
npm install
npm run dev
```

Frontend will be available at http://localhost:5173

## Tab Mapping

- **Dashboard**: `/api/dashboard` (KPIs + timeline)
- **Automation**: `/api/workflows` (list + runs), `/api/segments/build`, `/api/import`
- **MAX**: `/api/ask` (chat), `/api/execution-log`
- **CRM**: iframe to http://127.0.0.1:8081/?max_embed=1

## Mock Flags

- `VITE_FLAG_USE_MOCKS=true`: Shows mock data chips, simulates imports
- `VITE_FLAG_WORKFLOWS_READONLY=true`: Hides execute buttons in workflows
- `VITE_FLAG_PREVIEW_DEFAULT=true`: Starts in preview mode

All requests include X-Tenant, X-Role, X-Preview headers.

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
