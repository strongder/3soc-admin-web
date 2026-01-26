# AI Detection Admin Dashboard

A professional web admin dashboard for real-time video analysis and AI model monitoring. Built with React, Next.js, TailwindCSS, and shadcn/ui.

## 🎯 Features

### Video Detection
- **Video Upload**: Support for MP4 video files
- **Real-time Frame Extraction**: Captures frames at 30 FPS during playback
- **WebSocket Communication**: Streams frames to AI server for real-time detection
- **Canvas Overlay**: Renders bounding boxes and labels directly on video
- **Timestamp Synchronization**: Ensures frame sync with video playback

### History Management
- **Detection History**: Browse all processed videos
- **Status Tracking**: View processing status (done, processing, error)
- **Video Thumbnails**: Quick preview of processed videos
- **Detection Statistics**: View number of detections and duration
- **Batch Operations**: Delete or view results of processed videos

### Model Monitoring
- **Real-time Metrics**: FPS, GPU/CPU load, memory usage
- **Server Status**: Live connection status indicator
- **Queue Monitoring**: Track pending frame processing queue
- **System Alerts**: Warning indicators for high resource usage
- **WebSocket Updates**: Live stats refresh from AI server

## 🏗️ Project Structure

```
/
├── app/
│   ├── layout.tsx           # Root layout with metadata
│   ├── page.tsx             # Main dashboard page
│   └── globals.css          # Global styles
├── components/
│   ├── VideoPlayer.tsx      # Video upload and playback
│   ├── CanvasOverlay.tsx    # Bounding box overlay renderer
│   ├── HistoryList.tsx      # Detection history display
│   ├── ModelStats.tsx       # Server monitoring dashboard
│   └── ui/                  # shadcn/ui components
├── lib/
│   ├── WebSocketClient.ts   # WebSocket client for real-time communication
│   └── utils.ts             # Utility functions
└── README.md                # This file
```

## 🔧 Technology Stack

- **Frontend**: React 19.2 + Next.js 16
- **Styling**: TailwindCSS v4 + shadcn/ui
- **State Management**: React hooks (useState, useEffect, useCallback)
- **Real-time Communication**: WebSocket API
- **Video Processing**: HTML5 Canvas + Video API
- **Icons**: Lucide React

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

1. **Install Dependencies**
```bash
npm install
```

2. **Run Development Server**
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

3. **Build for Production**
```bash
npm run build
npm start
```

## 📡 Server Integration

### WebSocket Server Setup

The dashboard expects a WebSocket server running at `ws://localhost:8000/realtime`. 

#### Expected API Format

**Client → Server: Frame Data**
```json
{
  "type": "frame",
  "frameData": "data:image/jpeg;base64,...",
  "timestamp": 1234567890,
  "videoId": "current-video"
}
```

**Server → Client: Detection Results**
```json
{
  "type": "detection",
  "timestamp": 1234567890,
  "boxes": [
    {
      "x": 100,
      "y": 150,
      "width": 200,
      "height": 250,
      "label": "person",
      "confidence": 0.95
    }
  ]
}
```

**Server → Client: Model Stats**
```json
{
  "type": "stats",
  "fps": 30,
  "gpuLoad": 45.5,
  "cpuLoad": 35.2,
  "memoryUsage": 2048,
  "memoryTotal": 8192,
  "queueLength": 5,
  "isOnline": true
}
```

#### REST API Endpoints

```
POST /upload-video           # Upload video file
GET  /history               # Get list of processed videos
GET  /history/:id           # Get specific detection results
DELETE /history/:id         # Delete detection record
```

## 📝 Component Documentation

### VideoPlayer Component

Handles video upload and playback with frame extraction.

**Props:**
- `onFrameExtracted?: (frameData: string, timestamp: number) => void` - Callback when frame is captured
- `detectionResults?: Map<number, BoundingBox[]>` - Map of timestamp to detection results
- `isProcessing?: boolean` - Show processing indicator

