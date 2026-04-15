# System Manager - Backend Implementation Plan

## Context
Frontend dashboard exists in `frontend/` folder with hardcoded mock data. Need to build backend API to provide real system metrics and handle power control commands (shutdown, reboot, sleep, wake).

## Current State

### Frontend Structure (`frontend/`)
- React 19.2.4 + Vite
- Tailwind CSS 4.2.2
- Components:
  - `src/App.jsx` - Composes Layout, MetricsGrid, PowerControls
  - `src/components/Layout.jsx` - Header with Oswald font
  - `src/components/MetricsGrid.jsx` - PC status + 6 metric cards
  - `src/components/PowerControls.jsx` - 4 power buttons
  - `src/index.css` - Dark theme, Oswald font

### Existing Mock Data (`frontend/src/data/mockData.js`)
```javascript
cpuHistory, memoryHistory, diskIOHistory - time series data
```

## Backend Requirements

### API Endpoints

**GET /api/metrics**
```json
{
  "cpu": 45,
  "memory": { "used": 12.4, "total": 32, "percent": 39 },
  "disk": { "used": 245, "total": 1000, "percent": 25 },
  "uptime": "14d 3h",
  "temperature": 62,
  "network": { "rx": 45.2, "tx": 12.5 }
}
```

**GET /api/status**
```json
{ "hostname": "Desktop-PC", "status": "Online" }
```

**POST /api/power/shutdown** - Shutdown system
**POST /api/power/reboot** - Reboot system
**POST /api/power/sleep** - Sleep mode
**POST /api/power/wake** - Wake on LAN (requires MAC address)

## Tech Stack Decision

**Python + FastAPI** recommended because:
- `psutil` - Excellent system metrics library
- `subprocess` - Native system command execution
- FastAPI - Async, auto OpenAPI docs
- Better for system administration tasks

## Implementation Plan

### Phase 1: Project Setup
1. Create `backend/` directory
2. Initialize Python virtual environment
3. Create `requirements.txt`:
   - `fastapi`
   - `uvicorn`
   - `psutil`
   - `pydantic`

### Phase 2: Core API
1. Create `main.py` - FastAPI app
2. Implement `/api/metrics` endpoint using `psutil`
3. Implement `/api/status` endpoint
4. Add CORS for frontend (`http://localhost:5173`)

### Phase 3: Power Control
1. Implement `/api/power/shutdown` - `os.system("shutdown -h")`
2. Implement `/api/power/reboot` - `os.system("reboot")`
3. Implement `/api/power/sleep` - D-Bus or `pm-sleep`
4. Implement `/api/power/wake` - WOL packet with `wakeonlan`

### Phase 4: Security
1. Add basic auth or token-based authentication
2. Rate limiting on power endpoints
3. Environment variable for auth token

### Phase 5: Frontend Integration
1. Update `MetricsGrid.jsx` to fetch from `/api/metrics`
2. Update `PowerControls.jsx` to POST to `/api/power/*`
3. Add loading states and error handling

## File Structure
```
backend/
  main.py
  requirements.txt
  .env
```

## Verification
1. `cd backend && pip install -r requirements.txt`
2. `uvicorn main:app --reload`
3. Test endpoints with curl or browser
4. Update frontend to call real API
5. Test power commands (with confirmation)
