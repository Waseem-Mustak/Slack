const express = require('express');
const router = express.Router();
const Channel = require('../models/Channel');
const { protect } = require('../middleware/auth');

// @route   GET /api/channels
// @desc    Get all channels (optionally filtered by teamId)
router.get('/', protect, async (req, res) => {
  try {
    const { teamId } = req.query;
    const filter = teamId ? { teamId } : {};
    
    const channels = await Channel.find(filter)
      .populate('teamId', 'name icon')
      .sort({ createdAt: 1 });
    
    res.status(200).json({
      success: true,
      count: channels.length,
      data: channels
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

// @route   GET /api/channels/:id
// @desc    Get single channel
router.get('/:id', protect, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id).populate('teamId', 'name icon');

    if (!channel) {
      return res.status(404).json({
        success: false,
        error: 'Channel not found'
      });
    }

    res.status(200).json({
      success: true,
      data: channel
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

// @route   POST /api/channels
// @desc    Create new channel
router.post('/', protect, async (req, res) => {
  try {
    const channelData = { ...req.body, createdBy: req.user._id };
    const channel = await Channel.create(channelData);

    res.status(201).json({
      success: true,
      data: channel
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        error: messages
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

// @route   PUT /api/channels/:id
// @desc    Update channel
router.put('/:id', protect, async (req, res) => {
  try {
    const channel = await Channel.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!channel) {
      return res.status(404).json({
        success: false,
        error: 'Channel not found'
      });
    }

    res.status(200).json({
      success: true,
      data: channel
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

// @route   DELETE /api/channels/:id
// @desc    Delete channel
router.delete('/:id', protect, async (req, res) => {
  try {
    const channel = await Channel.findByIdAndDelete(req.params.id);

    if (!channel) {
      return res.status(404).json({
        success: false,
        error: 'Channel not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

module.exports = router;
