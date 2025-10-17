import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' }});

app.use(cors());
app.use(express.json());

// API маршруттары
app.use('/api/auth', authRoutes);

// Socket.io чат
io.on('connection', (socket) => {
  console.log('🟢 Пайдаланушы қосылды');
  
  socket.on('sendMessage', (msg) => {
    io.emit('receiveMessage', msg);
  });

  socket.on('disconnect', () => console.log('🔴 Пайдаланушы шықты'));
});

server.listen(3000, () => console.log('🚀 Сервер http://localhost:3000 жұмыс істеп тұр'));
