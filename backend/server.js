require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');
const { initSocket } = require('./socket/socketHandler');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const friendRoutes = require('./routes/friends');
const messageRoutes = require('./routes/messages');
const memeRoutes = require('./routes/memes');
const pushRoutes = require('./routes/push');
const gameRoutes = require('./routes/games');
const gifRoutes = require('./routes/gifs');
const { configureWebPush } = require('./utils/pushService');

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  process.env.CLIENT_URL,
  'https://frontend-mu-gules-75.vercel.app',
  'https://max-connectivity.vercel.app',
  /https:\/\/.*\.vercel\.app$/,
  'capacitor://localhost',
  'http://localhost',
  'ionic://localhost',
];

const corsOptions = {
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    const allowed = allowedOrigins.some(o =>
      o instanceof RegExp ? o.test(origin) : o === origin
    );
    if (allowed) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => res.status(200).json({ status: 'MAX Connectivity API running', port: process.env.PORT }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/memes', memeRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/gifs', gifRoutes);

configureWebPush();

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const io = new Server(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling'],
});

initSocket(io);

connectDB().then(() => {
  const PORT = process.env.PORT || 8080;
  server.listen(PORT, '0.0.0.0', () => {
    // Server started
  });
}).catch(err => {
  process.exit(1);
});

// Keep alive ping every 14 minutes
if (process.env.NODE_ENV === 'production') {
  setInterval(async () => {
    try {
      await fetch(`${process.env.CLIENT_URL || 'https://max-connectivity1.onrender.com'}/health`)
    } catch (e) {}
  }, 14 * 60 * 1000)
}
