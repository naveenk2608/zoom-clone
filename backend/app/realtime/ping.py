"""Temporary echo endpoint that proves WebSockets work end to end. Removed in Phase 5."""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()


@router.websocket("/ws/ping")
async def ping(websocket: WebSocket) -> None:
    await websocket.accept()
    try:
        while True:
            message = await websocket.receive_text()
            await websocket.send_text(message)
    except WebSocketDisconnect:
        pass  # The client closed the connection; there is nothing to clean up.
