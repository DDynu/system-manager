# System Manager Backend - Plan

## Goals
- Provide API endpoints for metrics collection
- Handle power control commands (shutdown, reboot, sleep, wake)
- Serve PC status (online/offline, hostname)

## Tech Stack Options

### Option 1: Node.js + Express
- `express` - Web framework
- `child_process` - Execute system commands
- `os` - System information
- Pros: Same language as frontend, easy setup

### Option 2: Python + FastAPI
- `fastapi` - Async web framework
- `psutil` - System metrics
- `subprocess` - System commands
- Pros: Better for system administration tasks

### Option 3: Go
- `net/http` - Standard library
- `github.com/shirou/gopsutil` - System metrics
- Pros: Compiled, single binary, high performance

## API Endpoints

### GET /api/metrics
Returns current system metrics:
```json
{
  "cpu": 45,
  "memory": {
    "used": 12.4,
    "total": 32,
    "percent": 39
  },
  "disk": {
    "used": 245,
    "total": 1000,
    "percent": 25
  },
  "uptime": "14d 3h",
  "temperature": 62,
  "network": {
    "rx": 45.2,
    "tx": 12.5
  }
}
```

### POST /api/power/shutdown
Shutdown the system

### POST /api/power/reboot
Reboot the system

### POST /api/power/sleep
Put system to sleep

### POST /api/power/wake
Wake system (WOL - requires MAC address)

### GET /api/status
Return PC status:
```json
{
  "hostname": "Desktop-PC",
  "status": "Online"
}
```

## Implementation Steps

1. Initialize backend project
2. Set up Express/FastAPI server
3. Implement metrics endpoint
4. Implement power control endpoints
5. Add authentication (optional but recommended)
6. Test locally
7. Deploy

## Security Considerations
- Power commands require authentication
- Rate limiting on endpoints
- CORS configuration for frontend communication
