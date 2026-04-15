# System Manager Architecture

## Context
Project split into two separate servers: metrics monitoring server and power control server. Frontend displays metrics and can control power on remote system.

## Structure

```
system-manager/
├── backend/
│   ├── metrics/
│   │   ├── main.py        - FastAPI metrics server (port 8000)
│   │   └── start.sh       - Start script
│   └── power/
│       ├── power.py       - FastAPI power control server (port 8001)
│       └── start.sh       - Start script
├── frontend/              - React frontend
└── plans/
```

## Backend Servers

### Metrics Server (`backend/metrics/`)
FastAPI app exposing:
- `GET /api/metrics` - CPU, memory, disk, uptime, temperature, network stats
- `GET /api/status` - Hostname, online status

```python
# backend/metrics/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psutil
import time
import platform
from datetime import datetime
from typing import Optional

app = FastAPI(title="System Manager API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Metrics(BaseModel):
    cpu: int
    memory: dict
    disk: dict
    uptime: str
    temperature: Optional[int] = None
    network: dict

class Status(BaseModel):
    hostname: str
    status: str

def get_uptime():
    boot_time = psutil.boot_time()
    boot_dt = datetime.fromtimestamp(boot_time)
    now = datetime.now()
    delta = now - boot_dt
    days = delta.days
    hours, remainder = divmod(delta.seconds, 3600)
    minutes, _ = divmod(remainder, 60)
    return f"{days}d {hours}h {minutes}m"

def get_temperature():
    try:
        temps = psutil.sensors_temperatures()
        if temps:
            first = list(temps.values())[0]
            temp = list(first.values())[0]
            return int(temp.current) if temp.current else None
    except Exception:
        pass
    return None

def get_network_io():
    io1 = psutil.net_io_counters()
    time.sleep(1)
    io_2 = psutil.net_io_counters()
    up_speed, down_speed = io_2.bytes_sent - io1.bytes_sent, io_2.bytes_recv - io1.bytes_recv
    return {
        "rx": down_speed,
        "tx": up_speed
    }

@app.get("/api/metrics", response_model=Metrics)
def get_metrics():
    cpu = int(psutil.cpu_percent(interval=1))
    mem = psutil.virtual_memory()
    memory = {
        "used": round(mem.used / (1024 ** 3), 1),
        "total": round(mem.total / (1024 ** 3), 1),
        "percent": mem.percent
    }
    disk = psutil.disk_usage("/")
    disk_info = {
        "used": round(disk.used / (1024 ** 3), 0),
        "total": round(disk.total / (1024 ** 3), 0),
        "percent": disk.percent
    }
    network = get_network_io()
    return Metrics(
        cpu=cpu,
        memory=memory,
        disk=disk_info,
        uptime=get_uptime(),
        temperature=get_temperature(),
        network=network
    )

@app.get("/api/status", response_model=Status)
def get_status():
    hostname = platform.node()
    return Status(hostname=hostname, status="Online")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### Power Server (`backend/power/`)
FastAPI app for remote power control:
- `POST /api/power/shutdown` - Shutdown system (requires `confirm: true`)
- `POST /api/power/reboot` - Reboot system (requires `confirm: true`)
- `POST /api/power/sleep` - Suspend system
- `POST /api/power/wake?mac_address=XX:XX:XX:XX:XX:XX` - Wake on LAN

```python
# backend/power/power.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import subprocess

power_app = FastAPI(title="Power Control API")

class PowerCommand(BaseModel):
    confirm: bool = False

@power_app.post("/api/power/shutdown")
def shutdown(cmd: PowerCommand):
    if not cmd.confirm:
        raise HTTPException(status_code=400, detail="Confirm required. Set confirm=true.")
    subprocess.run(["shutdown", "-h", "now"], check=False)
    return {"message": "Shutdown initiated"}

@power_app.post("/api/power/reboot")
def reboot(cmd: PowerCommand):
    if not cmd.confirm:
        raise HTTPException(status_code=400, detail="Confirm required. Set confirm=true.")
    subprocess.run(["shutdown", "-r", "now"], check=False)
    return {"message": "Reboot initiated"}

@power_app.post("/api/power/sleep")
def sleep():
    try:
        subprocess.run(["systemctl", "suspend"], check=False)
    except Exception:
        try:
            subprocess.run(["pm-suspend"], check=False)
        except Exception:
            raise HTTPException(status_code=500, detail="Sleep not supported")
    return {"message": "Sleep initiated"}

@power_app.post("/api/power/wake")
def wake(mac_address: str):
    try:
        subprocess.run(["wakeonlan", mac_address], check=False)
        return {"message": f"WOL packet sent to {mac_address}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

## Frontend Components

### MetricsGrid (`frontend/src/components/MetricsGrid.jsx`)
- Displays CPU, memory, network area charts
- Shows PC status, current time, uptime
- Updates every 1 second
- API URL: `http://localhost:8000/api`

**Features:**
- CPU graph: purple area chart, 0-100%
- Memory graph: green area chart, GB used / total
- Network graph: dual area charts (Download: amber, Upload: cyan)
- Dynamic byte formatting: B, KB, MB, GB, TB

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
