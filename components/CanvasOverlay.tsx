'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import type { BoundingBox } from '@/lib/WebSocketClient';

interface CanvasOverlayProps {
  videoElement: HTMLVideoElement | null;
  boxes: BoundingBox[];
  currentTimestamp: number;
  detectionTimestamps: Map<number, BoundingBox[]>;
}

export const CanvasOverlay = React.memo(function CanvasOverlay({
  videoElement,
  boxes,
  currentTimestamp,
  detectionTimestamps
}: CanvasOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const videoSizeRef = useRef({ width: 0, height: 0 });

  const drawBoxes = useCallback((ctx: CanvasRenderingContext2D, boxesToDraw: BoundingBox[]) => {
    const canvas = canvasRef.current;
    if (!canvas || !videoElement) return;

    // Clear canvas completely with transparent background
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Only draw if we have boxes
    if (!boxesToDraw || boxesToDraw.length === 0) {
      return;
    }

    // Get video actual dimensions
    const videoWidth = videoElement.videoWidth || videoSizeRef.current.width;
    const videoHeight = videoElement.videoHeight || videoSizeRef.current.height;
    
    // Calculate video rendered size (accounting for object-contain letterboxing)
    const videoAspect = videoWidth / videoHeight;
    const canvasAspect = canvas.width / canvas.height;
    
    let renderedWidth, renderedHeight, offsetX, offsetY;
    
    if (videoAspect > canvasAspect) {
      // Video wider than canvas - letterbox top/bottom
      renderedWidth = canvas.width;
      renderedHeight = canvas.width / videoAspect;
      offsetX = 0;
      offsetY = (canvas.height - renderedHeight) / 2;
    } else {
      // Video taller than canvas - letterbox left/right
      renderedHeight = canvas.height;
      renderedWidth = canvas.height * videoAspect;
      offsetX = (canvas.width - renderedWidth) / 2;
      offsetY = 0;
    }
    
    // Calculate scale factors based on rendered size
    const scaleX = renderedWidth / videoWidth;
    const scaleY = renderedHeight / videoHeight;

    // Draw bounding boxes with scaling and offset
    boxesToDraw.forEach(box => {
      const scaledX = box.x * scaleX + offsetX;
      const scaledY = box.y * scaleY + offsetY;
      const scaledWidth = box.width * scaleX;
      const scaledHeight = box.height * scaleY;

      // Draw rectangle
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);

      // Draw label background
      ctx.fillStyle = '#00ff00';
      const text = `${box.label} ${box.confidence.toFixed(1)}%`;
      const textMetrics = ctx.measureText(text);
      const textHeight = 16;
      ctx.fillRect(scaledX, scaledY - textHeight - 4, textMetrics.width + 8, textHeight + 4);

      // Draw label text
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 12px Arial';
      ctx.fillText(text, scaledX + 4, scaledY - 6);
    });
  }, [videoElement]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !videoElement) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateCanvas = () => {
      // Find the closest detection result for current timestamp (within 50ms tolerance)
      let framesToDraw: BoundingBox[] = [];
      let closestDiff = Infinity;

      detectionTimestamps.forEach((boxArray, timestamp) => {
        const diff = Math.abs(timestamp - currentTimestamp);
        // Only use if closer than 50ms and closer than previous match
        if (diff < 50 && diff < closestDiff) {
          closestDiff = diff;
          framesToDraw = boxArray;
        }
      });

      drawBoxes(ctx, framesToDraw);
      animationFrameRef.current = requestAnimationFrame(updateCanvas);
    };

    animationFrameRef.current = requestAnimationFrame(updateCanvas);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [videoElement, currentTimestamp, detectionTimestamps, drawBoxes]);

  // Handle canvas resizing to match video
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !videoElement) return;

    const handleResize = () => {
      // Store actual video dimensions for scaling calculation
      const videoWidth = videoElement.videoWidth;
      const videoHeight = videoElement.videoHeight;
      
      if (videoWidth && videoHeight) {
        videoSizeRef.current = { width: videoWidth, height: videoHeight };
      }

      // Set canvas display size to match video element's display size
      const displayWidth = videoElement.clientWidth;
      const displayHeight = videoElement.clientHeight;
      
      canvas.width = displayWidth;
      canvas.height = displayHeight;
    };

    // Initial resize
    const timer = setTimeout(handleResize, 100);

    window.addEventListener('resize', handleResize);
    videoElement.addEventListener('loadedmetadata', handleResize);
    videoElement.addEventListener('play', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      videoElement.removeEventListener('loadedmetadata', handleResize);
      videoElement.removeEventListener('play', handleResize);
    };
  }, [videoElement]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full"
      style={{ cursor: 'crosshair' }}
    />
  );
});

CanvasOverlay.displayName = 'CanvasOverlay';
