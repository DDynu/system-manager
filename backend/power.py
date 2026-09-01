"""Wake-on-LAN for the target machine.

Runs the `wakeonlan` command on this server, which shares the LAN with the
target. The magic packet is broadcast on the local network, so the container
must run with host networking for it to actually reach the target's NIC.
The target must also have WOL enabled on that NIC in its BIOS/UEFI.
"""
import subprocess

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config import get_wol_mac

router = APIRouter()


class WakeResult(BaseModel):
    sent: bool
    mac: str
    message: str


@router.post("/api/power/wake", response_model=WakeResult)
def wake_pc():
    mac = get_wol_mac()
    if not mac:
        raise HTTPException(
            status_code=500,
            detail="WOL_MAC_ADDRESS is not set in backend/.env",
        )
    try:
        proc = subprocess.run(
            ["wakeonlan", mac],
            capture_output=True,
            text=True,
            timeout=10,
        )
    except FileNotFoundError:
        raise HTTPException(
            status_code=500,
            detail="wakeonlan is not installed on the server",
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="wakeonlan timed out")

    if proc.returncode != 0:
        detail = proc.stderr.strip() or f"exit code {proc.returncode}"
        raise HTTPException(status_code=500, detail=f"wakeonlan failed: {detail}")

    return WakeResult(sent=True, mac=mac, message=f"Wake packet broadcast to {mac}")
