const express = require('express');
const router = express.Router();
const Message = require('../models/Message');

// @route   GET /api/messages
// @desc    Get messages by channel (last 100)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { channelId } = req.query;
    
    if (!channelId) {
      return res.status(400).json({
        success: false,
        error: 'Channel ID is required',
      });
    }

    const messages = await Message.find({ channelId })
      .sort({ createdAt: -1 })
      .limit(100);
    
    res.json({
      success: true,
      count: messages.length,
      data: messages.reverse(), // Reverse to show oldest first
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
    });
  }
});

// @route   DELETE /api/messages/:id
// @desc    Delete a message
// @access  Public
router.delete('/:id', async (req, res) => {
  try {
    const message = await Message.findByIdAndDelete(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found',
      });
    }

    res.json({
      success: true,
      data: {},
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
    });
  }
});

module.exports = router;
