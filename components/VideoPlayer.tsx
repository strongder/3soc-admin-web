'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { CanvasOverlay } from '@/components/CanvasOverlay';
import type { BoundingBox } from '@/lib/WebSocketClient';
import { Play, Pause, Upload } from 'lucide-react';

interface VideoPlayerProps {
  onFrameExtracted?: (frameData: string, timestamp: number) => void;
  detectionResults?: Map<number, BoundingBox[]>;
  isProcessing?: boolean;
  fps?: number; // Optional: set target FPS (default 10)
  onVideoSelected?: () => void; // Callback when new video is selected
}

export const VideoPlayer = React.memo(function VideoPlayer({
  onFrameExtracted,
  detectionResults = new Map(),
  isProcessing = false,
  fps = 5,
  onVideoSelected
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimestamp, setCurrentTimestamp] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const lastFrameTimestampRef = useRef<number>(0);
  
  // Calculate frame interval in ms: 1000ms / fps
  const frameIntervalMs = 1000 / fps;

  const extractFrame = useCallback((timestamp: number) => {
    const video = videoRef.current;
    if (!video) return;

    // Only extract frame every frameIntervalMs
    if (timestamp - lastFrameTimestampRef.current < frameIntervalMs) {
      return;
    }

    lastFrameTimestampRef.current = timestamp;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const frameData = canvas.toDataURL('image/jpeg', 0.8);

    onFrameExtracted?.(frameData, timestamp);
  }, [onFrameExtracted, frameIntervalMs]);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      // Reset states first
      setIsPlaying(false);
      setCurrentTimestamp(0);
      setSelectedFile(file);
      
      const url = URL.createObjectURL(file);
      if (videoRef.current) {
        // Pause and reset current video
        videoRef.current.pause();
        videoRef.current.src = url;
        videoRef.current.currentTime = 0;
        videoRef.current.load(); // Force reload
      }
      onVideoSelected?.();
      extractAllFrames(url);
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isPlaying) return;

    let frameId: number;
    const updateTimestamp = () => {
      setCurrentTimestamp(video.currentTime * 1000); // Convert to ms
      frameId = requestAnimationFrame(updateTimestamp);
    };

    frameId = requestAnimationFrame(updateTimestamp);

    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [isPlaying]);

  // Handle video events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    
    const handleLoadedMetadata = () => {
      setVideoDuration(video.duration * 1000);
      // Note: extraction now happens in background via hidden video
    };
    
    const handleTimeUpdate = () => setCurrentTimestamp(video.currentTime * 1000);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [onFrameExtracted]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / 60000) % 60);
    const hours = Math.floor(ms / 3600000);
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Extract all frames at regular intervals when video loads
  const extractAllFrames = useCallback(async (videoSrc: string) => {
    if (!onFrameExtracted) return;

    console.log('[VideoPlayer] Starting frame extraction in background...');

    // Create a hidden video element for extraction (không dùng video chính)
    const hiddenVideo = document.createElement('video');
    hiddenVideo.src = videoSrc;
    hiddenVideo.crossOrigin = 'anonymous';
    hiddenVideo.muted = true;
    hiddenVideo.style.display = 'none';
    document.body.appendChild(hiddenVideo);

    // Wait for metadata to load
    await new Promise<void>((resolve) => {
      hiddenVideo.addEventListener('loadedmetadata', () => resolve(), { once: true });
    });

    const frameInterval = 220; // Extract every 200ms (5 frames/second)
    const duration = hiddenVideo.duration * 1000; // Convert to ms
    const timestamps: number[] = [];

    // Generate timestamp array
    for (let t = 0; t <= duration; t += frameInterval) {
      timestamps.push(t);
    }

    console.log(`[VideoPlayer] Extracting ${timestamps.length} frames in background...`);

    // Extract frames sequentially using hidden video
    for (let i = 0; i < timestamps.length; i++) {
      const ts = timestamps[i];

      await new Promise<void>((resolve) => {
        // Seek to timestamp on hidden video
        hiddenVideo.currentTime = ts / 1000;

        const handleSeeked = () => {
          hiddenVideo.removeEventListener('seeked', handleSeeked);

          try {
            const canvas = document.createElement('canvas');
            canvas.width = hiddenVideo.videoWidth;
            canvas.height = hiddenVideo.videoHeight;
            const ctx = canvas.getContext('2d');

            if (ctx) {
              ctx.drawImage(hiddenVideo, 0, 0);
              const frameData = canvas.toDataURL('image/jpeg', 0.5);
              onFrameExtracted(frameData, ts);
              console.log(`[VideoPlayer] Extracted frame ${i + 1}/${timestamps.length} at ${ts}ms`);
            }
          } catch (error) {
            console.error(`[VideoPlayer] Failed to extract frame at ${ts}ms:`, error);
          }

          setTimeout(resolve, 30);
        };

        hiddenVideo.addEventListener('seeked', handleSeeked, { once: true });
      });
    }

    // Cleanup: remove hidden video
    document.body.removeChild(hiddenVideo);
    console.log('[VideoPlayer] ✓ All frames extracted!');
  }, [onFrameExtracted]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <label htmlFor="video-upload">
          <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg cursor-pointer hover:bg-primary/90">
            <Upload size={20} />
            <span>Upload Video</span>
          </div>
          <input
            id="video-upload"
            type="file"
            accept="video/mp4"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
        {selectedFile && (
          <span className="text-sm text-muted-foreground">{selectedFile.name}</span>
        )}
      </div>

      <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ height: '600px' }}>
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          crossOrigin="anonymous"
        />
        <CanvasOverlay
          videoElement={videoRef.current}
          boxes={Array.from(detectionResults.values()).flat()}
          currentTimestamp={currentTimestamp}
          detectionTimestamps={detectionResults}
        />
      </div>

      <div className="space-y-2">
        {/* Timeline Progress Bar */}
        {selectedFile && (
          <div className="w-full">
            <input
              type="range"
              min="0"
              max={videoDuration || 100}
              value={currentTimestamp}
              onChange={(e) => {
                const video = videoRef.current;
                if (video) {
                  const newTime = Number(e.target.value);
                  video.currentTime = newTime / 1000;
                  setCurrentTimestamp(newTime);
                }
              }}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #6b7280 0%, #6b7280 ${(currentTimestamp / videoDuration) * 100}%, #e5e7eb ${(currentTimestamp / videoDuration) * 100}%, #e5e7eb 100%)`
              }}
            />
          </div>
        )}

        <div className="flex gap-2 items-center">
          <Button
            onClick={handlePlayPause}
            size="sm"
            variant="outline"
            disabled={!selectedFile}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            {isPlaying ? 'Pause' : 'Play'}
          </Button>
          <span className="text-sm text-muted-foreground">
            {formatTime(currentTimestamp)} / {formatTime(videoDuration)}
          </span>
          {isProcessing && (
            <span className="text-sm text-amber-500 ml-auto animate-pulse">
              Processing...
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

VideoPlayer.displayName = 'VideoPlayer';
