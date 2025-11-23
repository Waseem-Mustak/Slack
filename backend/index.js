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
const uploadRoutes = require('./routes/uploadRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const Message = require('./models/Message');
const DirectMessage = require('./models/DirectMessage');
const User = require('./models/User');
const TeamMember = require('./models/TeamMember');
const Channel = require('./models/Channel');
const ChannelRead = require('./models/ChannelRead');
const DMRead = require('./models/DMRead');
const Notification = require('./models/Notification');

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
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationRoutes);

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
  
  // Initialize socket data for tracking current view
  socket.data.currentChannelId = null;
  socket.data.currentDMUserId = null;

  // Broadcast to all users that this user is online
  io.emit('user-status-changed', {
    userId: socket.user._id,
    username: socket.user.username,
    status: 'online'
  });

  // Track when user views a channel
  socket.on('view-channel', (channelId) => {
    socket.data.currentChannelId = channelId;
    socket.data.currentDMUserId = null;
    console.log(`${socket.user.username} viewing channel: ${channelId}`);
  });

  // Track when user views a DM
  socket.on('view-dm', (userId) => {
    socket.data.currentDMUserId = userId;
    socket.data.currentChannelId = null;
    console.log(`${socket.user.username} viewing DM with user: ${userId}`);
  });

  // Mark channel as read
  socket.on('mark-channel-read', async (channelId) => {
    try {
      await ChannelRead.findOneAndUpdate(
        { userId: socket.user._id, channelId },
        { lastReadAt: new Date() },
        { upsert: true, new: true }
      );
      
      // Get updated unread count
      const unreadCount = await getChannelUnreadCount(socket.user._id, channelId);
      socket.emit('unread-updated', { type: 'channel', channelId, count: unreadCount });
    } catch (error) {
      console.error('Error marking channel as read:', error);
    }
  });

  // Mark DM as read
  socket.on('mark-dm-read', async (otherUserId) => {
    try {
      await DMRead.findOneAndUpdate(
        { userId: socket.user._id, otherUserId },
        { lastReadAt: new Date() },
        { upsert: true, new: true }
      );
      
      // Get updated unread count
      const unreadCount = await getDMUnreadCount(socket.user._id, otherUserId);
      socket.emit('unread-updated', { type: 'dm', userId: otherUserId, count: unreadCount });
    } catch (error) {
      console.error('Error marking DM as read:', error);
    }
  });

  // Get all unread counts
  socket.on('get-unread-counts', async () => {
    try {
      // Get all channels user is member of
      const memberships = await TeamMember.find({ userId: socket.user._id });
      const teamIds = memberships.map(m => m.teamId);
      const channels = await Channel.find({ teamId: { $in: teamIds } });
      
      // Get unread count for each channel
      const channelUnreads = await Promise.all(
        channels.map(async (channel) => ({
          channelId: channel._id,
          count: await getChannelUnreadCount(socket.user._id, channel._id)
        }))
      );
      
      // Get all users with DMs
      const dmUsers = await DirectMessage.distinct('senderId', {
        $or: [
          { senderId: socket.user._id },
          { receiverId: socket.user._id }
        ]
      });
      const dmUsers2 = await DirectMessage.distinct('receiverId', {
        $or: [
          { senderId: socket.user._id },
          { receiverId: socket.user._id }
        ]
      });
      const allDMUserIds = [...new Set([...dmUsers, ...dmUsers2])]
        .filter(id => id.toString() !== socket.user._id.toString());
      
      // Get unread count for each DM
      const dmUnreads = await Promise.all(
        allDMUserIds.map(async (userId) => ({
          userId,
          count: await getDMUnreadCount(socket.user._id, userId)
        }))
      );
      
      socket.emit('all-unread-counts', {
        channels: channelUnreads.filter(c => c.count > 0),
        dms: dmUnreads.filter(d => d.count > 0)
      });
    } catch (error) {
      console.error('Error getting unread counts:', error);
    }
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
      // Check if user is member of the team
      const channel = await Channel.findById(data.channelId);
      if (!channel) {
        socket.emit('error', { message: 'Channel not found' });
        return;
      }

      const membership = await TeamMember.findOne({
        teamId: channel.teamId,
        userId: socket.user._id
      });

      if (!membership) {
        socket.emit('error', { message: 'You are not a member of this team' });
        return;
      }

      // Save message to MongoDB with authenticated user
      const newMessage = await Message.create({
        userId: socket.user._id,
        message: data.message,
        channelId: data.channelId,
        teamId: data.teamId,
        imageUrl: data.imageUrl,
        imagePublicId: data.imagePublicId,
      });

      // Populate user info
      await newMessage.populate('userId', 'username avatar');

      const messageData = {
        _id: newMessage._id,
        userId: newMessage.userId._id,
        username: newMessage.userId.username,
        avatar: newMessage.userId.avatar,
        message: newMessage.message,
        imageUrl: newMessage.imageUrl,
        imagePublicId: newMessage.imagePublicId,
        channelId: newMessage.channelId,
        teamId: newMessage.teamId,
        timestamp: newMessage.createdAt,
      };

      // Detect @mentions
      const mentionRegex = /@(\w+)/g;
      const mentions = [...data.message.matchAll(mentionRegex)].map(match => match[1]);
      const mentionedUsers = mentions.length > 0 
        ? await User.find({ username: { $in: mentions } }).select('_id username')
        : [];

      // Get all team members
      const teamMembers = await TeamMember.find({ teamId: channel.teamId });

      // Send to each team member with appropriate notification
      for (const member of teamMembers) {
        const memberSocketId = userSockets.get(member.userId.toString());
        
        if (memberSocketId) {
          const memberSocket = io.sockets.sockets.get(memberSocketId);
          
          if (memberSocket) {
            // Always send the message
            memberSocket.emit('receive-message', messageData);
            
            // Check if member is viewing this channel
            const isViewingChannel = memberSocket.data.currentChannelId === data.channelId;
            
            // Don't notify sender or if viewing the channel
            if (member.userId.toString() !== socket.user._id.toString() && !isViewingChannel) {
              // Check if user was mentioned
              const wasMentioned = mentionedUsers.some(u => u._id.toString() === member.userId.toString());
              
              // Get unread count
              const unreadCount = await getChannelUnreadCount(member.userId, data.channelId);
              
              const notificationType = wasMentioned ? 'mention' : 'message';
              const notificationTitle = wasMentioned 
                ? `${socket.user.username} mentioned you` 
                : `New message in #${channel.name}`;
              
              console.log(`[NOTIFICATION DEBUG] User ${member.userId} - wasMentioned: ${wasMentioned}, type: ${notificationType}`);
              
              // Save notification to database
              await Notification.create({
                userId: member.userId,
                type: notificationType,
                title: notificationTitle,
                message: data.message,
                channelId: data.channelId,
                channelName: channel.name,
                fromUserId: socket.user._id,
                fromUsername: socket.user.username,
                read: false
              });
              
              // Send notification
              memberSocket.emit('notification', {
                type: notificationType,
                channelId: data.channelId,
                channelName: channel.name,
                teamId: data.teamId,
                message: messageData,
                unreadCount,
                priority: wasMentioned ? 'high' : 'normal'
              });
            }
          }
        }
      }

      console.log(`Message from ${socket.user.username} in channel ${data.channelId}${data.imageUrl ? ' (with image)' : ''}${mentions.length > 0 ? ' (with mentions)' : ''}`);
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
        imageUrl: data.imageUrl,
        imagePublicId: data.imagePublicId,
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
        imageUrl: newDM.imageUrl,
        imagePublicId: newDM.imagePublicId,
        timestamp: newDM.createdAt,
        read: newDM.read,
      };

      // Send to receiver using stored socket ID
      const receiverSocketId = userSockets.get(data.receiverId.toString());
      if (receiverSocketId) {
        const receiverSocket = io.sockets.sockets.get(receiverSocketId);
        
        if (receiverSocket) {
          receiverSocket.emit('receive-dm', dmData);
          
          // Check if receiver is viewing this DM
          const isViewingDM = receiverSocket.data.currentDMUserId === socket.user._id.toString();
          
          // Send notification if not viewing
          if (!isViewingDM) {
            const unreadCount = await getDMUnreadCount(data.receiverId, socket.user._id);
            
            // Save notification to database
            await Notification.create({
              userId: data.receiverId,
              type: 'dm',
              title: `New message from ${socket.user.username}`,
              message: data.message,
              fromUserId: socket.user._id,
              fromUsername: socket.user.username,
              read: false
            });
            
            receiverSocket.emit('dm-notification', {
              type: 'direct-message',
              from: socket.user.username,
              fromId: socket.user._id,
              message: dmData,
              unreadCount,
              priority: 'high' // DMs are always high priority
            });
          }
        }
      }
      
      // Send back to sender
      socket.emit('receive-dm', dmData);

      console.log(`DM from ${socket.user.username} to user ${data.receiverId}`);
    } catch (error) {
      console.error('Error saving direct message:', error);
      socket.emit('error', { message: 'Failed to send direct message' });
    }
  });

  // Handle typing indicators for channels
  socket.on('typing-start', (data) => {
    if (data.channelId) {
      // Channel typing - broadcast to channel except sender
      socket.to(data.channelId).emit('user-typing', {
        userId: socket.user._id,
        username: socket.user.username,
        channelId: data.channelId
      });
    } else if (data.targetUserId) {
      // DM typing - send only to target user
      const targetSocketId = userSockets.get(data.targetUserId.toString());
      if (targetSocketId) {
        io.to(targetSocketId).emit('user-typing', {
          userId: socket.user._id,
          username: socket.user.username,
          isDM: true
        });
      }
    }
  });

  socket.on('typing-stop', (data) => {
    if (data.channelId) {
      // Channel typing - broadcast to channel except sender
      socket.to(data.channelId).emit('user-stopped-typing', {
        userId: socket.user._id,
        username: socket.user.username,
        channelId: data.channelId
      });
    } else if (data.targetUserId) {
      // DM typing - send only to target user
      const targetSocketId = userSockets.get(data.targetUserId.toString());
      if (targetSocketId) {
        io.to(targetSocketId).emit('user-stopped-typing', {
          userId: socket.user._id,
          username: socket.user.username,
          isDM: true
        });
      }
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

// Helper functions for unread counts
async function getChannelUnreadCount(userId, channelId) {
  try {
    const channelRead = await ChannelRead.findOne({ userId, channelId });
    const lastReadAt = channelRead?.lastReadAt || new Date(0);
    
    const count = await Message.countDocuments({
      channelId,
      createdAt: { $gt: lastReadAt },
      userId: { $ne: userId } // Don't count user's own messages
    });
    
    return count;
  } catch (error) {
    console.error('Error getting channel unread count:', error);
    return 0;
  }
}

async function getDMUnreadCount(userId, otherUserId) {
  try {
    const dmRead = await DMRead.findOne({ userId, otherUserId });
    const lastReadAt = dmRead?.lastReadAt || new Date(0);
    
    const count = await DirectMessage.countDocuments({
      senderId: otherUserId,
      receiverId: userId,
      createdAt: { $gt: lastReadAt }
    });
    
    return count;
  } catch (error) {
    console.error('Error getting DM unread count:', error);
    return 0;
  }
}

// Start server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.IO ready for connections`);
});
