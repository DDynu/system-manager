#!/bin/bash
cd /home/suponer/Documents/Codes/system-manager/backend/power/
source ../venv/bin/activate
export PYTHONPATH=/home/suponer/Documents/Codes/system-manager:$PYTHONPATH
uvicorn app:app --reload --host 0.0.0.0 --port 8001
