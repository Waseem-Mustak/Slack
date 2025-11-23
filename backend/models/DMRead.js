const mongoose = require('mongoose');

const DMReadSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  otherUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastReadAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index to ensure one record per user pair
DMReadSchema.index({ userId: 1, otherUserId: 1 }, { unique: true });

module.exports = mongoose.model('DMRead', DMReadSchema);
