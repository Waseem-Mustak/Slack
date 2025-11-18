const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    message: {
      type: String,
      trim: true,
    },
    // Cloudinary image fields
    imageUrl: {
      type: String,  // Cloudinary URL
    },
    imagePublicId: {
      type: String,  // Cloudinary public_id for deletion
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

// Custom validation: at least message or imageUrl must be provided
messageSchema.pre('validate', function(next) {
  if (!this.message && !this.imageUrl) {
    next(new Error('Either message text or image is required'));
  } else {
    next();
  }
});

// Index for faster queries by channel
messageSchema.index({ channelId: 1, createdAt: -1 });
messageSchema.index({ teamId: 1 });

module.exports = mongoose.model('Message', messageSchema);
