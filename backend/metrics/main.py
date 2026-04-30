import psutil
import platform
from datetime import datetime

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="System Manager API")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://192.168.100.140:4173", "http://192.168.100.140:5173", "http://192.168.100.80:8085", "http://localhost:5173", "http://localhost:8085"],
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


@app.get("/api/status", response_model=Status)
def get_status():
    hostname = platform.node()
    return Status(hostname=hostname, status="Online")


ALLOWED_WS_ORIGINS = [
    "http://192.168.100.140:4173", "http://192.168.100.140:5173", "http://192.168.100.140:8000", "http://192.168.100.80:8085",
    "http://localhost:5173", "http://localhost:8085", "http://localhost:8000",
    "ws://192.168.100.140:4173", "ws://192.168.100.140:5173", "ws://192.168.100.140:8000", "ws://192.168.100.80:8085",
    "ws://localhost:5173", "ws://localhost:8085", "ws://localhost:8000",
    "wss://192.168.100.140:4173", "wss://192.168.100.140:5173", "wss://192.168.100.140:8000", "wss://192.168.100.80:8085",
    "wss://localhost:5173", "wss://localhost:8085", "wss://localhost:8000",
]

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
    print("CHECK ORIGIN:", origin)
    if not check_ws_origin(origin):
        await websocket.close(code=403)
        return
    await websocket.accept()
    await websocket.send_json({"type": "status", "state": "online"})
    try:
        while True:
            await websocket.receive_text()
    except Exception:
        pass
    finally:
        await websocket.send_json({"type": "status", "state": "offline"})
        await websocket.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
