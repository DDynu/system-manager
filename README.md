# System Manager

Vibecoded dashboard for monitoring system metrics and controlling power states.

## Features

- Real-time system metrics (CPU, memory, disk, temperature, network)
- Remote power control (shutdown, reboot, sleep, wake-on-lan)
- Progressive Web App — install as standalone app on desktop/mobile
- WebSocket-based instant offline detection
- Service worker caching for static assets

## Architecture

Two separate backend servers:
- **Metrics server** (port 8000): CPU, memory, disk, uptime, temperature, network stats
- **Power server** (port 8001): Shutdown, reboot, sleep, wake commands

Frontend React app (port 5173) connects to both.

## Quick Start

```bash
# Start metrics server
cd backend/metrics && bash start.sh

# Start power server
cd backend/power && bash start.sh

# Start frontend
cd frontend && pnpm dev
```

## API Endpoints

### Metrics Server (http://localhost:8000)

- `GET /api/metrics` - System metrics
- `GET /api/status` - PC status (hostname, online/offline)

### Power Server (http://localhost:8001)

- `POST /api/power/shutdown` - `{confirm: true}`
- `POST /api/power/reboot` - `{confirm: true}`
- `POST /api/power/sleep`
- `POST /api/power/wake?mac_address=XX:XX:XX:XX:XX:XX`

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS 4, Recharts, React Compiler
- **Backend**: Python 3, FastAPI, psutil
- **PWA**: vite-plugin-pwa (manifest.webmanifest, service worker, icons)
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
docker run -p 5173:80 -e METRICS_URL=http://metrics-server:8000 -e POWER_URL=http://power-server:8001 system-manager
```

## Plans

See `plans/` for implementation details:
- Architecture - Server split design
- Dashboard Design - UI layout and components
- Backend API Design - Endpoint specifications
- Backend Implementation - Python + FastAPI setup
- PWA Implementation - Progressive web app conversion
