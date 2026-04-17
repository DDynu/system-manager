import psutil
import time
import platform
from datetime import datetime
from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="System Manager API")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8085", "http://192.168.100.80:8085", "http://localhost:5173", "http://192.168.100.140:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Metrics(BaseModel):
    cpu: int
    memory: dict
    disk: dict
    uptime: str
    temperature: float 
    network: dict


class Status(BaseModel):
    hostname: str
    status: str


def get_size(bytes):
    """
    Returns size of bytes in a nice format
    """
    for unit in ['', 'K', 'M', 'G', 'T', 'P']:
        if bytes < 1024:
            return f"{bytes:.2f}{unit}B"
        bytes /= 1024

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
        if temps.get("k10temp"):
            # Get first available sensor
            return temps.get("k10temp")[0].current
    except Exception:
        pass
    return None


def get_network_io():
    io1 = psutil.net_io_counters()
    time.sleep(1)
    io_2 = psutil.net_io_counters()
    up_speed , down_speed = io_2.bytes_sent - io1.bytes_sent, io_2.bytes_recv - io1.bytes_recv
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
