const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Channel = require('../models/Channel');
const TeamMember = require('../models/TeamMember');
const { protect } = require('../middleware/auth');

// @route   GET /api/messages
// @desc    Get messages by channel (last 100) - only for team members
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { channelId } = req.query;
    
    if (!channelId) {
      return res.status(400).json({
        success: false,
        error: 'Channel ID is required',
      });
    }

    // Get channel and check team membership
    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({
        success: false,
        error: 'Channel not found',
      });
    }

    const membership = await TeamMember.findOne({
      teamId: channel.teamId,
      userId: req.user._id
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        error: 'You are not a member of this team',
      });
    }

    const messages = await Message.find({ channelId })
      .populate('userId', 'username avatar')
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
// @access  Private
router.delete('/:id', protect, async (req, res) => {
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
