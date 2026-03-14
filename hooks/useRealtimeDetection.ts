import { useCallback, useEffect, useRef, useState } from 'react';
import WebSocketClient, { type BoundingBox } from '@/lib/WebSocketClient';

const DETECT_INTERVAL_MS = 200;
const FRAME_JPEG_QUALITY = 0.6;

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
  const [detectionResults, setDetectionResults] = useState<Map<number, BoundingBox[]>>(new Map());

  const appendDetectionResult = useCallback((timestamp: number, boxes: BoundingBox[]) => {
    setDetectionResults((prev) => {
      const next = new Map(prev);
      next.set(timestamp, boxes || []);
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

    const canvas = document.createElement('canvas');
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
