const express = require('express');
const router = express.Router();
const DirectMessage = require('../models/DirectMessage');
const { protect } = require('../middleware/auth');

// @route   GET /api/direct-messages
// @desc    Get direct messages between two users
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
    }

    // Get messages where current user is either sender or receiver
    const messages = await DirectMessage.find({
      $or: [
        { senderId: req.user._id, receiverId: userId },
        { senderId: userId, receiverId: req.user._id }
      ]
    })
      .populate('senderId', 'username avatar')
      .populate('receiverId', 'username avatar')
      .sort({ createdAt: 1 })
      .limit(100);
    
    res.json({
      success: true,
      count: messages.length,
      data: messages,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
    });
  }
});

// @route   POST /api/direct-messages
// @desc    Send a direct message
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { receiverId, message } = req.body;

    if (!receiverId || !message) {
      return res.status(400).json({
        success: false,
        error: 'Receiver ID and message are required',
      });
    }

    const directMessage = await DirectMessage.create({
      senderId: req.user._id,
      receiverId,
      message,
    });

    await directMessage.populate('senderId', 'username avatar');
    await directMessage.populate('receiverId', 'username avatar');

    res.status(201).json({
      success: true,
      data: directMessage,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
    });
  }
});

// @route   PATCH /api/direct-messages/:id/read
// @desc    Mark message as read
// @access  Private
router.patch('/:id/read', protect, async (req, res) => {
  try {
    const message = await DirectMessage.findOneAndUpdate(
      { _id: req.params.id, receiverId: req.user._id },
      { read: true },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found',
      });
    }

    res.json({
      success: true,
      data: message,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
    });
  }
});

module.exports = router;
