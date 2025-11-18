const mongoose = require('mongoose');

const directMessageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    trim: true
  },
  // Cloudinary image fields
  imageUrl: {
    type: String,  // Cloudinary URL
  },
  imagePublicId: {
    type: String,  // Cloudinary public_id for deletion
  },
  read: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Custom validation: at least message or imageUrl must be provided
directMessageSchema.pre('validate', function(next) {
  if (!this.message && !this.imageUrl) {
    next(new Error('Either message text or image is required'));
  } else {
    next();
  }
});

// Index for faster queries
directMessageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });

module.exports = mongoose.model('DirectMessage', directMessageSchema);
