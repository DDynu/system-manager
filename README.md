# System Manager

Dashboard for monitoring system metrics and controlling power states.

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

- **Frontend**: React 19, Vite, Tailwind CSS 4, Recharts
- **Backend**: Python 3, FastAPI, psutil
- **Font**: Bitcount Grid Double

## Plans

See `plans/` for implementation details:
- Architecture - Server split design
- Dashboard Design - UI layout and components
- Backend API Design - Endpoint specifications
- Backend Implementation - Python + FastAPI setup
