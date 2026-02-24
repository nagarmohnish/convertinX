from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.dependencies import get_broadcaster

router = APIRouter()


@router.websocket("/ws/progress/{job_id}")
async def websocket_progress(websocket: WebSocket, job_id: str):
    """WebSocket endpoint for real-time job progress updates."""
    broadcaster = get_broadcaster()
    await broadcaster.connect(job_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        broadcaster.disconnect(job_id, websocket)
