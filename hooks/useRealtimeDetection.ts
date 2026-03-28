import { useCallback, useEffect, useRef, useState } from 'react';
import WebSocketClient, { type BoundingBox } from '@/lib/WebSocketClient';

const DETECT_INTERVAL_MS = 120;
const FRAME_JPEG_QUALITY = 1;
const MAX_RESULT_ENTRIES = 300;

export function useRealtimeDetection({
  videoRef,
  videoId,
  enabled,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoId: string;
  enabled: boolean;
}) {
  const wsClientRef = useRef<WebSocketClient | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [detectionResults, setDetectionResults] = useState<Map<number, BoundingBox[]>>(new Map());

  const appendDetectionResult = useCallback((timestamp: number, boxes: BoundingBox[]) => {
    if (!Number.isFinite(timestamp)) return;

    setDetectionResults((prev) => {
      const next = new Map(prev);
      const incomingBoxes = boxes || [];
      const existingBoxes = next.get(timestamp) || [];

      // If backend returns empty boxes for the same frame, keep the last non-empty result.
      if (incomingBoxes.length === 0 && existingBoxes.length > 0) {
        return prev;
      }

      next.set(timestamp, incomingBoxes);

      if (next.size > MAX_RESULT_ENTRIES) {
        const oldestTimestamp = next.keys().next().value as number | undefined;
        if (oldestTimestamp !== undefined) {
          next.delete(oldestTimestamp);
        }
      }

      return next;
    });
  }, []);

  const resetDetections = useCallback(() => {
    setDetectionResults(new Map());
  }, []);

  const setSingleDetection = useCallback((timestamp: number, boxes: BoundingBox[]) => {
    setDetectionResults(new Map([[timestamp, boxes || []]]));
  }, []);

  useEffect(() => {
    const client = new WebSocketClient('ws://localhost:8000/realtime');
    const unsubscribe = client.on('detection', (data: any) => {
      const { timestamp, boxes } = data;
      appendDetectionResult(timestamp, boxes);
    });

    client.connect().catch(() => console.log('WS Offline Mode'));
    wsClientRef.current = client;

    return () => {
      unsubscribe();
      client.disconnect();
      wsClientRef.current = null;
    };
  }, [appendDetectionResult]);

  const sendCurrentFrame = useCallback(() => {
    const video = videoRef.current;
    const wsClient = wsClientRef.current;
    if (!video || !wsClient?.isConnected() || !videoId) return;
    if (video.readyState < 2) return;

    const canvas = canvasRef.current || document.createElement('canvas');
    canvasRef.current = canvas;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const ts = Math.floor(video.currentTime * 1000);

    wsClient.sendFrame(canvas.toDataURL('image/jpeg', FRAME_JPEG_QUALITY), ts, videoId);
  }, [videoRef, videoId]);

  useEffect(() => {
    if (!enabled || !videoId) return;

    const timer = setInterval(() => {
      sendCurrentFrame();
    }, DETECT_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [enabled, videoId, sendCurrentFrame]);

  return {
    detectionResults,
    appendDetectionResult,
    resetDetections,
    setSingleDetection,
  };
}
