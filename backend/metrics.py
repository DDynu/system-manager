"""Metrics collected from the target over SSH.

The target machine runs a POSIX shell script that reads /proc directly.
Nothing needs to be installed there: no Python, no psutil. Just sshd
and key auth for the server.

GPU metrics are optional: if the target has nvtop and jq, the script
adds per-GPU lines (nvtop -s is a JSON snapshot mode); otherwise it
reports a gpu_error message and the frontend skips GPU cards.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config import (
    get_target,
    get_ssh_key_path,
    get_ssh_password,
    get_ssh_timeout,
    get_ssh_retries,
)
from ssh import execute_command

router = APIRouter()

# Reads /proc twice (1s apart) for CPU, plus memory, network, uptime, hostname.
# Prints "key value" lines parsed by parse_metrics().
METRICS_SCRIPT = r"""
read -r _ u1 n1 s1 i1 w1 q1 sq1 st1 _ < /proc/stat
sleep 1
read -r _ u2 n2 s2 i2 w2 q2 sq2 st2 _ < /proc/stat
t1=$((u1+n1+s1+i1+w1+q1+sq1+st1))
t2=$((u2+n2+s2+i2+w2+q2+sq2+st2))
dt=$((t2-t1)); di=$((i2+w2-i1-w1))
if [ "$dt" -gt 0 ]; then echo "cpu $((100*(dt-di)/dt))"; else echo "cpu 0"; fi
awk '/^MemTotal:/{t=$2} /^MemAvailable:/{a=$2} END{
    printf "mem_total %.1f\n", t/1048576
    printf "mem_used %.1f\n", (t-a)/1048576
    printf "mem_percent %d\n", (t-a)*100/t
}' /proc/meminfo
awk 'NR>2 {split($1,f,":"); if (f[1]=="lo") next; rx+=$2; tx+=$10}
     END{printf "net_rx %d\n", rx; printf "net_tx %d\n", tx}' /proc/net/dev
awk '{s=int($1);
     printf "uptime %dd %dh %dm\n", int(s/86400), int(s%86400/3600), int(s%3600/60)}' /proc/uptime
if command -v nvtop > /dev/null 2>&1 && command -v jq > /dev/null 2>&1; then
    nvtop -s 2>/dev/null | jq -r \
        '.[] | [.device_name, .gpu_util, .mem_used, .mem_total, .temp, .power_draw] | @tsv' 2>/dev/null |
    while IFS=$(printf '\t') read -r name util mu mt temp pw; do
        [ -n "$name" ] || continue
        printf 'gpu %s|%s|%s|%s|%s|%s\n' "$name" "$util" "$mu" "$mt" "$temp" "$pw"
    done
else
    echo "gpu_error nvtop or jq is not installed on the target"
fi
echo "hostname $(cat /proc/sys/kernel/hostname)"
"""

REQUIRED_KEYS = ("cpu", "mem_total", "mem_used", "mem_percent", "net_rx", "net_tx", "uptime")


class Memory(BaseModel):
    used: float
    total: float
    percent: int


class Network(BaseModel):
    rx: int
    tx: int


class Metrics(BaseModel):
    cpu: int
    memory: Memory
    uptime: str
    network: Network
    gpu: list[Gpu] = []
    gpu_error: str | None = None


class Gpu(BaseModel):
    name: str
    utilization: int | None   # %
    mem_used: float | None    # GB
    mem_total: float | None   # GB
    temperature: int | None   # C
    power: float | None       # W


class Status(BaseModel):
    hostname: str
    status: str


def _ssh_kwargs():
    return {
        **get_target(),
        "key_path": get_ssh_key_path(),
        "password": get_ssh_password(),
        "timeout": get_ssh_timeout(),
        "retries": get_ssh_retries(),
    }


def _run_on_target(command):
    result = execute_command(command, **_ssh_kwargs())
    if not result["success"]:
        detail = result["stderr"].strip() or f"exit code {result['exit_code']}"
        raise HTTPException(status_code=503, detail=f"Target unreachable: {detail}")
    return result["stdout"]


def _int(value, suffix=""):
    try:
        return int(value.strip().removesuffix(suffix))
    except ValueError:
        return None


def _float(value, suffix=""):
    try:
        return float(value.strip().removesuffix(suffix))
    except ValueError:
        return None


def _gb(bytes_value):
    """nvtop reports memory in raw bytes."""
    b = _int(bytes_value)
    return round(b / 1073741824, 1) if b is not None else None


def parse_gpus(output: str) -> list[Gpu]:
    gpus = []
    for line in output.splitlines():
        if not line.startswith("gpu "):
            continue
        fields = line[4:].split("|")
        if len(fields) != 6:
            continue
        name, util, mu, mt, temp, power = fields
        gpus.append(Gpu(
            name=name,
            utilization=_int(util, "%"),
            mem_used=_gb(mu),
            mem_total=_gb(mt),
            temperature=_int(temp, "C"),
            power=_float(power, "W"),
        ))
    return gpus


def parse_metrics(output: str) -> Metrics:
    values = {}
    for line in output.splitlines():
        key, _, value = line.partition(" ")
        if value:
            values[key] = value.strip()

    missing = [key for key in REQUIRED_KEYS if key not in values]
    if missing:
        raise HTTPException(
            status_code=502,
            detail=f"Malformed metrics from target, missing: {', '.join(missing)}",
        )

    try:
        return Metrics(
            cpu=int(values["cpu"]),
            memory=Memory(
                used=float(values["mem_used"]),
                total=float(values["mem_total"]),
                percent=int(values["mem_percent"]),
            ),
            uptime=values["uptime"],
            network=Network(rx=int(values["net_rx"]), tx=int(values["net_tx"])),
            gpu=parse_gpus(output),
            gpu_error=values.get("gpu_error"),
        )
    except ValueError as e:
        raise HTTPException(status_code=502, detail=f"Malformed metrics from target: {e}")


@router.get("/api/metrics", response_model=Metrics)
def get_metrics():
    output = _run_on_target(METRICS_SCRIPT)
    return parse_metrics(output)


@router.get("/api/metrics/status", response_model=Status)
def get_status():
    hostname = _run_on_target("cat /proc/sys/kernel/hostname").strip()
    return Status(hostname=hostname, status="Online")
