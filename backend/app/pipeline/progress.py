from fastapi import WebSocket


class ProgressBroadcaster:
    """
    Manages WebSocket connections per job_id.
    Pipeline steps call broadcast() to push real-time updates.
    """

    def __init__(self):
        self._connections: dict[str, list[WebSocket]] = {}

    async def connect(self, job_id: str, websocket: WebSocket):
        await websocket.accept()
        self._connections.setdefault(job_id, []).append(websocket)

    def disconnect(self, job_id: str, websocket: WebSocket):
        if job_id in self._connections:
            try:
                self._connections[job_id].remove(websocket)
            except ValueError:
                pass
            if not self._connections[job_id]:
                del self._connections[job_id]

    async def broadcast(
        self, job_id: str, progress: float, step: str, detail: str = ""
    ):
        message = {
            "job_id": job_id,
            "progress": progress,
            "step": step,
            "detail": detail,
        }
        if job_id in self._connections:
            dead = []
            for ws in self._connections[job_id]:
                try:
                    await ws.send_json(message)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                try:
                    self._connections[job_id].remove(ws)
                except ValueError:
                    pass
