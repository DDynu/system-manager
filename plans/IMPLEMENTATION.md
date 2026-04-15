# System Manager - Complete Implementation

## Architecture

Two separate backend servers:
- **Metrics server** (port 8000): CPU, memory, disk, uptime, temperature, network stats
- **Power server** (port 8001): Shutdown, reboot, sleep, wake commands

Frontend React app (port 5173) connects to both servers.

## Project Structure

```
system-manager/
├── backend/
│   ├── metrics/
│   │   ├── main.py        - FastAPI metrics server (port 8000)
│   │   └── start.sh       - Start script
│   └── power/
│       ├── power.py       - FastAPI power control server (port 8001)
│       └── start.sh       - Start script
├── frontend/
│   └── src/
│       ├── App.jsx
│       ├── components/
│       │   ├── Layout.jsx
│       │   ├── MetricsGrid.jsx
│       │   └── PowerControls.jsx
│       └── index.css
└── plans/
    └── IMPLEMENTATION.md
```

## Backend Servers

### Metrics Server (`backend/metrics/main.py`)

FastAPI app exposing:
- `GET /api/metrics` - CPU, memory, disk, uptime, temperature, network stats
- `GET /api/status` - Hostname, online status

**Tech Stack:**
- `fastapi` - Async web framework
- `psutil` - System metrics collection
- `pydantic` - Request/response validation
- `uvicorn` - ASGI server

**CORS Configuration:**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:8085", "http://192.168.100.80:8085"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Response Models:**

```json
// GET /api/metrics
{
  "cpu": 45,
  "memory": {
    "used": 12.4,
    "total": 32,
    "percent": 39
  },
  "disk": {
    "used": 245,
    "total": 1000,
    "percent": 25
  },
  "uptime": "14d 3h 25m",
  "temperature": 62,
  "network": {
    "rx": 45200,
    "tx": 12500
  }
}

// GET /api/status
{
  "hostname": "Desktop-PC",
  "status": "Online"
}
```

### Power Server (`backend/power/power.py`)

FastAPI app for remote power control:
- `POST /api/power/shutdown` - Shutdown system (requires `confirm: true`)
- `POST /api/power/reboot` - Reboot system (requires `confirm: true`)
- `POST /api/power/sleep` - Suspend system
- `POST /api/power/wake?mac_address=XX:XX:XX:XX:XX:XX` - Wake on LAN

**Request Model:**
```json
{
  "confirm": true
}
```

**Response:**
```json
{
  "message": "Shutdown initiated"
}
```

**Implementation:**
- Shutdown: `subprocess.run(["shutdown", "-h", "now"])`
- Reboot: `subprocess.run(["shutdown", "-r", "now"])`
- Sleep: Tries `systemctl suspend`, falls back to `pm-suspend`
- Wake: `subprocess.run(["wakeonlan", mac_address])`

## Frontend Components

### Layout (`frontend/src/components/Layout.jsx`)
- Header "System Manager" h1
- Dark background #1a1b26
- Single page layout

### MetricsGrid (`frontend/src/components/MetricsGrid.jsx`)
- PC Status card (full width, Online/Offline)
- 6 metric cards: CPU Usage, Memory, Disk, Uptime, Temperature, Network
- 2px borders, hover effect
- **Real-time polling:**
  - `/api/metrics` every 1 second
  - `/api/status` every 5 seconds
- **Recharts area charts:**
  - CPU graph: purple area chart, 0-100%
  - Memory graph: green area chart, GB used / total
  - Network graph: dual area charts (Download: amber, Upload: cyan)
- **Dynamic byte formatting:** B, KB, MB, GB, TB

### PowerControls (`frontend/src/components/PowerControls.jsx`)
- 4 buttons: Shutdown, Reboot, Sleep, Wake
- 3D effect, bottom borders
- Active press animation (border gone, button moves down 1px)
- **API calls:**
  - POST to `/api/power/shutdown` with `{confirm: true}`
  - POST to `/api/power/reboot` with `{confirm: true}`
  - POST to `/api/power/sleep`
  - POST to `/api/power/wake?mac_address=XX:XX:XX:XX:XX:XX`
- Loading state and error display

### Color Scheme
```css
--text: #9ca3af          /* Body text */
--text-h: #f3f4f6        /* Headings */
--bg: #1f2937            /* Card background */
--border: #4b5563        /* Card borders */
--accent: #a855f7        /* Purple accent */
--accent-border: rgba(168, 85, 247, 0.8) /* Hover state */
```

### Tech Stack
- React 19.2.4 + Vite
- Tailwind CSS 4.2.2 (CSS-first, no config file)
- Recharts for charts
- Oswald font from Google Fonts (700 weight for h1)

## Start Scripts

### Metrics Server
```bash
# backend/metrics/start.sh
#!/bin/bash
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Power Server
```bash
# backend/power/start.sh
#!/bin/bash
source venv/bin/activate
uvicorn power:power_app --reload --host 0.0.0.0 --port 8001
```

## Implementation Status

**Complete:**
- Backend servers running on ports 8000 (metrics) and 8001 (power)
- Frontend connected to real API with real-time polling
- Recharts display live metrics data
- All endpoints implemented and tested

## Verification

1. **Start metrics server:**
   ```bash
   cd backend/metrics && bash start.sh
   ```

2. **Start power server:**
   ```bash
   cd backend/power && bash start.sh
   ```

3. **Start frontend:**
   ```bash
   cd frontend && pnpm dev
   ```

4. **Test metrics API:**
   ```bash
   curl http://localhost:8000/api/metrics
   ```

5. **Test power API:**
   ```bash
   curl -X POST http://localhost:8001/api/power/shutdown -d '{"confirm": true}'
   ```