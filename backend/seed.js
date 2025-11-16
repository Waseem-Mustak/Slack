const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Team = require('./models/Team');
const Channel = require('./models/Channel');
const Message = require('./models/Message');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const seedData = async () => {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Team.deleteMany({});
    await Channel.deleteMany({});
    await Message.deleteMany({});
    
    console.log('Cleared existing data');

    // Create demo users
    const user1 = await User.create({
      username: 'demo',
      password: 'demo123' // Will be hashed automatically
    });

    const user2 = await User.create({
      username: 'john',
      password: 'john123'
    });

    console.log('Users created');

    // Create teams
    const team1 = await Team.create({
      name: 'My Workspace',
      description: 'Main workspace for the team',
      icon: '🏢',
      createdBy: user1._id
    });

    const team2 = await Team.create({
      name: 'Personal',
      description: 'Personal workspace',
      icon: '👤',
      createdBy: user1._id
    });

    console.log('Teams created');

    // Create channels for team1
    await Channel.create([
      {
        name: 'general',
        description: 'General discussion',
        icon: '#',
        teamId: team1._id,
        createdBy: user1._id
      },
      {
        name: 'random',
        description: 'Random chat',
        icon: '💬',
        teamId: team1._id,
        createdBy: user1._id
      },
      {
        name: 'announcements',
        description: 'Important announcements',
        icon: '📢',
        teamId: team1._id,
        createdBy: user1._id
      }
    ]);

    // Create channels for team2
    await Channel.create([
      {
        name: 'notes',
        description: 'Personal notes',
        icon: '📝',
        teamId: team2._id,
        createdBy: user1._id
      },
      {
        name: 'ideas',
        description: 'Ideas and brainstorming',
        icon: '💡',
        teamId: team2._id,
        createdBy: user1._id
      }
    ]);

    console.log('Channels created');
    console.log('\n✅ Database seeded successfully!');
    console.log('\n👤 Demo Users:');
    console.log('- demo / demo123');
    console.log('- john / john123');
    console.log('\nTeams:');
    console.log('- My Workspace (🏢)');
    console.log('- Personal (👤)');
    console.log('\nChannels:');
    console.log('My Workspace: #general, 💬random, 📢announcements');
    console.log('Personal: 📝notes, 💡ideas');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedData();
