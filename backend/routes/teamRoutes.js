const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const TeamMember = require('../models/TeamMember');
const { protect } = require('../middleware/auth');

// @route   GET /api/teams
// @desc    Get all teams where user is a member
router.get('/', protect, async (req, res) => {
  try {
    // Get teams where user is a member
    const memberships = await TeamMember.find({ userId: req.user._id })
      .populate('teamId')
      .sort({ createdAt: -1 });
    
    const teams = memberships.map(m => m.teamId).filter(team => team !== null);
    
    res.status(200).json({
      success: true,
      count: teams.length,
      data: teams
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

// @route   GET /api/teams/:id
// @desc    Get single team
router.get('/:id', protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    res.status(200).json({
      success: true,
      data: team
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

// @route   POST /api/teams
// @desc    Create new team
router.post('/', protect, async (req, res) => {
  try {
    const teamData = { ...req.body, createdBy: req.user._id };
    const team = await Team.create(teamData);

    // Add creator as team owner
    await TeamMember.create({
      teamId: team._id,
      userId: req.user._id,
      role: 'owner'
    });

    res.status(201).json({
      success: true,
      data: team
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

// @route   PUT /api/teams/:id
// @desc    Update team
router.put('/:id', protect, async (req, res) => {
  try {
    const team = await Team.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    res.status(200).json({
      success: true,
      data: team
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

// @route   DELETE /api/teams/:id
// @desc    Delete team
router.delete('/:id', protect, async (req, res) => {
  try {
    const team = await Team.findByIdAndDelete(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    // Delete all team members
    await TeamMember.deleteMany({ teamId: req.params.id });

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

// @route   POST /api/teams/:id/members
// @desc    Add member to team (only owner/admin)
router.post('/:id/members', protect, async (req, res) => {
  try {
    const { userId, role } = req.body;

    // Check if requester is team owner or admin
    const requesterMembership = await TeamMember.findOne({
      teamId: req.params.id,
      userId: req.user._id
    });

    if (!requesterMembership || (requesterMembership.role !== 'owner' && requesterMembership.role !== 'admin')) {
      return res.status(403).json({
        success: false,
        error: 'Only team owners and admins can add members'
      });
    }

    // Add new member
    const member = await TeamMember.create({
      teamId: req.params.id,
      userId: userId,
      role: role || 'member'
    });

    await member.populate('userId', 'username email avatar');

    res.status(201).json({
      success: true,
      data: member
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'User is already a member of this team'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

// @route   GET /api/teams/:id/members
// @desc    Get all team members
router.get('/:id/members', protect, async (req, res) => {
  try {
    const members = await TeamMember.find({ teamId: req.params.id })
      .populate('userId', 'username email avatar status')
      .sort({ role: 1, joinedAt: 1 });

    res.status(200).json({
      success: true,
      count: members.length,
      data: members
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

module.exports = router;
