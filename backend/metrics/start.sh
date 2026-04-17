#!/bin/bash
cd /home/suponer/Documents/Codes/AICodes/system-manager/backend/metrics/
source ../venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
