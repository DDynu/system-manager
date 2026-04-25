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
├── power.py            — Power command endpoints + inline SSH helpers
└── start.sh            — Uvicorn launcher
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
Action: WOL broadcast from manager server via `wol` CLI (no SSH needed)
Request: MAC address from TARGET_MAC env var
Response: `{ "message": "WOL packet sent to XX:XX:XX:XX:XX:XX" }`

### `GET /api/power/status`
Action: SSH `echo ok` to check reachability
Response: `{ "reachable": true, "target": "192.168.100.50" }` or `{ "detail": "..." }` on failure

## Inline SSH helpers in `power.py`

`power.py` contains its own `get_target()` and `execute_command()` functions (not imported from separate modules):

- `get_target()`: Parses `TARGETS` from env, returns `{hostname, port, username}` dict
- `execute_command(command)`: Creates SSHClient, loads system host keys, connects with 5s timeout, executes command, returns `{success, stdout, target}`. No retry logic, no key/password auth, no stderr in response.

Uses `paramiko.SSHClient` with `load_system_host_keys()`.

## Error Handling

| Scenario | Status | Response |
|----------|--------|----------|
| SSH exception | 503 | `{"detail": "..."}` |
| No confirm | 400 | `{"detail": "Confirm required. Set confirm=true."}` |
| WOL command not found | 500 | `{"detail": "wakeonlan command not found"}` |

## Dependencies

- `fastapi`
- `uvicorn`
- `paramiko`
- `python-dotenv`
- `wol` CLI (existing, no SSH)

## Frontend

Frontend connects to the controller server for both metrics and power.

- `METRICS_API_URL=192.168.100.140` — metrics host (no protocol/port prefix, port inferred)
- `VITE_POWER_API_URL` — used in ConfirmPopup for power API calls
- `PowerControls.jsx` — renders 4 buttons (Shutdown, Reboot, Sleep, Wake), passes `action` via `setAction` callback to parent
- `ConfirmPopup.jsx` — receives pending action, shows confirmation dialog. Skips popup for "wake" (auto-executes). Uses `VITE_POWER_API_URL` env var.
- `MetricsGrid.jsx` — fetches metrics/status every 5s, shows loading placeholders, renders StatusCard + ChartsView
- `StatusCard.jsx` — extracted component showing hostname, status, uptime, current time

### Component flow

```
App
├── MetricsGrid (loading state, fetches metrics/status)
│   ├── StatusCard (hostname, status, uptime, time)
│   └── ChartsView (CPU, memory, network charts)
├── PowerControls (buttons, error display)
└── ConfirmPopup (confirmation dialog, skips for wake)
```

## CORS

Controller server uses `allow_origins="*"` wildcard (env var `CORS_ALLOW_ORIGINS` is read but not applied).
