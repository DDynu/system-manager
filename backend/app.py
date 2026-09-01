import os

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path

_env_path = Path(__file__).parent / ".env"
if _env_path.exists():
    load_dotenv(_env_path)

from config import get_allowed_origins, get_allowed_ws_origins
from metrics import router
from power import router as power_router

app = FastAPI(title="System Manager API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins() or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(power_router)

WS_ORIGINS = get_allowed_ws_origins()


def check_ws_origin(origin: str) -> bool:
    if not origin:
        return False
    if not WS_ORIGINS:
        return True
    # Normalize ws/wss to http so either scheme in the allowlist works
    normalized = origin.replace("ws://", "http://").replace("wss://", "http://")
    return normalized in WS_ORIGINS or origin in WS_ORIGINS


@app.websocket("/ws/status")
async def websocket_status(websocket: WebSocket):
    # The socket carries no messages. The frontend treats a close
    # as "target went offline", so it only matters that the server
    # process is alive to keep it open.
    origin = websocket.headers.get("origin", "")
    if not check_ws_origin(origin):
        await websocket.close(code=403)
        return
    await websocket.accept()
    try:
        while True:
            await websocket.receive_text()
    except Exception:
        pass


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
