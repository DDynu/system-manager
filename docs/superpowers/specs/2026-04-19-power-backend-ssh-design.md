# Power Backend SSH Remote Management

## Overview

Rewrite the power backend (port 8001) to SSH into a single target machine as root and execute power commands remotely. The manager server runs the power backend; the target machine is accessed via SSH.

## Architecture

```
Power Server (port 8001)
├── app.py              — FastAPI entrypoint, CORS, routers
├── config.py           — Parse targets from .env file
├── ssh.py              — SSH execution layer (paramiko)
└── power.py            — Power command endpoints
```

Targets configured in `.env`. Single target only — all commands go to that one machine.

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

## Frontend Changes

- Add `VITE_POWER_API_URL` env var pointing to power server (port 8001)
- `PowerControls.jsx` uses `VITE_POWER_API_URL` for power endpoints
- `MetricsGrid.jsx` keeps `VITE_METRICS_API_URL` for metrics
