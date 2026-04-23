import subprocess
import os
from pathlib import Path
from threading import excepthook
from dotenv import load_dotenv
from paramiko import SSHClient, SSHException

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
# from backend.power.ssh import execute_command

_env_path = Path(__file__).parent / ".env"
if _env_path.exists():
    load_dotenv(_env_path)

power_app = FastAPI(title="Power Control API")


class PowerCommand(BaseModel):
    confirm: bool = False

def execute_command(command):
    client = SSHClient()
    client.load_system_host_keys()
    target = get_target()
    try :
        client.connect(**target, timeout=5)
        stdin, stdout, stderr = client.exec_command(command);
        return {
            "success": True,
            "stdout": stdout.read(),
            "target": target
        }
    except SSHException:
        print("Something's wrong, SSH failed")
        return {
            "success": False,
            "target": target
        }


def get_target():
    targets = os.getenv("TARGETS", "")
    if not targets:
        raise ValueError("TARGETS not set in .env")
    parts = targets.split(":")
    if len(parts) != 3:
        raise ValueError(f"TARGETS format must be host:port:user, got '{targets}'")
    return {
        "hostname": parts[0],
        "port": int(parts[1]),
        "username": parts[2],
    }

# def _ssh_kwargs():
#     """Build kwargs dict for execute_command from config."""
#     target = get_target()
#     return {
#         **target,
#         "key_path": os.getenv("SSH_KEY_PATH", ""),
#         "password": os.getenv("SSH_PASSWORD", ""),
#         "timeout": os.getenv("SSH_TIMEOUT", "10"),
#         "retries": os.getenv("SSH_PASSWORD", "2"),
#     }


@power_app.post("/api/power/shutdown")
def shutdown(cmd: PowerCommand):
    if not cmd.confirm:
        raise HTTPException(status_code=400, detail="Confirm required. Set confirm=true.")
    result = execute_command("shutdown -h now")
    if not result["success"]:
        raise HTTPException(status_code=503, detail=result["stderr"])
    return {"message": "Shutdown initiated", "target": result["target"]["hostname"]}


@power_app.post("/api/power/reboot")
def reboot(cmd: PowerCommand):
    if not cmd.confirm:
        raise HTTPException(status_code=400, detail="Confirm required. Set confirm=true.")
    result = execute_command("shutdown -r now")
    if not result["success"]:
        raise HTTPException(status_code=503, detail=result["stderr"])
    return {"message": "Reboot initiated", "target": result["target"]["hostname"]}


@power_app.post("/api/power/sleep")
def sleep():
    # Try systemctl first, fall back to pm-suspend
    result = execute_command("systemctl suspend")
    if result["success"]:
        return {"message": "Sleep initiated", "target": result["target"]["hostname"]}
    raise HTTPException(status_code=500, detail=f"Sleep failed: {result['stderr']}")


@power_app.post("/api/power/wake")
def wake():
    mac = os.getenv("TARGET_MAC", "")
    if not mac:
        raise HTTPException(status_code=400, detail="TARGET_MAC not configured")
    try:
        subprocess.run(["wol", mac], check=True, capture_output=True)
        return {"message": f"WOL packet sent to {mac}"}
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=e.stderr.decode() if e.stderr else str(e))
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="wakeonlan command not found")


@power_app.get("/api/power/status")
def status():
    result = execute_command("echo ok")
    if not result["success"]:
        raise HTTPException(status_code=503, detail=result["stderr"])
    return {"reachable": True, "target": result["target"]["hostname"]}
