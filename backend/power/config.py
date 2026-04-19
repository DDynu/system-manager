import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the power directory
_env_path = Path(__file__).parent / ".env"
if _env_path.exists():
    load_dotenv(_env_path)


def get_target():
    targets = os.getenv("TARGETS", "")
    if not targets:
        raise ValueError("TARGETS not set in .env")
    parts = targets.split(":")
    if len(parts) != 3:
        raise ValueError(f"TARGETS format must be host:port:user, got '{targets}'")
    return {
        "host": parts[0],
        "port": int(parts[1]),
        "user": parts[2],
    }


def get_target_mac():
    return os.getenv("TARGET_MAC", "")


def get_ssh_key_path():
    return os.getenv("SSH_KEY_PATH", "")


def get_ssh_password():
    return os.getenv("SSH_PASSWORD", "")


def get_ssh_timeout():
    try:
        return int(os.getenv("SSH_TIMEOUT", "10"))
    except ValueError:
        return 10


def get_ssh_retries():
    try:
        return int(os.getenv("SSH_RETRIES", "2"))
    except ValueError:
        return 2
