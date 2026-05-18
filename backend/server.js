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
const { configureWebPush } = require('./utils/pushService');

const app = express();
const server = http.createServer(app);

const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => res.json({ status: 'MAX Connectivity API running', port: process.env.PORT }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/memes', memeRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/games', gameRoutes);

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
