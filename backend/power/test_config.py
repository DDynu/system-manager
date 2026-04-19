import os
import pytest

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


def test_parse_target(monkeypatch):
    monkeypatch.setenv("TARGETS", "192.168.100.50:22:root")
    from backend.power.config import get_target
    target = get_target()
    assert target["host"] == "192.168.100.50"
    assert target["port"] == 22
    assert target["user"] == "root"


def test_parse_target_mac(monkeypatch):
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
