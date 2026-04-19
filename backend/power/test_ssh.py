import pytest
from unittest.mock import patch, MagicMock
from paramiko.ssh_exception import (
    AuthenticationException,
    SSHException,
)
from socket import timeout as SocketTimeout
from backend.power.ssh import execute_command, connect_ssh


def test_execute_command_success():
    mock_client = MagicMock()
    mock_stdin = MagicMock()
    mock_stdout = MagicMock()
    mock_stderr = MagicMock()
    mock_stdout.read.return_value = b"ok\n"
    mock_stderr.read.return_value = b""
    mock_stdout.channel.recv_exit_status.return_value = 0
    mock_client.exec_command.return_value = (mock_stdin, mock_stdout, mock_stderr)
    mock_client.invoke_shell.return_value = MagicMock()

    with patch("backend.power.ssh.connect_ssh", return_value=mock_client):
        result = execute_command("echo ok", "127.0.0.1", 22, "root")
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
    mock_stdout.read.return_value = b""
    mock_stderr.read.return_value = b"command not found\n"
    mock_stdout.channel.recv_exit_status.return_value = 127
    mock_client.exec_command.return_value = (mock_stdin, mock_stdout, mock_stderr)
    mock_client.invoke_shell.return_value = MagicMock()

    with patch("backend.power.ssh.connect_ssh", return_value=mock_client):
        result = execute_command("badcmd", "127.0.0.1", 22, "root")
        assert result["success"] is False
        assert "command not found" in result["stderr"]


def test_execute_command_connection_refused():
    with patch("backend.power.ssh.connect_ssh", side_effect=ConnectionRefusedError("refused")):
        result = execute_command("echo ok", "127.0.0.1", 22, "root")
        assert result["success"] is False
        assert "connection" in result["stderr"].lower() or "refused" in result["stderr"].lower()


def test_execute_command_auth_failed():
    with patch("backend.power.ssh.connect_ssh", side_effect=AuthenticationException("bad auth")):
        result = execute_command("echo ok", "127.0.0.1", 22, "root")
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
