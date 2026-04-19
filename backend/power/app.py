import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.power.power import power_app

app = FastAPI(title="System Manager Power API")

allow_origins = os.getenv("CORS_ALLOW_ORIGINS", "http://192.168.100.140:5173,http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(power_app.router)
