# Deploying Agent Workflow UI to Cloudera AI (CML) Workbench

This app deploys as a **CML Application** running the Next.js standalone server
directly on `CDSW_APP_PORT`. Deployment is driven from GitHub Actions
(`.github/workflows/deploy-agent-ui.yml`) via the CML API v2.

## Flow

```
setup-project → create-jobs → git_sync → setup_environment → restart-application
```

1. **setup-project** (`cai/setup_project.py`) — find or create the CML project from this GitHub repo.
2. **create-jobs** (`cai/create_jobs.py`) — create/update the CML Jobs + Application from `cai/jobs_config.yaml`.
3. **git_sync** (`.git_sync.py`) — `git fetch` + `reset --hard origin/main` inside the project clone.
4. **setup_environment** (`cai/setup_environment.py`) — install Node 20 to `~/.local/node`, `npm ci`, `npm run build`, copy static assets into `.next/standalone`.
5. **restart-application** — restart the Application; `cai/launch_app.py` → `cai/launch_app.sh` runs `node .next/standalone/server.js` on `CDSW_APP_PORT`.

## Required GitHub secrets

| Secret | Purpose |
|---|---|
| `CML_HOST` | CML workspace URL, e.g. `https://ml-xxxx.cloudera.site` |
| `CML_API_KEY` | CML API v2 key (Bearer token) |
| `GH_PAT` | GitHub PAT so CML can clone/pull a **private** repo |
| `WORKFLOW_BACKEND_URL` | *(optional)* default Agent Studio workflow backend URL |
| `WORKFLOW_API_KEY` | *(optional)* API key for the workflow backend |

`WORKFLOW_*` can also be left unset and entered in the app's connect page at runtime.

## Run

GitHub → **Actions** → **Deploy Agent Workflow UI to CML** → **Run workflow**:
- `runtime_identifier` — a Python 3.11 ML Runtime (default is prefilled).
- `force_rebuild` — set `true` to re-run jobs that already succeeded.

On success the app is served at the `agent-ui` subdomain of the workspace.

## Prerequisites / gotchas

- **Private repo git sync:** `.git_sync.py` runs `git fetch` inside the CML clone,
  so the CML project's git remote must be authenticated (CML git integration /
  deploy key, or an HTTPS URL with the `GH_PAT`). This is CML-side config, not code.
- **Node persistence:** Node is installed into the project's persistent home
  (`~/.local/node`), so it survives across the setup job and the Application container.
- **Single service:** no nginx/reverse proxy — the Next.js server binds `CDSW_APP_PORT` directly.
