# System Manager - Complete Implementation

## Architecture

Two backend servers:
- **Metrics server** (port 8000): CPU, memory, disk, uptime, temperature, network stats
- **Power server** (port 8001): Shutdown, reboot, sleep, wake commands

Frontend React app (port 5173) connects to both servers.

**Note:** PowerControls uses `VITE_POWER_API_URL` env var pointing to power server on port 8001.

## Project Structure

```
system-manager/
├── backend/
│   ├── metrics/
│   │   ├── main.py        - FastAPI metrics server (port 8000)
│   │   └── start.sh       - Start script
│   └── power/
│       ├── app.py         - FastAPI entrypoint (port 8001)
│       ├── power.py       - Power control endpoints
│       ├── ssh.py         - SSH execution layer
│       ├── config.py      - .env parser
│       ├── .env           - SSH target config (not committed)
│       ├── start.sh       - Start script
├── frontend/
│   ├── .env               - VITE_METRICS_API_URL config
│   ├── public/
│   │   ├── bg.avif        - Background image (139K, AVIF)
│   │   └── bg.jpg         - Background fallback (40K, JPEG)
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

### Power Server (`backend/power/app.py`, `power.py`, `ssh.py`, `config.py`)

FastAPI app for remote power control via SSH:
- `POST /api/power/shutdown` - Shutdown target (requires `confirm: true`)
- `POST /api/power/reboot` - Reboot target (requires `confirm: true`)
- `POST /api/power/sleep` - Suspend target (tries systemctl, falls back to pm-suspend)
- `POST /api/power/wake` - Wake-on-LAN broadcast
- `GET /api/power/status` - Check target reachability via SSH

**Config:** Targets in `.env` file (`TARGETS=host:port:user`, `TARGET_MAC=...`, SSH keys/password, timeout, retries)

**SSH Execution:** paramiko library, new connection per command, retry on timeout, key or password auth

**Implementation:**
- `config.py`: Parses .env, returns target dict and SSH settings
- `ssh.py`: `connect_ssh()` with retry logic, `execute_command()` returns `{success, stdout, stderr, exit_code}`
- `power.py`: Endpoints call `execute_command()` via SSH, return error details on failure
- `wake`: Uses `wakeonlan` CLI (no SSH needed), MAC from TARGET_MAC env var
- Error responses: 400 (no confirm), 401 (auth fail), 503 (connection fail), 500 (command fail)

## Frontend Components

### Layout (`frontend/src/components/Layout.jsx`)
- Full-screen scenery background (local AVIF + JPEG fallback, dark overlay) — on `#root` in CSS
- Tailwind classes: `min-h-screen p-6`, `w-full mx-auto max-w-3xl lg:max-w-[1200px]`
- Centered title with `text-center` class on h1
- Single page layout

### MetricsGrid (`frontend/src/components/MetricsGrid.jsx`)
- PC Status card (full width, Online/Offline) with PowerControls embedded inside, Zen Dots font for hostname/status
- 3 chart cards: CPU Usage, Memory, Network
- **ChartShell** component: shared wrapper for title, subtitle, ResponsiveContainer
- **ChartsView** component: composes 3 charts, wrapped in `{data.backendAvailable && (...)}`
- **Glass cards:** `.glass-card` CSS class — `bg-black/40`, `border-white/10`, `backdrop-blur-md`
- 2px borders, hover effect
- **Unified state object:** `data` holds `metrics`, `history`, `memoryTotal`, `pcStatus`, `backendAvailable`, `loading`, `currentTime`
- **`backendRef`:** mutable ref tracking `backendAvailable` to avoid stale closure in `setInterval`
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
- **Offline resilience:**
  - On fetch failure, `pcStatus` spread preserves `hostname` (never resets to empty)
  - Status color: green when `backendAvailable && status === 'Online'`, red otherwise
- **Loading state:** Separate from metrics — shows skeleton cards while loading, falls through to offline card or dashboard
- **Offline card:** Single centered card showing "Offline / Backend Offline" with PowerControls embedded
- **Network chart Y-axis:** Domain fixed to `[0, 'dataMax + 100']`
- **Time update:** `currentTime` refreshed every status interval (10s)
- **Code cleanup:** Removed unused `areArraysEqual` function, unused `React` import, merged duplicate `fetchStatus`/`fetchStatusOnly` into single function, removed `isFirstFetch` state and related effects