**Features:**
- Drag-and-drop or click to upload MP4
- Play/pause controls
- Real-time timestamp display
- 30 FPS frame extraction during playback

### CanvasOverlay Component

Renders bounding boxes and labels on canvas overlaid on video.

**Props:**
- `videoElement: HTMLVideoElement | null` - Reference to video element
- `boxes: BoundingBox[]` - Array of bounding boxes to draw
- `currentTimestamp: number` - Current playback timestamp (ms)
- `detectionTimestamps: Map<number, BoundingBox[]>` - Map of frame timestamps to results

**Features:**
- Auto-scales canvas to match video size
- Smooth animation rendering
- Timestamp-based frame sync
- Green bounding boxes with labels and confidence scores

### HistoryList Component

Displays list of processed videos with filtering and sorting.

**Props:**
- `items?: HistoryItem[]` - Array of history items
- `onView?: (id: string) => void` - Callback when view button clicked
- `onDelete?: (id: string) => void` - Callback when delete button clicked
- `isLoading?: boolean` - Show loading state

**Features:**
- Sort by date or filename
- Status badges (processing/done/error)
- Video thumbnails
- Detection count and duration display

### ModelStats Component

Real-time monitoring dashboard for AI server performance.

**Props:**
- `stats?: ModelStatsData` - Current stats data
- `isConnected?: boolean` - WebSocket connection status

**Features:**
- Real-time FPS, GPU/CPU, memory display
- System alerts for high resource usage
- Connection status indicator
- Memory usage progress bar

### WebSocketClient Class

Handles WebSocket communication with AI server.

**Methods:**
- `connect()` - Establish connection
- `send(type: string, data: any)` - Send message
- `sendFrame(frameData, timestamp, videoId)` - Send video frame
- `on(type: string, handler)` - Subscribe to message type
- `disconnect()` - Close connection
- `isConnected()` - Check connection status

**Auto-reconnect:** Automatically attempts to reconnect up to 5 times with 3-second delay.

## 🎨 Styling & Theme

The dashboard uses TailwindCSS v4 with a professional color scheme:
- **Primary**: Professional gray/black
- **Accents**: Green (success), Amber (warning), Red (error)
- **Dark Mode**: Full dark mode support with system preference detection

Customize colors in `/app/globals.css` by modifying CSS variables.

## 📊 Demo Mode

The dashboard includes demo mode for testing without a real server:
- Sample detection history with 3 video records
- Mock model stats updating every second
- Connection status indicator showing unavailable server
- All UI elements fully functional

## 🔐 Security Considerations

- **CORS**: Configure your WebSocket server to accept connections from your domain
- **Input Validation**: Frame data is base64 encoded, validated before sending
- **Error Handling**: Graceful error handling with user feedback
- **Connection Security**: Use `wss://` for production (secure WebSocket)

## 🚨 Troubleshooting

### WebSocket Connection Fails
1. Ensure AI server is running on `ws://localhost:8000/realtime`
2. Check CORS configuration on server
3. Check browser console for detailed error messages
4. For production, update WebSocket URL in `/app/page.tsx`

### Frames Not Processing
1. Verify video element is loaded
2. Check browser console for frame extraction errors
3. Ensure WebSocket connection is established
4. Verify frameData is properly encoded as base64

### Canvas Not Showing Boxes
1. Check detectionResults data in browser DevTools
2. Verify timestamp synchronization (should be within 100ms)
3. Ensure BoundingBox coordinates are valid
4. Check canvas is properly overlaid on video

### Performance Issues
1. Reduce frame extraction rate (currently 30 FPS)
2. Check GPU/CPU load in Model Stats
3. Monitor memory usage
4. Consider video resolution reduction

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TailwindCSS Documentation](https://tailwindcss.com)
- [shadcn/ui Components](https://ui.shadcn.com)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

## 📄 License

Created with v0 by Vercel
