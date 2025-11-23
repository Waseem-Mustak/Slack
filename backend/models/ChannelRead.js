const mongoose = require('mongoose');

const ChannelReadSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  channelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel',
    required: true
  },
  lastReadAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index to ensure one record per user per channel
ChannelReadSchema.index({ userId: 1, channelId: 1 }, { unique: true });

module.exports = mongoose.model('ChannelRead', ChannelReadSchema);
