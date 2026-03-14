import { useCallback, useEffect, useRef, useState } from 'react';
import type { BoundingBox } from '@/lib/WebSocketClient';

export type ViolationFrame = {
  frame_number: number;
  timestamp: number;
  image_path: string;
  detections: BoundingBox[];
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const BACKEND_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '');

export function useViolationSSE({
  videoId,
  enabled,
  onViolation,
}: {
  videoId: string;
  enabled: boolean;
  onViolation?: (violation: ViolationFrame) => void;
}) {
  const sseRef = useRef<EventSource | null>(null);
  const onViolationRef = useRef<typeof onViolation>(onViolation);
  const [violationFrames, setViolationFrames] = useState<ViolationFrame[]>([]);

  useEffect(() => {
    onViolationRef.current = onViolation;
  }, [onViolation]);

  const appendViolation = useCallback((violation: ViolationFrame) => {
    setViolationFrames((prev) => {
      const exists = prev.some(
        (item) => item.frame_number === violation.frame_number && item.timestamp === violation.timestamp
      );
      if (exists) return prev;
      return [...prev, violation].sort((a, b) => a.timestamp - b.timestamp);
    });
  }, []);

  const resetViolations = useCallback(() => {
    setViolationFrames([]);
  }, []);

  useEffect(() => {
    if (!enabled || !videoId) return;

    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }

    const es = new EventSource(`${BACKEND_BASE_URL}/file-stream/${videoId}`);
    sseRef.current = es;

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type !== 'violation' || !payload.data) return;

        const violation = payload.data as ViolationFrame;
        appendViolation(violation);
        onViolationRef.current?.(violation);
      } catch (error) {
        console.error('[SSE] Invalid payload:', error);
      }
    };

    es.onerror = () => {
      console.warn('[SSE] Stream disconnected, waiting for auto-reconnect...');
    };

    return () => {
      es.close();
      if (sseRef.current === es) {
        sseRef.current = null;
      }
    };
  }, [enabled, videoId, appendViolation]);

  useEffect(() => {
    return () => {
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
    };
  }, []);

  return {
    violationFrames,
    resetViolations,
  };
}
