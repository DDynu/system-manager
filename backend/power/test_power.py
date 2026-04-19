import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from backend.power.power import power_app


@pytest.fixture
def client():
    return TestClient(power_app)


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
        key_path="",
        password="",
        timeout=10,
        retries=2,
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
        key_path="",
        password="",
        timeout=10,
        retries=2,
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
        mock.side_effect = [
            {"success": False, "stdout": "", "stderr": "systemctl not available", "exit_code": 1},
            {"success": True, "stdout": "", "stderr": "", "exit_code": 0},
        ]
        resp = client.post("/api/power/sleep")
        assert resp.status_code == 200
        assert mock.call_count == 2
        calls = [c[1] for c in mock.call_args_list]
        assert calls[0]["host"] == "192.168.100.50"
        assert calls[0]["port"] == 22
        assert calls[0]["user"] == "root"
        # verify command argument
        assert mock.call_args_list[0][0][0] == "systemctl suspend"
        assert mock.call_args_list[1][0][0] == "pm-suspend"


def test_sleep_all_fail(client, mock_config):
    with patch("backend.power.power.execute_command") as mock:
        mock.return_value = {"success": False, "stdout": "", "stderr": "failed", "exit_code": 1}
        resp = client.post("/api/power/sleep")
        assert resp.status_code == 500


def test_wake_success(client, mock_config):
    with patch("subprocess.run") as mock_run:
        mock_run.return_value = None
        resp = client.post("/api/power/wake")
        assert resp.status_code == 200
        data = resp.json()
        assert "AA:BB:CC:DD:EE:FF" in data["message"]


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


def test_shutdown_no_confirm_field(client, mock_config):
    """Sending no confirm field defaults to False."""
    resp = client.post("/api/power/shutdown", json={})
    assert resp.status_code == 400


def test_wake_no_mac(client, mock_config):
    """Wake returns 400 when TARGET_MAC is not configured."""
    with patch("backend.power.power.get_target_mac", return_value=""):
        resp = client.post("/api/power/wake")
        assert resp.status_code == 400


def test_wake_no_binary(client, mock_config):
    """Wake returns 500 when wakeonlan binary is missing."""
    with patch("subprocess.run", side_effect=FileNotFoundError()):
        resp = client.post("/api/power/wake")
        assert resp.status_code == 500
        assert "wakeonlan command not found" in resp.json()["detail"]
