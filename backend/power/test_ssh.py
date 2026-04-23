from paramiko import SSHClient
from dotenv import load_dotenv
from pathlib import Path
import os

_env_path = Path(__file__).parent / ".env"
print(_env_path)
load_dotenv(_env_path)

client = SSHClient()
client.load_system_host_keys()

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
try:
    target = get_target()
    client.connect(**target)
    stdin, stdout, stderr = client.exec_command('pwd; echo \"Hello ;3\"')
    print("OUT", stdout.read())

except:
    print("Something's wrong")
