import os
from pathlib import Path

from dotenv import load_dotenv

_env_path = Path(__file__).parent / ".env"
if _env_path.exists():
    load_dotenv(_env_path)


def get_target():
    raw = os.getenv("TARGETS", "")
    if not raw:
        raise ValueError("TARGETS not set in backend/.env (expected host:port:user)")
    parts = raw.split(":")
    if len(parts) != 3:
        raise ValueError(f"TARGETS must be host:port:user, got {raw!r}")
    return {"host": parts[0], "port": int(parts[1]), "user": parts[2]}


def get_ssh_key_path():
    return os.path.expanduser(os.getenv("SSH_KEY_PATH", ""))


def get_ssh_password():
    return os.getenv("SSH_PASSWORD", "")


def get_ssh_timeout():
    try:
        return int(os.getenv("SSH_TIMEOUT", "10"))
    except ValueError:
        return 10


def get_ssh_retries():
    try:
        return int(os.getenv("SSH_RETRIES", "1"))
    except ValueError:
        return 1


def get_allowed_origins():
    raw = os.getenv("ALLOWED_ORIGINS", "")
    return [origin for origin in raw.split(",") if origin]


def get_allowed_ws_origins():
    raw = os.getenv("ALLOWED_WS_ORIGINS", "")
    return {origin for origin in raw.split(",") if origin}
