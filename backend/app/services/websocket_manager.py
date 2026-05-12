import json
from typing import Dict, Set
from fastapi import WebSocket


class WebSocketManager:
    def __init__(self):
        self.connections: Dict[int, Set[WebSocket]] = {}  # match_id -> set of sockets

    async def connect(self, match_id: int, ws: WebSocket):
        await ws.accept()
        self.connections.setdefault(match_id, set()).add(ws)

    def disconnect(self, match_id: int, ws: WebSocket):
        if match_id in self.connections:
            self.connections[match_id].discard(ws)

    async def broadcast(self, match_id: int, payload: dict):
        dead = set()
        for ws in self.connections.get(match_id, set()):
            try:
                await ws.send_text(json.dumps(payload))
            except Exception:
                dead.add(ws)
        for ws in dead:
            self.connections[match_id].discard(ws)

    async def send_personal(self, ws: WebSocket, payload: dict):
        try:
            await ws.send_text(json.dumps(payload))
        except Exception:
            pass


ws_manager = WebSocketManager()
