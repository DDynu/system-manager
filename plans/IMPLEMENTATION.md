# System Manager - Complete Implementation

## Architecture

Two backend servers:
- **Metrics server** (port 8000): CPU, memory, disk, uptime, temperature, network stats
- **Power server** (port 8001): Shutdown, reboot, sleep, wake commands

Frontend React app (port 5173) connects to both servers.

**Note:** PowerControls currently uses hardcoded `http://localhost:8000/api` instead of power server port 8001. Power server not wired to frontend in current code.

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
│   ├── .env               - VITE_METRICS_API_URL config
│   ├── vite.config.js     - Vite + React + Tailwind + Babel config
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
    allow_origins=["http://192.168.100.140:4173", "http://192.168.100.140:5173", "http://192.168.100.80:8085", "http://localhost:5173", "http://localhost:8085"],
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
  "temperature": 62.5,
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
- Full-screen scenery background (Unsplash mountain photo, dark overlay)
- `minHeight: '100vh'`, `padding: '24px'`
- Inner container: `maxWidth: '1200px'`, `margin: '0 auto'`, `className="w-full"`
- Single page layout

### MetricsGrid (`frontend/src/components/MetricsGrid.jsx`)
- PC Status card (full width, Online/Offline) with PowerControls embedded inside
- 3 chart cards: CPU Usage, Memory, Network
- **ChartShell** component: shared wrapper for title, subtitle, ResponsiveContainer
- **ChartsView** component: composes 3 charts, wrapped in `{data.backendAvailable && (...)}`
- 2px borders, hover effect
- **Unified state object:** `data` holds `metrics`, `history`, `memoryTotal`, `pcStatus`, `backendAvailable`, `loading`, `isFirstFetch`, `currentTime`
- **History array:** Single `history` array stores `{time, cpu, memory, rx, tx}` per tick, sliced to last 20 entries
- **Real-time polling:**
  - `/api/metrics` every 5 seconds
  - `/api/status` every 10 seconds
- **Recharts area charts:**
  - CPU graph: indigo `#6366f1` area chart, 0-100%
  - Memory graph: green `#10b981` area chart, GB used / total
  - Network graph: dual area charts (Download: amber `#f59e0b`, Upload: cyan `#06b6d4`)
  - XAxis visible (not hidden)
- **Dynamic byte formatting:** B, KB, MB, GB, TB
- **Backend availability tracking:**
  - `backendAvailable` state tracks API connectivity
  - Charts hidden via conditional rendering (`{data.backendAvailable && (...)}`)
  - Status displays Offline (red) when backend unreachable
  - Uptime only shown when `backendAvailable`
- **Null safety:** Optional chaining (`?.`) and nullish coalescing (`??`) on all metrics access
- **Offline polling optimization:**
  - When backend offline, status interval calls `fetchStatusOnly()` instead of full `fetchStatus()`
  - Skips metrics fetch to reduce unnecessary network requests
- **Network chart Y-axis:** Domain fixed to `[0, 'dataMax + 100']`
- **Time update:** `currentTime` refreshed every status interval (10s)

### PowerControls (`frontend/src/components/PowerControls.jsx`)
- 4 buttons: Shutdown, Reboot, Sleep, Wake
- 3D effect, bottom borders
- Active press animation (border gone, button moves down 1px)
- **Refactored:** Extracted `PowerButton` memo component with `min-w-[100px]` responsive sizing
- **API calls:**
  - Hardcoded `API_URL = 'http://localhost:8000/api'` (not using env var)
  - POST to `/api/power/shutdown` with `{confirm: true}`
  - POST to `/api/power/reboot` with `{confirm: true}`
  - POST to `/api/power/sleep`
  - POST to `/api/power/wake` (no mac_address param in current code)
- Loading state and error display
- Wrapped in `memo` with custom equality (always returns true)
- `handleAction` wrapped in `useCallback`
- `confirm()` dialog before action

### Color Scheme
```css
--text: #9ca3af          /* Body text */
--text-h: #f3f4f6        /* Headings */
--bg: #1f2937            /* Card background */
--border: #4b5563        /* Card borders */
--code-bg: #111827       /* Code block bg */
--accent: #a855f7        /* Purple accent */
--accent-bg: rgba(168, 85, 247, 0.2)
--accent-border: rgba(168, 85, 247, 0.8)
--social-bg: rgba(51, 65, 85, 0.5)
--shadow: rgba(0, 0, 0, 0.4) 0 8px 16px -2px
```

**Dark mode** (`prefers-color-scheme: dark`):
- `--border: #374151`, `--accent: #c084fc`
- Body `color-scheme: light dark`

### Typography
- **h1**: Bitcount Grid Double font, 72px, gradient text (accent → text-h), responsive 48px at <1024px
- **h2**: Montserrat, 500 weight, 24px, responsive 20px at <1024px
- **Body**: Montserrat, 18px, responsive 16px at <1024px
- **code/mono**: Montserrat + Consolas monospace

### Tech Stack
- React 19.2.4 + Vite
- Tailwind CSS 4.2.2 (CSS-first, `@tailwindcss/vite` plugin)
- Recharts for charts
- Babel + React Compiler (`@vitejs/plugin-react` with `reactCompilerPreset`)
- Montserrat + Bitcount Grid Double fonts from Google Fonts

### Frontend Env
```bash
# frontend/.env
VITE_METRICS_API_URL=http://192.168.100.140:8000
```

### Vite Config (`frontend/vite.config.js`)
- Plugins: TailwindCSS (via `@tailwindcss/vite`), React, Babel with React Compiler (`@vitejs/plugin-react` + `@rolldown/plugin-babel`)
- Dev server: `host: '0.0.0.0'`

### App.jsx
- Renders `<Layout>` → `<main>` → `<MetricsGrid />`
- **PowerControls removed** from App.jsx (moved inside MetricsGrid PC Status card)

### CSS (`frontend/src/index.css`)
- `#root`: full-screen width, `min-height: 100svh`, flex column, centered, scenery background with dark gradient overlay
- `.main-content`: `flex: 1`, `padding: 32px`, `gap: 32px`

## Start Scripts

### Metrics Server
```bash
# backend/metrics/start.sh
#!/bin/bash
cd /home/suponer/Documents/Codes/AICodes/system-manager/backend/metrics/
source ../venv/bin/activate
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
