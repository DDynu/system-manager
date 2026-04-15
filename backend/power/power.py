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
