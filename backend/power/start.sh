#!/bin/bash
source venv/bin/activate
uvicorn power:power_app --reload --host 0.0.0.0 --port 8001
