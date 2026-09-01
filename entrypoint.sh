#!/bin/sh
set -e

cd /app/backend
# Backend listens on loopback only; nginx is the public door
uvicorn app:app --host 127.0.0.1 --port 8000 &

exec nginx -g 'daemon off;'
