'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VideoPlayer } from '@/components/VideoPlayer';
import { HistoryList } from '@/components/HistoryList';
import { ModelStats, type ModelStatsData } from '@/components/ModelStats';
import WebSocketClient, { type BoundingBox } from '@/lib/WebSocketClient';
import { Activity, History, Video } from 'lucide-react';

interface DetectionResult {
  id: string;
  timestamp: number;
  boxes: BoundingBox[];
}

export default function Home() {
  const [currentTab, setCurrentTab] = useState('detection');
  const [wsClient, setWsClient] = useState<WebSocketClient | null>(null);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [detectionResults, setDetectionResults] = useState<Map<number, BoundingBox[]>>(new Map());
  const [modelStats, setModelStats] = useState<ModelStatsData>({
    fps: 0,
    gpuLoad: 0,
    cpuLoad: 0,
    memoryUsage: 0,
    memoryTotal: 0,
    queueLength: 0,
    isOnline: false,
    lastUpdate: new Date()
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [historyItems, setHistoryItems] = useState<any[]>([]);

  // Initialize WebSocket connection
  useEffect(() => {
    // For demo purposes, create a client but don't connect to a real server
    // In production, replace 'ws://localhost:8000/realtime' with your actual server
    const client = new WebSocketClient('ws://localhost:8000/realtime');

    // Handle detection results
    client.on('detection', (data: any) => {
      const { timestamp, boxes } = data;
      setDetectionResults(prev => new Map(prev).set(timestamp, boxes));
    });

    // Handle model stats
    client.on('stats', (data: ModelStatsData) => {
      setModelStats({ ...data, lastUpdate: new Date() });
    });

    // Handle connection
    client.onConnect(() => {
      setIsWsConnected(true);
      console.log('[App] WebSocket connected');
    });

    // Handle errors
    client.onError((error) => {
      console.error('[App] WebSocket error:', error);
      setIsWsConnected(false);
    });

    setWsClient(client);

    // Attempt connection (will fail in demo, but that's expected)
    client.connect().catch(() => {
      console.log('[App] Demo mode: WebSocket connection unavailable (this is expected)');
    });

    return () => {
      client.disconnect();
    };
  }, []);

  const handleFrameExtracted = useCallback((frameData: string, timestamp: number) => {
    if (wsClient) {
      setIsProcessing(true);
      // Try to send immediately if connected, or queue if not yet connected
      if (wsClient.isConnected()) {
        wsClient.sendFrame(frameData, timestamp, 'current-video');
        console.log('[App] Frame sent immediately (WebSocket connected)');
      } else {
        // Wait for connection to be ready then send
        console.log('[App] WebSocket not connected yet, waiting...');
        const checkInterval = setInterval(() => {
          if (wsClient.isConnected()) {
            wsClient.sendFrame(frameData, timestamp, 'current-video');
            console.log('[App] Frame sent after waiting for connection');
            clearInterval(checkInterval);
          }
        }, 100);
        
        // Timeout after 3 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          console.warn('[App] Failed to send frame - WebSocket connection timeout');
        }, 3000);
      }
    }
  }, [wsClient]);

  const handleViewHistory = (id: string) => {
    console.log('View history item:', id);
    setCurrentTab('detection');
  };

  const handleDeleteHistory = (id: string) => {
    setHistoryItems(prev => prev.filter(item => item.id !== id));
  };

  // Demo: Add sample history items
  useEffect(() => {
    const sampleHistory = [
      {
        id: '1',
        filename: 'street_traffic_01.mp4',
        uploadedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        status: 'done' as const,
        resultCount: 342,
        duration: 45000,
        thumbnail: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2296%22 height=%2296%22%3E%3Crect fill=%22%23333%22 width=%2296%22 height=%2296%22/%3E%3Ctext x=%2248%22 y=%2248%22 fontSize=%2212%22 fill=%22%23666%22 textAnchor=%22middle%22 dominantBaseline=%22middle%22%3Evideo%3C/text%3E%3C/svg%3E'
      },
      {
        id: '2',
        filename: 'crowd_detection_02.mp4',
        uploadedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
        status: 'done' as const,
        resultCount: 512,
        duration: 120000,
        thumbnail: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2296%22 height=%2296%22%3E%3Crect fill=%22%23444%22 width=%2296%22 height=%2296%22/%3E%3Ctext x=%2248%22 y=%2248%22 fontSize=%2212%22 fill=%22%23666%22 textAnchor=%22middle%22 dominantBaseline=%22middle%22%3Evideo%3C/text%3E%3C/svg%3E'
      },
      {
        id: '3',
        filename: 'object_tracking_03.mp4',
        uploadedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        status: 'processing' as const,
        duration: 60000,
        thumbnail: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2296%22 height=%2296%22%3E%3Crect fill=%22%23555%22 width=%2296%22 height=%2296%22/%3E%3Ctext x=%2248%22 y=%2248%22 fontSize=%2212%22 fill=%22%23666%22 textAnchor=%22middle%22 dominantBaseline=%22middle%22%3Evideo%3C/text%3E%3C/svg%3E'
      }
    ];
    setHistoryItems(sampleHistory);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="text-primary" size={32} />
            <h1 className="text-3xl font-bold">Quản trị AI Detection</h1>
          </div>
          <p className="text-muted-foreground">
            Bảng điều khiển phân tích video thời gian thực và giám sát mô hình
          </p>
        </div>
        {/* Main Content */}
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="detection" className="flex items-center gap-2">
              <Video size={16} />
              <span className="hidden sm:inline">Phát hiện video</span>
            </TabsTrigger>
          </TabsList>

          {/* Video Detection Tab */}
          <TabsContent value="detection" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tải lên & xử lý video</CardTitle>
              </CardHeader>
              <CardContent>
                <VideoPlayer
                  onFrameExtracted={handleFrameExtracted}
                  detectionResults={detectionResults}
                  isProcessing={isProcessing}
                  fps={5}
                  onVideoSelected={() => {
                    // Clear old detection results when new video is selected
                    setDetectionResults(new Map());
                    setIsProcessing(false);
                    console.log('[App] New video selected - cleared detection results');
                  }}
                />
              </CardContent>
            </Card>

            {/* Detection Results Summary */}
            {detectionResults.size > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Tổng quan phát hiện</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Tổng số phát hiện</p>
                      <p className="text-2xl font-bold">
                        {Array.from(detectionResults.values()).reduce((sum, boxes) => sum + boxes.length, 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Độ tin cậy trung bình</p>
                      <p className="text-2xl font-bold">
                        {(
                          Array.from(detectionResults.values())
                            .flat()
                            .reduce((sum, box) => sum + box.confidence, 0) /
                          (Array.from(detectionResults.values()).flat().length || 1)
                        ).toFixed(2)}%
                      </p>
                    </div>
                    {/* <div>
                      <p className="text-sm text-muted-foreground">Classes Detected</p>
                      <p className="text-2xl font-bold">
                        {new Set(Array.from(detectionResults.values()).flat().map(b => b.label)).size}
                      </p>
                    </div> */}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

       
        </Tabs>
      </div>
    </div>
  );
}
