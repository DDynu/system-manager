# Power Backend SSH Remote Management

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the power backend to SSH into a target machine as root and execute power commands remotely.

**Architecture:** FastAPI server with separate config, SSH, and endpoint modules. Targets configured via `.env`. Single target at a time. New connections per command via paramiko.

**Tech Stack:** FastAPI, paramiko, python-dotenv, pytest, pytest-mock

---

### Task 1: Add dependencies

**Files:**
- Modify: `backend/requirements.txt`

- [ ] **Step 1: Add paramiko and python-dotenv to requirements**

Append to `backend/requirements.txt`:
```
paramiko==3.4.0
python-dotenv==1.0.0
pytest==8.2.0
pytest-mock==3.14.0
```

- [ ] **Step 2: Commit**

```bash
git add backend/requirements.txt
git commit -m "chore: add paramiko, python-dotenv, pytest deps"
```

---

### Task 2: Create config module

**Files:**
- Create: `backend/power/config.py`

- [ ] **Step 1: Write tests for config parsing**

Create `backend/power/test_config.py`:
```python
import os
import pytest
from dotenv import load_dotenv
from pathlib import Path

TEST_ENV_CONTENT = """\
TARGETS=192.168.100.50:22:root
TARGET_MAC=AA:BB:CC:DD:EE:FF
SSH_KEY_PATH=~/.ssh/id_rsa
SSH_PASSWORD=
SSH_TIMEOUT=10
SSH_RETRIES=2
"""


@pytest.fixture(autouse=True)
def _clear_env(monkeypatch):
    """Clear power-related env vars before each test."""
    for key in ["TARGETS", "TARGET_MAC", "SSH_KEY_PATH", "SSH_PASSWORD", "SSH_TIMEOUT", "SSH_RETRIES"]:
        monkeypatch.delenv(key, raising=False)


@pytest.fixture
def env_file(tmp_path):
    f = tmp_path / ".env"
    f.write_text(TEST_ENV_CONTENT)
    return f


def test_parse_target(env_file, monkeypatch):
    monkeypatch.setenv("TARGETS", "192.168.100.50:22:root")
    from backend.power.config import get_target
    target = get_target()
    assert target["host"] == "192.168.100.50"
    assert target["port"] == 22
    assert target["user"] == "root"


def test_parse_target_mac(env_file, monkeypatch):
    monkeypatch.setenv("TARGET_MAC", "AA:BB:CC:DD:EE:FF")
    from backend.power.config import get_target_mac
    assert get_target_mac() == "AA:BB:CC:DD:EE:FF"


def test_parse_ssh_key_path(monkeypatch):
    monkeypatch.setenv("SSH_KEY_PATH", "/custom/key")
    from backend.power.config import get_ssh_key_path
    assert get_ssh_key_path() == "/custom/key"


def test_parse_ssh_timeout(monkeypatch):
    monkeypatch.setenv("SSH_TIMEOUT", "30")
    from backend.power.config import get_ssh_timeout
    assert get_ssh_timeout() == 30


def test_parse_ssh_retries(monkeypatch):
    monkeypatch.setenv("SSH_RETRIES", "5")
    from backend.power.config import get_ssh_retries
    assert get_ssh_retries() == 5


def test_parse_ssh_password(monkeypatch):
    monkeypatch.setenv("SSH_PASSWORD", "secret123")
    from backend.power.config import get_ssh_password
    assert get_ssh_password() == "secret123"


def test_missing_target_raises():
    from backend.power.config import get_target
    with pytest.raises(ValueError, match="TARGETS"):
        get_target()
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/suponer/Documents/Codes/AICodes/system-manager
python -m pytest backend/power/test_config.py -v
```
Expected: FAIL with "No module named backend.power.config"

- [ ] **Step 3: Write config module**

