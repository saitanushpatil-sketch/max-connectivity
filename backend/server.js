require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');
const initSocket = require('./socket/socketHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const sanitizeMiddleware = require('./middleware/sanitize');
const auth = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const friendRoutes = require('./routes/friends');
const messageRoutes = require('./routes/messages');
const memeRoutes = require('./routes/memes');
const pushRoutes = require('./routes/push');
const gameRoutes = require('./routes/games');
const gifRoutes = require('./routes/gifs');
const conversationRoutes = require('./routes/conversations');
const callRoutes = require('./routes/calls');

const app = express();
const server = http.createServer(app);

// --- CORS: Whitelist known origins only ---
const ALLOWED_ORIGINS = [
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'https://localhost:3000',
  'capacitor://localhost',    // Capacitor Android
  'http://localhost',         // Capacitor fallback
].filter(Boolean);

const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed) || origin === allowed)) {
      return callback(null, true);
    }
    // In development, allow all
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// --- Security middleware ---
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // Disable CSP for API server
}));
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(...sanitizeMiddleware);
app.use(apiLimiter);

// --- Health check (no auth) ---
app.get('/health', (req, res) => res.json({ 
  status: 'MAX Connectivity API running', 
  port: process.env.PORT 
}));

// --- ICE server config for WebRTC calls (auth-protected) ---
app.get('/api/ice-config', auth, (req, res) => {
  res.json({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turns:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      }
    ],
    iceCandidatePoolSize: 10,
  });
});

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/memes', memeRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/gifs', gifRoutes);
app.use('/api/calls', callRoutes);

// --- Error handlers ---
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// --- Socket.io ---
const io = new Server(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 50 * 1024 * 1024,
});

initSocket(io);

// --- Start server ---
connectDB().then(() => {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 MAX Connectivity server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔒 CORS origins: ${ALLOWED_ORIGINS.join(', ')}`);
  });

  // Keep alive ping every 14 minutes
  if (process.env.NODE_ENV === 'production') {
    const selfUrl = process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/health`
      : `http://localhost:${PORT}/health`;
    setInterval(() => {
      fetch(selfUrl).catch(() => {});
    }, 14 * 60 * 1000);
  }
}).catch(err => {
  console.error('❌ Failed to connect to DB:', err);
  process.exit(1);
});