### PowerControls (`frontend/src/components/PowerControls.jsx`)
- 4 buttons: Shutdown, Reboot, Sleep, Wake
- Glassmorphism style — uses `.glass-card` class matching card aesthetic
- Hover: purple tint (`bg-[var(--accent)]/25`), border glow (`border-[var(--accent)]/60`), shadow (`0 0 30px rgba(168,85,247,0.3)`)
- Disabled: muted opacity, no hover effects
- Active: smooth scale-down (`active:scale-[0.97]`)
- **Refactored:** Extracted `PowerButton` memo component with `min-w-[100px]` responsive sizing
- **API calls:**
  - Uses `VITE_POWER_API_URL` env var for power server (port 8001)
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
- **h1**: Righteous font, 72px, gradient text (accent → text-h), responsive 48px at <1024px
- **h2**: Righteous (via `--heading`), 500 weight, 24px, responsive 20px at <1024px
- **Body**: Prompt, 18px, responsive 16px at <1024px
- **code/mono**: Prompt + Consolas monospace
- **PC Status**: Zen Dots font (hostname + status label)

### Tech Stack
- React 19.2.4 + Vite
- Tailwind CSS 4.2.2 (CSS-first, `@tailwindcss/vite` plugin)
- Recharts for charts
- Babel + React Compiler (`@vitejs/plugin-react` with `reactCompilerPreset`)
- Prompt + Righteous + Bitcount Grid Double + Zen Dots fonts from Google Fonts

### Frontend Env
```bash
# frontend/.env
VITE_METRICS_API_URL=http://192.168.100.140:8000
VITE_POWER_API_URL=http://192.168.100.140:8001
```

### Vite Config (`frontend/vite.config.js`)
- Plugins: TailwindCSS (via `@tailwindcss/vite`), React, Babel with React Compiler (`@vitejs/plugin-react` + `@rolldown/plugin-babel`)
- Dev server: `host: '0.0.0.0'`

### App.jsx
- Renders `<Layout>` → `<main>` → `<MetricsGrid />`
- **PowerControls embedded** inside MetricsGrid PC Status card (wrapped in `memo`, no re-render on chart updates)

### CSS (`frontend/src/index.css`)
- `#root`: full-screen width, `min-height: 100svh`, flex column, centered, scenery background (local AVIF + JPEG fallback via `image-set()`, dark gradient overlay)
- **Background images**: `bg.avif` (139K, primary) + `bg.jpg` (40K, fallback) in `public/`
- `.main-content`: `flex: 1`, `padding: 32px`, `gap: 32px`
- `.glass-card`: `bg-black/40`, `border-white/10`, `backdrop-blur(12px)`, `-webkit-backdrop-filter` fallback

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
cd /home/suponer/Documents/Codes/AICodes/system-manager/backend/power/
source ../venv/bin/activate
export PYTHONPATH=/home/suponer/Documents/Codes/AICodes/system-manager:$PYTHONPATH
uvicorn app:app --reload --host 0.0.0.0 --port 8001
```

## Implementation Status

**Complete:**
- Backend servers running on ports 8000 (metrics) and 8001 (power)
- Frontend connected to real API with real-time polling
- Recharts display live metrics data
- All endpoints implemented and tested

## Recent Changes

### Frontend Cleanup
- Deleted `ChartsSection.jsx` (dead code, never imported)
- Removed unused `areArraysEqual` function and `React` import from MetricsGrid
- Merged duplicate `fetchStatus`/`fetchStatusOnly` into single function
- Removed `isFirstFetch` state and related effects
- Fixed PowerControls to use `VITE_METRICS_API_URL` env var instead of hardcoded URL
- Cleaned up Layout.jsx inline styles → Tailwind classes

### Offline Bug Fix
- Fixed infinite loading when backend is offline
- Loading state separated from metrics check — shows skeleton while loading
- Falls through to offline card or dashboard after loading clears
- PowerControls embedded in offline card

### Visual Updates
- PowerControls buttons: removed 3D style, now uses glass-card class with purple glow hover
- Fonts updated: Montserrat → Prompt (body), Righteous (headings)
- Background image: external Unsplash URL → local AVIF + JPEG fallback (55% smaller)

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