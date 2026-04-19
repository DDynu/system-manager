from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.power.power import power_app

app = FastAPI(title="System Manager Power API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://192.168.100.140:4173",
        "http://192.168.100.140:5173",
        "http://192.168.100.80:8085",
        "http://localhost:5173",
        "http://localhost:8085",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(power_app.router)
