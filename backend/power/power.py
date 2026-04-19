from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from backend.power.config import get_target, get_target_mac, get_ssh_timeout, get_ssh_retries, get_ssh_key_path, get_ssh_password
from backend.power.ssh import execute_command

power_app = FastAPI(title="Power Control API")


class PowerCommand(BaseModel):
    confirm: bool = False


def _ssh_kwargs():
    """Build kwargs dict for execute_command from config."""
    target = get_target()
    return {
        **target,
        "key_path": get_ssh_key_path(),
        "password": get_ssh_password(),
        "timeout": get_ssh_timeout(),
        "retries": get_ssh_retries(),
    }


@power_app.post("/api/power/shutdown")
def shutdown(cmd: PowerCommand):
    if not cmd.confirm:
        raise HTTPException(status_code=400, detail="Confirm required. Set confirm=true.")
    kwargs = _ssh_kwargs()
    result = execute_command("shutdown -h now", **kwargs)
    if not result["success"]:
        raise HTTPException(status_code=503, detail=result["stderr"])
    return {"message": "Shutdown initiated", "target": kwargs["host"]}


@power_app.post("/api/power/reboot")
def reboot(cmd: PowerCommand):
    if not cmd.confirm:
        raise HTTPException(status_code=400, detail="Confirm required. Set confirm=true.")
    kwargs = _ssh_kwargs()
    result = execute_command("shutdown -r now", **kwargs)
    if not result["success"]:
        raise HTTPException(status_code=503, detail=result["stderr"])
    return {"message": "Reboot initiated", "target": kwargs["host"]}


@power_app.post("/api/power/sleep")
def sleep():
    kwargs = _ssh_kwargs()
    # Try systemctl first, fall back to pm-suspend
    result = execute_command("systemctl suspend", **kwargs)
    if result["success"]:
        return {"message": "Sleep initiated", "target": kwargs["host"]}
    result = execute_command("pm-suspend", **kwargs)
    if result["success"]:
        return {"message": "Sleep initiated", "target": kwargs["host"]}
    raise HTTPException(status_code=500, detail=f"Sleep failed: {result['stderr']}")


@power_app.post("/api/power/wake")
def wake():
    mac = get_target_mac()
    if not mac:
        raise HTTPException(status_code=400, detail="TARGET_MAC not configured")
    import subprocess
    try:
        subprocess.run(["wakeonlan", mac], check=True, capture_output=True)
        return {"message": f"WOL packet sent to {mac}"}
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=e.stderr.decode() if e.stderr else str(e))
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="wakeonlan command not found")


@power_app.get("/api/power/status")
def status():
    kwargs = _ssh_kwargs()
    result = execute_command("echo ok", **kwargs)
    if not result["success"]:
        raise HTTPException(status_code=503, detail=result["stderr"])
    return {"reachable": True, "target": kwargs["host"]}
