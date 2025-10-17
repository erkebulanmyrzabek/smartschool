// server.js
const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const authRoutes = require('../auth');
const chatRoutes = require('../chat');
const lessonsRoutes = require('../lessons');
const gradesRoutes = require('./grades');

const app = express();
app.use(cors());
app.use(express.json());

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/lessons', lessonsRoutes);
app.use('/api/grades', gradesRoutes);

// Health
app.get('/api/health', (req,res)=> res.json({ok:true}));

// Create HTTP server + socket.io
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, { cors: { origin: '*' } });

const pool = require('../db');

// Socket.io: basic join + sendMessage
io.on('connection', (socket) => {
  console.log('Socket connected', socket.id);

  // join room for user id (client should send `join` with userId)
  socket.on('join', (userId) => {
    if (userId) {
      socket.join('user_' + userId);
      console.log(`Socket ${socket.id} joined user_${userId}`);
    }
  });

  // sendMessage: expect payload { sender_id, sender_name, text, is_private, private_to_id }
  socket.on('sendMessage', async (msg) => {
    try {
      // store message to DB
      const [r] = await pool.query(
        'INSERT INTO chats (sender_id, sender_name, text, is_private, private_to_id) VALUES (?,?,?,?,?)',
        [msg.sender_id, msg.sender_name, msg.text, msg.is_private ? 1 : 0, msg.private_to_id || null]
      );
      const [rows] = await pool.query('SELECT * FROM chats WHERE id = ?', [r.insertId]);
      const message = rows[0];
      if (message.is_private && message.private_to_id) {
        // send to recipient and sender
        io.to('user_' + message.private_to_id).emit('message', message);
        io.to('user_' + message.sender_id).emit('message', message);
      } else {
        // broadcast global
        io.emit('message', message);
      }
    } catch (err) {
      console.error('socket sendMessage error', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
