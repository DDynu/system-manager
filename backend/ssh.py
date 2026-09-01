import paramiko
from paramiko.ssh_exception import (
    AuthenticationException,
    SSHException,
)
from socket import timeout as SocketTimeout


def connect_ssh(host, port, user, key_path="", password="", timeout=10, retries=1):
    """Connect to the target host via SSH with retry logic."""
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    last_err = None
    for attempt in range(retries + 1):
        try:
            if key_path:
                client.load_key(key_path)
                client.connect(
                    hostname=host,
                    port=port,
                    username=user,
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
        except AuthenticationException:
            raise
        except SSHException as e:
            last_err = e
            continue

    raise last_err


def execute_command(command, host, port, user, key_path="", password="", timeout=10, retries=1):
    """Execute a command on the target host via SSH.

    Returns dict with keys: success, stdout, stderr, exit_code
    """
    client = None
    try:
        client = connect_ssh(host, port, user, key_path, password, timeout, retries)
        stdin, stdout, stderr = client.exec_command(command)
        stdout.channel.settimeout(timeout)
        output = stdout.read().decode()
        errput = stderr.read().decode()
        exit_code = stdout.channel.recv_exit_status()
        return {
            "success": exit_code == 0,
            "stdout": output,
            "stderr": errput,
            "exit_code": exit_code,
        }
    except AuthenticationException:
        return {
            "success": False,
            "stdout": "",
            "stderr": "SSH authentication failed",
            "exit_code": -1,
        }
    except (ConnectionRefusedError, OSError) as e:
        return {
            "success": False,
            "stdout": "",
            "stderr": f"SSH connection failed: {e}",
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
