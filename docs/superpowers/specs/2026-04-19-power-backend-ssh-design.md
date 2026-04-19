# Power Backend SSH Remote Management

## Overview

Power backend runs on a separate controller server (not the target system) and SSHes into the target to execute power commands. The frontend connects to the controller's API; the controller initiates outbound SSH to the target.

## Architecture

```
Frontend ──HTTP──▶ Controller Server (port 8001) ──SSH──▶ Target System
                                                      (headless, no power API)
```

- **Controller server**: runs the power backend (FastAPI). Initiates all SSH connections to the target. Exposed to the frontend.
- **Target system**: headless. No power API installed. Only needs SSH open for inbound connections from the controller.

```
Controller Server (port 8001)
├── app.py              — FastAPI entrypoint, CORS, routers
├── config.py           — Parse targets from .env file
├── ssh.py              — SSH execution layer (paramiko)
└── power.py            — Power command endpoints
```

Single target configured in `.env`. All commands go to that one machine.

## Config (`.env`)

```bash
TARGETS=192.168.100.50:22:root
TARGET_MAC=AA:BB:CC:DD:EE:FF
SSH_KEY_PATH=~/.ssh/id_rsa
SSH_PASSWORD=
SSH_TIMEOUT=10
SSH_RETRIES=2
```

- `TARGETS`: comma-separated `host:port:user`. Only one target used at a time.
- `SSH_KEY_PATH`: private key path for auth. Preferred method.
- `SSH_PASSWORD`: fallback if no key provided.
- `SSH_TIMEOUT`: connection timeout in seconds.
- `SSH_RETRIES`: number of connection retry attempts.

## API Endpoints

### `POST /api/power/shutdown`
Request: `{ "confirm": true }`
Action: SSH `shutdown -h now`
Response: `{ "message": "Shutdown initiated", "target": "192.168.100.50" }`

### `POST /api/power/reboot`
Request: `{ "confirm": true }`
Action: SSH `shutdown -r now`
Response: `{ "message": "Reboot initiated", "target": "192.168.100.50" }`

### `POST /api/power/sleep`
Action: SSH `systemctl suspend` (fallback `pm-suspend`)
Response: `{ "message": "Sleep initiated", "target": "192.168.100.50" }`

### `POST /api/power/wake`
Action: WOL broadcast from manager server via `wakeonlan` CLI (no SSH needed)
Request: MAC address as query param or body
Response: `{ "message": "WOL packet sent to XX:XX:XX:XX:XX:XX" }`

### `GET /api/power/status`
Action: SSH `echo ok` to check reachability
Response: `{ "reachable": true, "hostname": "target-hostname" }` or `{ "reachable": false }`

## SSH Execution Layer (`ssh.py`)

- Uses `paramiko` library
- Loads key from `SSH_KEY_PATH` (or password from `SSH_PASSWORD`)
- Connects with `SSH_TIMEOUT`, retries `SSH_RETRIES` times
- Executes command via `exec_command()`, captures stdout/stderr/exit_code
- Closes connection after each command

## Error Handling

| Scenario | Status | Response |
|----------|--------|----------|
| Connection refused/timeout | 503 | `{"detail": "SSH connection failed: ..."}` |
| Auth failed | 401 | `{"detail": "SSH authentication failed"}` |
| Command not found | 500 | `{"detail": "stderr from remote"}` |
| Non-zero exit code | 500 | `{"detail": "stderr from remote"}` |
| General exception | 500 | `{"detail": "exception message"}` |

## Dependencies

- `fastapi`
- `uvicorn`
- `paramiko`
- `python-dotenv` (for .env parsing)
- `wakeonlan` CLI (existing, no SSH)

## Frontend

Frontend connects to the controller server for both metrics and power.

- `VITE_POWER_API_URL` — URL of the controller server (port 8001)
- `VITE_METRICS_API_URL` — URL of the controller server (port 8000, or same host)
- `PowerControls.jsx` calls power endpoints on the controller
- `MetricsGrid.jsx` calls metrics/status endpoints on the controller
- The target system is never directly accessed by the frontend

## CORS

Controller server allows frontend origins via `CORS_ALLOW_ORIGINS` env var. Default: `http://192.168.100.140:5173,http://localhost:5173`.
