const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Please add a username'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Please add a message'],
      trim: true,
    },
    avatar: {
      type: String,
      default: '',
    },
    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Channel',
      required: [true, 'Channel ID is required'],
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: [true, 'Team ID is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries by channel
messageSchema.index({ channelId: 1, createdAt: -1 });
messageSchema.index({ teamId: 1 });

module.exports = mongoose.model('Message', messageSchema);
