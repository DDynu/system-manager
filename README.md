# System Manager

**VIBECODED** dashboard for monitoring a remote machine's metrics in real time.

## Features

- Real-time system metrics (CPU, memory, network, uptime, hostname)
- Wake-on-LAN: a "Wake PC" button broadcasts a magic packet to power on the target
- GPU metrics via `nvtop -s` when the target has nvtop + jq (NVIDIA and AMD)
  installed; otherwise the dashboard shows a notice and skips GPU cards
- Single-server deployment: the dashboard server SSHes into the target
- Nothing to install on the target: no agent, no Python, no psutil
- Progressive Web App — install as standalone app on desktop/mobile
- WebSocket-based instant offline detection
- Service worker caching for static assets

## Architecture

One server runs everything:

```
Browser ──HTTP/WS──▶ Server (also serves the frontend)
                          │
                          ├──SSH──▶ Target (reads /proc; needs only sshd + key auth)
                          └──WOL──▶ Target NIC (magic packet, broadcast on the LAN)
```

- **Backend** (FastAPI, port 8000): connects to the target over SSH and runs a
  small POSIX shell script that reads `/proc` (cpu, meminfo, net/dev, uptime).
- **Frontend** (React app, Vite): polls the API every 5s and holds a WebSocket
  for instant offline detection.
- **Wake-on-LAN**: `POST /api/power/wake` runs `wakeonlan <mac>` on the server,
  which broadcasts the magic packet on the LAN. It only works if the target's
  NIC has WOL enabled in its firmware and the server is on the target's LAN.

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
WOL_MAC_ADDRESS=aa:bb:cc:dd:ee:ff   # MAC of the target's wired NIC; enables the Wake PC button
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
- `POST /api/power/wake` - broadcast a WOL magic packet to the target's MAC

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS 4, Recharts, React Compiler
- **Backend**: Python 3, FastAPI, paramiko
- **Target**: stock shell, reads /proc
- **PWA**: vite-plugin-pwa (manifest, service worker, icons)
- **Font**: Bitcount Grid Double

## Deployment

One container runs both the frontend and the backend:

```bash
docker build -t system-manager .
docker run --name system-manager --restart unless-stopped --net=host \
    -v $PWD/backend/.env:/app/backend/.env \
    -v ~/.ssh/id_ed25519:/keys/id_ed25519:ro \
    system-manager
```

The container uses `--net=host` so the WOL magic packet broadcasts on the
host's LAN and reaches the target. There is no port mapping: nginx listens on
`8085` directly on the host, so the site is at `http://<server>:8085`.

Inside, nginx serves the built frontend and proxies `/api` and `/ws` to
uvicorn on loopback. The backend `.env` (target host, SSH key path, WOL MAC)
is mounted from the host, and the SSH key itself must be readable inside the
container: point `SSH_KEY_PATH` at a mounted key, e.g.
`-v ~/.ssh/id_ed25519:/keys/id_ed25519:ro` with `SSH_KEY_PATH=/keys/id_ed25519`.
The container runs as root so it can read a standard `0600` key file; put the
key on a separate read-only volume so it never ends up baked into the image.

## Plans

See `plans/` for implementation details:
- Architecture - Server split design
- Dashboard Design - UI layout and components
- Backend API Design - Endpoint specifications
- Backend Implementation - Python + FastAPI setup
- PWA Implementation - Progressive web app conversion
