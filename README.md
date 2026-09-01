# System Manager

**VIBECODED** dashboard for monitoring a remote machine's metrics in real time.

## Features

- Real-time system metrics (CPU, memory, network, uptime, hostname)
- Single-server deployment: the dashboard server SSHes into the target
- Nothing to install on the target: no agent, no Python, no psutil
- Progressive Web App — install as standalone app on desktop/mobile
- WebSocket-based instant offline detection
- Service worker caching for static assets

## Architecture

One server runs everything:

```
Browser ──HTTP/WS──▶ Server (port 8000, also serves the frontend)
                          │
                          └──SSH──▶ Target machine (only needs sshd + key auth)
```

- **Backend** (FastAPI, port 8000): connects to the target over SSH and runs a
  small POSIX shell script that reads `/proc` (cpu, meminfo, net/dev, uptime).
- **Frontend** (React app, Vite): polls the API every 5s and holds a WebSocket
  for instant offline detection.

## Setup

### 1. This project on the server

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env   # then edit .env for your target
bash start.sh
```

### 2. Configure the target in `backend/.env`

```ini
TARGETS=192.168.100.50:22:root
SSH_KEY_PATH=~/.ssh/id_ed25519
```

### 3. Key auth on the target

The server needs a key the target accepts. One-time:

```bash
# on the server
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519   # if you don't have one
ssh-copy-id -i ~/.ssh/id_ed25519.pub root@192.168.100.50
# or manually: append ~/.ssh/id_ed25519.pub to
# ~/.ssh/authorized_keys on the target
```

That's the whole target-side setup. No software, no firewall changes beyond
the normal SSH port.

### 4. Frontend

```bash
cd frontend
pnpm install
pnpm dev        # development
pnpm build      # production, serves from dist/
```

The frontend uses the page's own origin for the API by default. If you serve
it from a different origin, set `VITE_METRICS_API_URL` in `frontend/.env`.

## API Endpoints

- `GET /api/metrics` - CPU, memory, network counters, uptime (one SSH round trip, ~1s sampling)
- `GET /api/metrics/status` - target hostname, online/offline
- `WS /ws/status` - silent keep-alive; socket close means the server died

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS 4, Recharts, React Compiler
- **Backend**: Python 3, FastAPI, paramiko
- **Target**: stock shell, reads /proc
- **PWA**: vite-plugin-pwa (manifest, service worker, icons)
- **Font**: Bitcount Grid Double

## Deployment

### Docker

```bash
cd frontend
bash dockerrun.sh
```

Or build manually:
```bash
docker build -t system-manager .
docker run -p 5173:80 system-manager
```

## Plans

See `plans/` for implementation details:
- Architecture - Server split design
- Dashboard Design - UI layout and components
- Backend API Design - Endpoint specifications
- Backend Implementation - Python + FastAPI setup
- PWA Implementation - Progressive web app conversion
