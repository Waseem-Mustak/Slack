const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const connectDB = require('./config/db');
const messageRoutes = require('./routes/messageRoutes');
const teamRoutes = require('./routes/teamRoutes');
const channelRoutes = require('./routes/channelRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const directMessageRoutes = require('./routes/directMessageRoutes');
const Message = require('./models/Message');
const DirectMessage = require('./models/DirectMessage');
const User = require('./models/User');

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

// Map to track user socket IDs: userId -> socketId
const userSockets = new Map();

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
      auth: '/api/auth',
      messages: '/api/messages',
      teams: '/api/teams',
      channels: '/api/channels',
    },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/users', userRoutes);
app.use('/api/direct-messages', directMessageRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Something went wrong!',
  });
});

// Socket.IO connection handling with authentication
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }

    // Attach user to socket
    socket.user = user;
    
    // Update user status to online
    user.status = 'online';
    await user.save();
    
    next();
  } catch (error) {
    next(new Error('Authentication error: Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.user.username} (${socket.id})`);

  // Store user's socket ID
  userSockets.set(socket.user._id.toString(), socket.id);

  // Broadcast to all users that this user is online
  io.emit('user-status-changed', {
    userId: socket.user._id,
    username: socket.user.username,
    status: 'online'
  });

  // Join a channel room
  socket.on('join-channel', (channelId) => {
    socket.join(channelId);
    console.log(`${socket.user.username} joined channel: ${channelId}`);
    
    socket.emit('channel-joined', {
      channelId,
      message: 'Successfully joined channel',
    });
  });

  // Leave a channel room
  socket.on('leave-channel', (channelId) => {
    socket.leave(channelId);
    console.log(`${socket.user.username} left channel: ${channelId}`);
  });

  // Listen for incoming messages
  socket.on('send-message', async (data) => {
    try {
      // Save message to MongoDB with authenticated user
      const newMessage = await Message.create({
        userId: socket.user._id,
        message: data.message,
        channelId: data.channelId,
        teamId: data.teamId,
      });

      // Populate user info
      await newMessage.populate('userId', 'username avatar');

      // Broadcast message only to users in the same channel
      io.to(data.channelId).emit('receive-message', {
        _id: newMessage._id,
        userId: newMessage.userId._id,
        username: newMessage.userId.username,
        avatar: newMessage.userId.avatar,
        message: newMessage.message,
        channelId: newMessage.channelId,
        teamId: newMessage.teamId,
        timestamp: newMessage.createdAt,
      });

      console.log(`Message from ${socket.user.username} in channel ${data.channelId}: ${data.message}`);
    } catch (error) {
      console.error('Error saving message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Listen for direct messages
  socket.on('send-dm', async (data) => {
    try {
      // Save direct message to MongoDB
      const newDM = await DirectMessage.create({
        senderId: socket.user._id,
        receiverId: data.receiverId,
        message: data.message,
      });

      // Populate user info
      await newDM.populate('senderId', 'username avatar');
      await newDM.populate('receiverId', 'username avatar');

      // Emit to both sender and receiver
      const dmData = {
        _id: newDM._id,
        senderId: newDM.senderId._id,
        senderUsername: newDM.senderId.username,
        senderAvatar: newDM.senderId.avatar,
        receiverId: newDM.receiverId._id,
        receiverUsername: newDM.receiverId.username,
        receiverAvatar: newDM.receiverId.avatar,
        message: newDM.message,
        timestamp: newDM.createdAt,
        read: newDM.read,
      };

      // Send to receiver using stored socket ID
      const receiverSocketId = userSockets.get(data.receiverId.toString());
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('receive-dm', dmData);
      }
      
      // Send back to sender
      socket.emit('receive-dm', dmData);

      console.log(`DM from ${socket.user.username} to user ${data.receiverId}`);
    } catch (error) {
      console.error('Error saving direct message:', error);
      socket.emit('error', { message: 'Failed to send direct message' });
    }
  });

  // Handle user disconnect
  socket.on('disconnect', async () => {
    console.log(`User disconnected: ${socket.user.username} (${socket.id})`);
    
    // Remove user's socket ID
    userSockets.delete(socket.user._id.toString());
    
    // Update user status to offline
    try {
      const user = await User.findById(socket.user._id);
      if (user) {
        user.status = 'offline';
        await user.save();

        // Broadcast to all users that this user is offline
        io.emit('user-status-changed', {
          userId: socket.user._id,
          username: socket.user.username,
          status: 'offline'
        });
      }
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  });
});

// Start server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.IO ready for connections`);
});
