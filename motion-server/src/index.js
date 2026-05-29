const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { spawn } = require('child_process');
const path = require('path');

const config = require('./config');
const { sendPushNotification } = require('./notifier');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

app.use(express.json());

const pythonPath = path.join(__dirname, '..', '..', 'venv', 'Scripts', 'python.exe');
const detectorScript = path.join(__dirname, 'detector.py');

let detectorProcess = null;
let isRunning = false;

function startDetector() {
  if (detectorProcess) return;

  detectorProcess = spawn(pythonPath, [detectorScript], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  detectorProcess.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    for (const line of lines) {
      try {
        const result = JSON.parse(line);
        const timestamp = Date.now();

        if (result.status === 'detecting') {
          console.log('[PYTHON] Detección iniciada');
          io.emit('status', { running: true });
        } else if (result.status === 'stopped') {
          console.log('[PYTHON] Detección detenida');
        } else if (result.error) {
          console.error('[PYTHON] Error:', result.error);
        } else if (result.motion !== undefined) {
          io.emit('motion_frame', {
            motionDetected: result.motion,
            score: result.score,
            threshold: 4000,
            timestamp,
          });

          if (result.motion) {
            console.log(`[MOTION] Detectado! Area: ${result.score}`);
            sendPushNotification(
              '🚨 Movimiento Detectado',
              `Movimiento detectado (score: ${result.score}) a las ${new Date().toLocaleTimeString()}`
            );
          }
        }
      } catch (e) {
        // ignore non-JSON output
      }
    }
  });

  detectorProcess.stderr.on('data', (data) => {
    console.error('[PYTHON]', data.toString());
  });

  detectorProcess.on('exit', (code) => {
    console.log(`[PYTHON] Proceso terminado (código: ${code})`);
    detectorProcess = null;
    isRunning = false;
    io.emit('status', { running: false });
  });
}

function stopDetector() {
  if (detectorProcess) {
    detectorProcess.stdin.write('stop\n');
    setTimeout(() => {
      if (detectorProcess) {
        detectorProcess.kill();
        detectorProcess = null;
      }
    }, 2000);
  }
  isRunning = false;
  io.emit('status', { running: false });
}

app.get('/status', (req, res) => {
  res.json({
    running: isRunning,
    expoTokenConfigured: !!config.expoPushToken,
    motionThreshold: 4000,
  });
});

app.post('/configure', (req, res) => {
  const { expoPushToken } = req.body;
  if (expoPushToken) config.expoPushToken = expoPushToken;
  res.json({ success: true, config });
});

io.on('connection', (socket) => {
  console.log(`[IO] Client connected: ${socket.id}`);

  socket.on('start', () => {
    if (!isRunning) {
      isRunning = true;
      console.log('[SERVER] Starting motion detection...');
      startDetector();
      if (detectorProcess) {
        detectorProcess.stdin.write('start\n');
      }
    }
  });

  socket.on('stop', () => {
    console.log('[SERVER] Stopping motion detection...');
    isRunning = false;
    stopDetector();
  });

  socket.on('set_token', (data) => {
    if (data.expoPushToken) {
      config.expoPushToken = data.expoPushToken;
      console.log('[SERVER] Expo push token updated');
      socket.emit('token_status', { configured: true });
    }
  });

  socket.emit('status', {
    running: isRunning,
    expoTokenConfigured: !!config.expoPushToken,
    motionThreshold: 4000,
  });
});

const PORT = config.port;
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════╗
║    🎥 Motion Detection Edge      ║
║    Server running on port ${PORT}   ║
╚══════════════════════════════════╝
  `);
  console.log(`Python: ${pythonPath}`);
  console.log(`Detector: ${detectorScript}`);
  console.log(`Expo token: ${config.expoPushToken ? '✓ Configured' : '✗ Not configured'}`);
});
