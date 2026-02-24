import { useState, useEffect, useRef, useCallback } from "react";
import type { ProgressUpdate } from "../types";

export function useWebSocket(jobId: string | null) {
  const [progress, setProgress] = useState<ProgressUpdate | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number>();

  const connect = useCallback(() => {
    if (!jobId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const ws = new WebSocket(`${protocol}//${host}/ws/progress/${jobId}`);

    ws.onopen = () => setConnected(true);

    ws.onmessage = (event) => {
      const data: ProgressUpdate = JSON.parse(event.data);
      setProgress(data);
    };

    ws.onclose = () => {
      setConnected(false);
      reconnectTimerRef.current = window.setTimeout(connect, 2000);
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  }, [jobId]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      clearTimeout(reconnectTimerRef.current);
    };
  }, [connect]);

  return { progress, connected };
}