Create `backend/power/config.py`:
```python
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
python -m pytest backend/power/test_config.py -v
```
Expected: PASS (all 7 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/power/config.py backend/power/test_config.py
git commit -m "feat(power): add config module for .env parsing"
```

---

### Task 3: Create SSH execution layer

**Files:**
- Create: `backend/power/ssh.py`
- Create: `backend/power/test_ssh.py`

- [ ] **Step 1: Write tests for SSH execution**

Create `backend/power/test_ssh.py`:
```python
import pytest
from unittest.mock import patch, MagicMock
from paramiko.ssh_exception import (
    AuthenticationException,
    SSHException,
    SocketTimeout,
)
from backend.power.ssh import execute_command, connect_ssh


def test_execute_command_success():
    mock_client = MagicMock()
    mock_stdin = MagicMock()
    mock_stdout = MagicMock()
    mock_stderr = MagicMock()
    mock_stdout.read.return_value = "ok\n"
    mock_stderr.read.return_value = ""
    mock_client.exec_command.return_value = (mock_stdin, mock_stdout, mock_stderr)
    mock_client.invoke_shell.return_value = MagicMock()

    with patch("backend.power.ssh.connect_ssh", return_value=mock_client):
        result = execute_command("echo ok")
        assert result["success"] is True
        assert result["stdout"] == "ok\n"
        assert result["stderr"] == ""
        assert result["exit_code"] == 0
        mock_client.close.assert_called_once()


def test_execute_command_with_stderr():
    mock_client = MagicMock()
    mock_stdin = MagicMock()
    mock_stdout = MagicMock()
    mock_stderr = MagicMock()
    mock_stdout.read.return_value = ""
    mock_stderr.read.return_value = "command not found\n"
    mock_client.exec_command.return_value = (mock_stdin, mock_stdout, mock_stderr)
    mock_client.invoke_shell.return_value = MagicMock()

    with patch("backend.power.ssh.connect_ssh", return_value=mock_client):
        result = execute_command("badcmd")
        assert result["success"] is False
        assert "command not found" in result["stderr"]


def test_execute_command_connection_refused():
    with patch("backend.power.ssh.connect_ssh", side_effect=ConnectionRefusedError("refused")):
        result = execute_command("echo ok")
        assert result["success"] is False
        assert "connection" in result["stderr"].lower() or "refused" in result["stderr"].lower()


def test_execute_command_auth_failed():
    with patch("backend.power.ssh.connect_ssh", side_effect=AuthenticationException("bad auth")):
        result = execute_command("echo ok")
        assert result["success"] is False
        assert "auth" in result["stderr"].lower()


def test_connect_ssh_with_key():
    mock_transport = MagicMock()
    mock_client = MagicMock()
    mock_client.get_transport.return_value = mock_transport

    with patch("paramiko.SSHClient") as MockSSH, \
         patch("paramiko.RSAKey.from_private_key_file") as MockKey:
        MockSSH.return_value = mock_client
        mock_client.connect = MagicMock()

        connect_ssh(
            host="192.168.100.50",
            port=22,
            user="root",
            key_path="/test/key",
            password="",
            timeout=10,
            retries=1,
        )
        MockKey.assert_called_once()
        mock_client.connect.assert_called_once()


def test_connect_ssh_with_password():
    mock_client = MagicMock()

    with patch("paramiko.SSHClient") as MockSSH:
        MockSSH.return_value = mock_client
        mock_client.connect = MagicMock()

        connect_ssh(
            host="192.168.100.50",
            port=22,
            user="root",
            key_path="",
            password="secret",
            timeout=10,
            retries=1,
        )
        mock_client.connect.assert_called_once_with(
            hostname="192.168.100.50",
            port=22,
            username="root",
            password="secret",
            timeout=10,
            allow_agent=False,
            look_for_keys=False,
        )


def test_connect_ssh_retries_on_timeout():
    mock_client = MagicMock()
    mock_client.get_transport.return_value = MagicMock()

    call_count = 0

    def connect_side_effect(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count < 3:
            raise SocketTimeout("timeout")
        # Third call succeeds

    with patch("paramiko.SSHClient") as MockSSH:
        MockSSH.return_value = mock_client
        mock_client.connect.side_effect = connect_side_effect

        connect_ssh(
            host="192.168.100.50",
            port=22,
            user="root",
            key_path="",
            password="secret",
            timeout=10,
            retries=2,
        )
        assert call_count == 3  # initial + 2 retries
```

- [ ] **Step 2: Run test to verify it fails**

```bash
python -m pytest backend/power/test_ssh.py -v
```
Expected: FAIL with "No module named backend.power.ssh"

- [ ] **Step 3: Write SSH execution layer**

Create `backend/power/ssh.py`:
```python
import paramiko
from paramiko.ssh_exception import (
    AuthenticationException,
    SSHException,
    SocketTimeout,
)


def connect_ssh(host, port, user, key_path="", password="", timeout=10, retries=2):
    """Connect to remote host via SSH with retry logic."""
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    last_err = None
    for attempt in range(retries + 1):
        try:
            if key_path:
                key = paramiko.RSAKey.from_private_key_file(key_path)
                client.connect(
                    hostname=host,
                    port=port,
                    username=user,
                    pkey=key,
                    timeout=timeout,
                    allow_agent=False,
                    look_for_keys=False,
                )
            elif password:
                client.connect(
                    hostname=host,
                    port=port,
                    username=user,
                    password=password,
                    timeout=timeout,
                    allow_agent=False,
                    look_for_keys=False,
                )
            else:
                client.connect(
                    hostname=host,
                    port=port,
                    username=user,
                    timeout=timeout,
                )
            return client
        except SocketTimeout as e:
            last_err = e
            continue
        except AuthenticationException as e:
            raise
        except SSHException as e:
            last_err = e
            continue

    raise last_err


def execute_command(command, host, port, user, key_path="", password="", timeout=10, retries=2):
    """Execute a command on remote host via SSH.

    Returns dict with keys: success, stdout, stderr, exit_code
    """
    client = None
    try:
        client = connect_ssh(host, port, user, key_path, password, timeout, retries)
        stdin, stdout, stderr = client.exec_command(command)
        exit_code = stdout.channel.recv_exit_status()
        return {
            "success": exit_code == 0,
            "stdout": stdout.read().decode(),
            "stderr": stderr.read().decode(),
            "exit_code": exit_code,
        }
    except AuthenticationException:
        return {
            "success": False,
            "stdout": "",
            "stderr": "SSH authentication failed",
            "exit_code": -1,
        }
    except ConnectionRefusedError as e:
        return {
            "success": False,
            "stdout": "",
            "stderr": f"SSH connection failed: {e}",
            "exit_code": -1,
        }
    except SocketTimeout as e:
        return {
            "success": False,
            "stdout": "",
            "stderr": f"SSH connection timed out: {e}",
            "exit_code": -1,
        }
    except Exception as e:
        return {
            "success": False,
            "stdout": "",
            "stderr": f"SSH error: {e}",
            "exit_code": -1,
        }
    finally:
        if client:
            client.close()
```

- [ ] **Step 4: Run test to verify it passes**

```bash
python -m pytest backend/power/test_ssh.py -v
```
Expected: PASS (all 7 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/power/ssh.py backend/power/test_ssh.py
git commit -m "feat(power): add SSH execution layer with retry logic"
```

---

### Task 4: Rewrite power endpoints

**Files:**
- Modify: `backend/power/power.py`
- Create: `backend/power/test_power.py`

- [ ] **Step 1: Write tests for power endpoints**

Create `backend/power/test_power.py`:
```python
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from backend.power.power import app


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def mock_config(monkeypatch):
    monkeypatch.setenv("TARGETS", "192.168.100.50:22:root")
    monkeypatch.setenv("TARGET_MAC", "AA:BB:CC:DD:EE:FF")
    monkeypatch.setenv("SSH_KEY_PATH", "")
    monkeypatch.setenv("SSH_PASSWORD", "")
    monkeypatch.setenv("SSH_TIMEOUT", "10")
    monkeypatch.setenv("SSH_RETRIES", "2")


@pytest.fixture
def mock_ssh_success():
    with patch("backend.power.power.execute_command") as mock:
        mock.return_value = {"success": True, "stdout": "", "stderr": "", "exit_code": 0}
        yield mock


@pytest.fixture
def mock_ssh_fail():
    with patch("backend.power.power.execute_command") as mock:
        mock.return_value = {"success": False, "stdout": "", "stderr": "connection refused", "exit_code": -1}
        yield mock


def test_shutdown_success(client, mock_config, mock_ssh_success):
    resp = client.post("/api/power/shutdown", json={"confirm": True})
    assert resp.status_code == 200
    data = resp.json()
    assert "Shutdown initiated" in data["message"]
    assert data["target"] == "192.168.100.50"
    mock_ssh_success.assert_called_once_with(
        "shutdown -h now",
        host="192.168.100.50",
        port=22,
        user="root",
    )


def test_shutdown_no_confirm(client, mock_config):
    resp = client.post("/api/power/shutdown", json={"confirm": False})
    assert resp.status_code == 400


def test_reboot_success(client, mock_config, mock_ssh_success):
    resp = client.post("/api/power/reboot", json={"confirm": True})
    assert resp.status_code == 200
    data = resp.json()
    assert "Reboot initiated" in data["message"]
    mock_ssh_success.assert_called_once_with(
        "shutdown -r now",
        host="192.168.100.50",
        port=22,
        user="root",
    )


def test_reboot_no_confirm(client, mock_config):
    resp = client.post("/api/power/reboot", json={"confirm": False})
    assert resp.status_code == 400


def test_sleep_success(client, mock_config, mock_ssh_success):
    resp = client.post("/api/power/sleep")
    assert resp.status_code == 200
    data = resp.json()
    assert "Sleep initiated" in data["message"]


def test_sleep_fallback(client, mock_config):
    """Sleep tries systemctl first, falls back to pm-suspend."""
    with patch("backend.power.power.execute_command") as mock:
        # First call (systemctl) fails
        mock.side_effect = [
            {"success": False, "stdout": "", "stderr": "systemctl not available", "exit_code": 1},
            {"success": True, "stdout": "", "stderr": "", "exit_code": 0},
        ]
        resp = client.post("/api/power/sleep")
        assert resp.status_code == 200
        assert mock.call_count == 2
        calls = [c[1] for c in mock.call_args_list]
        assert calls[0][0] == "systemctl suspend"
        assert calls[1][0] == "pm-suspend"


def test_sleep_all_fail(client, mock_config):
    with patch("backend.power.power.execute_command") as mock:
        mock.return_value = {"success": False, "stdout": "", "stderr": "failed", "exit_code": 1}
        resp = client.post("/api/power/sleep")
        assert resp.status_code == 500


def test_wake_success(client, mock_config):
    resp = client.post("/api/power/wake")
    assert resp.status_code == 200
    data = resp.json()
    assert "AA:BB:CC:DD:EE:FF" in data["message"] or "WOL" in data["message"]


def test_status_reachable(client, mock_config, mock_ssh_success):
    resp = client.get("/api/power/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["reachable"] is True


def test_status_unreachable(client, mock_config, mock_ssh_fail):
    resp = client.get("/api/power/status")
    assert resp.status_code == 503
    data = resp.json()
    assert "detail" in data
```

- [ ] **Step 2: Run test to verify it fails**

```bash
python -m pytest backend/power/test_power.py -v
```
Expected: FAIL with import errors (old power.py still has subprocess endpoints)

- [ ] **Step 3: Rewrite power.py with SSH-based endpoints**

Replace entire contents of `backend/power/power.py`:
```python
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from backend.power.config import get_target, get_target_mac, get_ssh_timeout, get_ssh_retries
from backend.power.ssh import execute_command

power_app = FastAPI(title="Power Control API")


class PowerCommand(BaseModel):
    confirm: bool = False


@power_app.post("/api/power/shutdown")
def shutdown(cmd: PowerCommand):
    if not cmd.confirm:
        raise HTTPException(status_code=400, detail="Confirm required. Set confirm=true.")
    target = get_target()
    result = execute_command("shutdown -h now", **target)
    if not result["success"]:
        raise HTTPException(status_code=503, detail=result["stderr"])
    return {"message": "Shutdown initiated", "target": target["host"]}


@power_app.post("/api/power/reboot")
def reboot(cmd: PowerCommand):
    if not cmd.confirm:
        raise HTTPException(status_code=400, detail="Confirm required. Set confirm=true.")
    target = get_target()
    result = execute_command("shutdown -r now", **target)
    if not result["success"]:
        raise HTTPException(status_code=503, detail=result["stderr"])
    return {"message": "Reboot initiated", "target": target["host"]}


@power_app.post("/api/power/sleep")
def sleep():
    target = get_target()
    # Try systemctl first, fall back to pm-suspend
    result = execute_command("systemctl suspend", **target)
    if result["success"]:
        return {"message": "Sleep initiated", "target": target["host"]}
    result = execute_command("pm-suspend", **target)
    if result["success"]:
        return {"message": "Sleep initiated", "target": target["host"]}
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
    target = get_target()
    result = execute_command("echo ok", **target)
    if not result["success"]:
        raise HTTPException(status_code=503, detail=result["stderr"])
    return {"reachable": True, "target": target["host"]}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
python -m pytest backend/power/test_power.py -v
```
Expected: PASS (all 11 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/power/power.py backend/power/test_power.py
git commit -m "feat(power): rewrite endpoints to use SSH instead of subprocess"
```

---

### Task 5: Create app.py entrypoint

**Files:**
- Create: `backend/power/app.py`
- Modify: `backend/power/start.sh`

- [ ] **Step 1: Create app.py entrypoint**

Create `backend/power/app.py`:
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.power.power import power_app

app = FastAPI(title="System Manager Power API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://192.168.100.140:4173", "http://192.168.100.140:5173", "http://192.168.100.80:8085", "http://localhost:5173", "http://localhost:8085"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(power_app.router)
```

- [ ] **Step 2: Update start.sh**

Replace `backend/power/start.sh`:
```bash
#!/bin/bash
cd /home/suponer/Documents/Codes/AICodes/system-manager/backend/power/
source ../venv/bin/activate
uvicorn app:app --reload --host 0.0.0.0 --port 8001
```

- [ ] **Step 3: Commit**

```bash
git add backend/power/app.py backend/power/start.sh
git commit -m "feat(power): create app entrypoint with CORS, update start script"
```

---

### Task 6: Create .env template

**Files:**
- Create: `backend/power/.env`
- Modify: `backend/power/.gitignore` (create if needed)
- Modify: `plans/IMPLEMENTATION.md`

- [ ] **Step 1: Create .env file**

Create `backend/power/.env`:
```bash
# Target machine SSH config
TARGETS=192.168.100.50:22:root
TARGET_MAC=AA:BB:CC:DD:EE:FF

# SSH authentication (key preferred, password fallback)
SSH_KEY_PATH=~/.ssh/id_rsa
SSH_PASSWORD=

# SSH connection settings
SSH_TIMEOUT=10
SSH_RETRIES=2
```

- [ ] **Step 2: Create .gitignore for power directory**

Create `backend/power/.gitignore`:
```
.env
__pycache__/
*.pyc
```

- [ ] **Step 3: Update IMPLEMENTATION.md**

Update `plans/IMPLEMENTATION.md` — replace the Power Server section (lines 97-123) with:

```markdown
### Power Server (`backend/power/app.py`, `power.py`, `ssh.py`, `config.py`)

FastAPI app for remote power control via SSH:
- `POST /api/power/shutdown` - Shutdown target (requires `confirm: true`)
- `POST /api/power/reboot` - Reboot target (requires `confirm: true`)
- `POST /api/power/sleep` - Suspend target (tries systemctl, falls back to pm-suspend)
- `POST /api/power/wake` - Wake-on-LAN broadcast
- `GET /api/power/status` - Check target reachability via SSH

**Config:** Targets in `.env` file (`TARGETS=host:port:user`, `TARGET_MAC=...`, SSH keys/password, timeout, retries)

**SSH Execution:** paramiko library, new connection per command, retry on timeout, key or password auth

**Implementation:**
- `config.py`: Parses .env, returns target dict and SSH settings
- `ssh.py`: `connect_ssh()` with retry logic, `execute_command()` returns {success, stdout, stderr, exit_code}
- `power.py`: Endpoints call `execute_command()` via SSH, return error details on failure
- `wake`: Uses `wakeonlan` CLI (no SSH needed), MAC from TARGET_MAC env var
- Error responses: 400 (no confirm), 401 (auth fail), 503 (connection fail), 500 (command fail)
```

- [ ] **Step 4: Commit**

```bash
git add backend/power/.env backend/power/.gitignore plans/IMPLEMENTATION.md
git commit -m "docs: add .env template, update IMPLEMENTATION.md"
```

---

### Task 7: Run all tests

**Files:**
- `backend/power/test_config.py`
- `backend/power/test_ssh.py`
- `backend/power/test_power.py`

- [ ] **Step 1: Run full test suite**

```bash
python -m pytest backend/power/ -v
```
Expected: PASS (all 25 tests across 3 test files)

- [ ] **Step 2: Commit any fixes if needed**

If any tests fail, fix and amend:
```bash
git add backend/power/
git commit -m "fix(power): fix failing tests"
```

---

### Task 8: Update frontend to use power server

**Files:**
- Modify: `frontend/src/components/PowerControls.jsx`
- Modify: `frontend/.env`

- [ ] **Step 1: Update PowerControls to use VITE_POWER_API_URL**

Replace `API_URL` in `frontend/src/components/PowerControls.jsx`:
```javascript
const API_URL = `${import.meta.env.VITE_POWER_API_URL}/api`;
```

- [ ] **Step 2: Add VITE_POWER_API_URL to frontend .env**

Update `frontend/.env`:
```bash
VITE_METRICS_API_URL=http://192.168.100.140:8000
VITE_POWER_API_URL=http://192.168.100.140:8001
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/PowerControls.jsx frontend/.env
git commit -m "feat(frontend): wire PowerControls to separate power server"
```
