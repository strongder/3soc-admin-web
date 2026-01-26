# AI Detection Server Setup Guide

This guide shows how to set up a Node.js WebSocket server for the AI Detection Admin Dashboard.

## 🏗️ Basic Server Implementation (Node.js + Express + ws)

### 1. Install Dependencies

```bash
npm init -y
npm install express ws cors body-parser uuid
npm install --save-dev nodemon
```

### 2. Create Server File

Create `server.js`:

```javascript
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));

// Storage for uploaded videos and results
const videosDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(videosDir)) {
  fs.mkdirSync(videosDir, { recursive: true });
}

// Store active client connections and processing status
const activeConnections = new Map();
const processingQueue = [];
let queueLength = 0;

// Mock AI detection function - Replace with actual ML model
async function runDetection(frameData) {
  // Simulate detection processing time
  await new Promise(resolve => setTimeout(resolve, 50));

  // Mock detection results
  const detections = [];
  
  // Randomly generate detections for demo
  if (Math.random() > 0.3) {
    detections.push({
      x: Math.random() * 640,
      y: Math.random() * 480,
      width: 100 + Math.random() * 200,
      height: 100 + Math.random() * 200,
      label: ['person', 'car', 'dog', 'bicycle'][Math.floor(Math.random() * 4)],
      confidence: 0.7 + Math.random() * 0.3
    });
  }

  return detections;
}

// Mock system stats function - Replace with actual system monitoring
function getSystemStats() {
  return {
    fps: 28 + Math.random() * 4,
    gpuLoad: Math.random() * 100,
    cpuLoad: Math.random() * 100,
    memoryUsage: 2048 + Math.random() * 2048,
    memoryTotal: 8192,
    queueLength: processingQueue.length,
    isOnline: true
  };
}

// WebSocket message handling
wss.on('connection', (ws) => {
  const clientId = uuidv4();
  activeConnections.set(clientId, {
    ws,
    connectedAt: new Date(),
    framesProcessed: 0
  });

  console.log(`[${new Date().toLocaleTimeString()}] Client connected: ${clientId}`);
  console.log(`Active connections: ${activeConnections.size}`);

  // Send initial welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    clientId,
    message: 'Connected to AI Detection Server'
  }));

  // Handle incoming messages
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'frame':
          await handleFrameMessage(ws, message, clientId);
          break;

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;

        default:
          console.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Error processing request'
      }));
    }
  });

  // Handle client disconnect
  ws.on('close', () => {
    activeConnections.delete(clientId);
    console.log(`[${new Date().toLocaleTimeString()}] Client disconnected: ${clientId}`);
    console.log(`Active connections: ${activeConnections.size}`);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Handle frame data and run detection
async function handleFrameMessage(ws, message, clientId) {
  const { frameData, timestamp, videoId } = message;

  try {
    // Add to processing queue
    queueLength++;

    // Run detection on frame
    const boxes = await runDetection(frameData);
    queueLength--;

    // Update client stats
    const client = activeConnections.get(clientId);
    if (client) {
      client.framesProcessed++;
    }

    // Send detection results back to client
    ws.send(JSON.stringify({
      type: 'detection',
      timestamp,
      videoId,
      boxes
    }));

    // Broadcast stats to all connected clients
    broadcastStats();
  } catch (error) {
    console.error('Detection error:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Detection processing failed'
    }));
  }
}

// Broadcast system stats to all connected clients
function broadcastStats() {
  const stats = getSystemStats();

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'stats',
        ...stats
      }));
    }
  });
}

// REST API Routes

// Upload video file
app.post('/upload-video', (req, res) => {
  try {
    const videoId = uuidv4();
    res.json({
      success: true,
      videoId,
      message: 'Video upload endpoint - implement multipart file handling'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get history of processed videos
app.get('/history', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: '1',
        filename: 'sample_video_1.mp4',
        uploadedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        status: 'done',
        resultCount: 342,
        duration: 45000
      },
      {
        id: '2',
        filename: 'sample_video_2.mp4',
        uploadedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
        status: 'done',
        resultCount: 512,
        duration: 120000
      }
    ]
  });
});

// Get specific detection results
app.get('/history/:id', (req, res) => {
  res.json({
    success: true,
    data: {
      id: req.params.id,
      results: []
    }
  });
});

// Delete video record
app.delete('/history/:id', (req, res) => {
  res.json({
    success: true,
    message: 'Video deleted'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    activeConnections: activeConnections.size,
    stats: getSystemStats()
  });
});

// Server info
app.get('/info', (req, res) => {
  res.json({
    name: 'AI Detection Server',
    version: '1.0.0',
    endpoints: {
      websocket: 'ws://localhost:8000/realtime',
      rest: {
        health: 'GET /health',
        history: 'GET /history',
        upload: 'POST /upload-video',
        delete: 'DELETE /history/:id'
      }
    }
  });
});

// Broadcast stats periodically
setInterval(() => {
  broadcastStats();
}, 1000); // Update every 1 second

// Start server
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket available at ws://localhost:${PORT}/realtime`);
  console.log(`📊 Health check at http://localhost:${PORT}/health`);
});
```

### 3. Update package.json Scripts

```json
{
  "scripts": {
    "dev": "nodemon server.js",
    "start": "node server.js"
  }
}
```

### 4. Run the Server

```bash
npm run dev
```

## 🐍 Python Server Implementation (FastAPI + WebSocket)

If you prefer Python, here's a FastAPI implementation:

```python
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import asyncio
import json
import uuid
from datetime import datetime
import base64
from io import BytesIO
from PIL import Image

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket

    def disconnect(self, client_id: str):
        del self.active_connections[client_id]

    async def broadcast(self, message: dict):
        for connection in self.active_connections.values():
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()
queue_length = 0

