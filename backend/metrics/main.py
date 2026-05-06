import psutil
import platform
import os
from datetime import datetime

from fastapi import FastAPI, WebSocket
from pathlib import Path
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from dotenv import load_dotenv

_env_path = Path(__file__).parent / ".env"
if _env_path.exists():
    load_dotenv(_env_path)

allowed_origins = os.getenv("ALLOWED_ORIGINS")
if allowed_origins: 
    allowed_origins.split(",")
app = FastAPI(title="System Manager API")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if allowed_origins else "",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Metrics(BaseModel):
    cpu: int
    memory: dict
    # disk: dict
    uptime: str
    # temperature: float | None
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

#
# def get_temperature():
#     try:
#         temps = psutil.sensors_temperatures()
#         if temps.get("k10temp"):
#             # Get first available sensor
#             return temps.get("k10temp")[0].current
#     except Exception:
#         pass
#     return None


def get_network_io():
    io = psutil.net_io_counters()
    # up_speed , down_speed = io_2.bytes_sent - io1.bytes_sent, io_2.bytes_recv - io1.bytes_recv
    return {
        "rx": io.bytes_recv,
        "tx": io.bytes_sent 
    }


@app.get("/api/metrics", response_model=Metrics)
def get_metrics():
    cpu = int(psutil.cpu_percent(interval=None))

    mem = psutil.virtual_memory()
    memory = {
        "used": round(mem.used / (1024 ** 3), 1),
        "total": round(mem.total / (1024 ** 3), 1),
        "percent": mem.percent
    }

    # disk = psutil.disk_usage("/")
    # disk_info = {
    #     "used": round(disk.used / (1024 ** 3), 0),
    #     "total": round(disk.total / (1024 ** 3), 0),
    #     "percent": disk.percent
    # }

    network = get_network_io()

    return Metrics(
        cpu=cpu,
        memory=memory,
        # disk=disk_info,
        uptime=get_uptime(),
        # temperature=get_temperature(),
        network=network
    )


@app.get("/api/metrics/status", response_model=Status)
def get_status():
    hostname = platform.node()
    return Status(hostname=hostname, status="Online")


ALLOWED_WS_ORIGINS = os.getenv("ALLOWED_WS_ORIGINS").split(",")
def check_ws_origin(origin):
    print("WS ORIGIN: ", origin)
    if not origin:
        return False
    # Normalize ws/wss to http for comparison
    normalized = origin.replace("ws://", "http://").replace("wss://", "http://")
    return normalized in ALLOWED_WS_ORIGINS

@app.websocket("/ws/status")
async def websocket_status(websocket: WebSocket):
    # Check origin for WebSocket CORS
    origin = websocket.headers.get("origin", "")
    if not check_ws_origin(origin):
        await websocket.close(code=403)
        return
    await websocket.accept()
    try:
        while True:
            await websocket.receive_text()
    except Exception:
        pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
