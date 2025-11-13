const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const messageRoutes = require('./routes/messageRoutes');
const teamRoutes = require('./routes/teamRoutes');
const channelRoutes = require('./routes/channelRoutes');
const Message = require('./models/Message');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Initialize Express app
const app = express();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Chat API',
    version: '1.0.0',
    endpoints: {
      messages: '/api/messages',
      teams: '/api/teams',
      channels: '/api/channels',
    },
  });
});

app.use('/api/messages', messageRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/channels', channelRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Something went wrong!',
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join a channel room
  socket.on('join-channel', (channelId) => {
    socket.join(channelId);
    console.log(`User ${socket.id} joined channel: ${channelId}`);
    
    socket.emit('channel-joined', {
      channelId,
      message: 'Successfully joined channel',
    });
  });

  // Leave a channel room
  socket.on('leave-channel', (channelId) => {
    socket.leave(channelId);
    console.log(`User ${socket.id} left channel: ${channelId}`);
  });

  // Listen for incoming messages
  socket.on('send-message', async (data) => {
    try {
      // Save message to MongoDB
      const newMessage = await Message.create({
        username: data.username,
        message: data.message,
        avatar: data.avatar || '',
        channelId: data.channelId,
        teamId: data.teamId,
      });

      // Broadcast message only to users in the same channel
      io.to(data.channelId).emit('receive-message', {
        _id: newMessage._id,
        username: newMessage.username,
        message: newMessage.message,
        avatar: newMessage.avatar,
        channelId: newMessage.channelId,
        teamId: newMessage.teamId,
        timestamp: newMessage.createdAt,
      });

      console.log(`Message from ${data.username} in channel ${data.channelId}: ${data.message}`);
    } catch (error) {
      console.error('Error saving message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle user disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.IO ready for connections`);
});