# Mock AI detection function
async def run_detection(frame_data: str) -> list:
    """Mock detection - replace with actual ML model"""
    await asyncio.sleep(0.05)  # Simulate processing
    
    import random
    detections = []
    if random.random() > 0.3:
        detections.append({
            "x": random.random() * 640,
            "y": random.random() * 480,
            "width": 100 + random.random() * 200,
            "height": 100 + random.random() * 200,
            "label": random.choice(["person", "car", "dog", "bicycle"]),
            "confidence": 0.7 + random.random() * 0.3
        })
    return detections

# Mock system stats
def get_system_stats() -> dict:
    import random
    import psutil
    
    cpu_percent = psutil.cpu_percent(interval=1)
    memory = psutil.virtual_memory()
    
    return {
        "fps": 28 + random.random() * 4,
        "gpuLoad": random.random() * 100,
        "cpuLoad": cpu_percent,
        "memoryUsage": memory.used / (1024 * 1024),
        "memoryTotal": memory.total / (1024 * 1024),
        "queueLength": queue_length,
        "isOnline": True
    }

# WebSocket endpoint
@app.websocket("/realtime")
async def websocket_endpoint(websocket: WebSocket):
    client_id = str(uuid.uuid4())
    await manager.connect(websocket, client_id)
    
    print(f"Client connected: {client_id}")
    
    try:
        await websocket.send_json({
            "type": "connected",
            "clientId": client_id,
            "message": "Connected to AI Detection Server"
        })

        while True:
            data = await websocket.receive_json()
            
            if data["type"] == "frame":
                global queue_length
                queue_length += 1
                
                boxes = await run_detection(data["frameData"])
                queue_length -= 1
                
                await websocket.send_json({
                    "type": "detection",
                    "timestamp": data["timestamp"],
                    "videoId": data.get("videoId"),
                    "boxes": boxes
                })
                
                await manager.broadcast({
                    "type": "stats",
                    **get_system_stats()
                })

            elif data["type"] == "ping":
                await websocket.send_json({
                    "type": "pong",
                    "timestamp": int(datetime.now().timestamp() * 1000)
                })

    except WebSocketDisconnect:
        manager.disconnect(client_id)
        print(f"Client disconnected: {client_id}")

# REST API endpoints
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "timestamp": datetime.now(),
        "activeConnections": len(manager.active_connections),
        "stats": get_system_stats()
    }

@app.get("/history")
async def get_history():
    return {
        "success": True,
        "data": []
    }

@app.post("/upload-video")
async def upload_video():
    return {
        "success": True,
        "videoId": str(uuid.uuid4())
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

Install Python dependencies:
```bash
pip install fastapi uvicorn python-multipart psutil pillow
```

Run:
```bash
python server.py
```

## 📝 Integration with Real ML Model

Replace the `runDetection` function with your actual model:

### Using TensorFlow/PyTorch

```python
import tensorflow as tf
from PIL import Image
import base64
from io import BytesIO

# Load model once
model = tf.keras.models.load_model('model.h5')

async def run_detection(frame_data: str) -> list:
    # Decode base64 frame
    image_data = base64.b64decode(frame_data.split(',')[1])
    image = Image.open(BytesIO(image_data))
    
    # Run inference
    predictions = model.predict(image)
    
    # Format results
    boxes = []
    for pred in predictions:
        boxes.append({
            "x": float(pred['x']),
            "y": float(pred['y']),
            "width": float(pred['width']),
            "height": float(pred['height']),
            "label": pred['class'],
            "confidence": float(pred['confidence'])
        })
    
    return boxes
```

## 🔌 Testing the Connection

```bash
# Test WebSocket
wscat -c ws://localhost:8000/realtime

# Test REST API
curl http://localhost:8000/health
curl http://localhost:8000/history
```

## 🚀 Production Deployment

1. **Use environment variables** for configuration
2. **Enable WSS (WebSocket Secure)** with SSL certificates
3. **Implement authentication** for WebSocket connections
4. **Add rate limiting** for frame uploads
5. **Use database** for persistent storage instead of in-memory
6. **Implement proper error handling** and logging
7. **Use process manager** like PM2 for Node.js

## 📊 Performance Tips

- Process frames in separate threads/workers
- Use GPU acceleration for inference
- Implement frame batching for efficiency
- Add caching for similar frames
- Monitor queue length and implement backpressure
