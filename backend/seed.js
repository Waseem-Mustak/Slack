const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Team = require('./models/Team');
const Channel = require('./models/Channel');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const seedData = async () => {
  try {
    // Clear existing data
    await Team.deleteMany({});
    await Channel.deleteMany({});
    
    console.log('Cleared existing data');

    // Create teams
    const team1 = await Team.create({
      name: 'My Workspace',
      description: 'Main workspace for the team',
      icon: '🏢',
      createdBy: 'admin'
    });

    const team2 = await Team.create({
      name: 'Personal',
      description: 'Personal workspace',
      icon: '👤',
      createdBy: 'admin'
    });

    console.log('Teams created');

    // Create channels for team1
    await Channel.create([
      {
        name: 'general',
        description: 'General discussion',
        icon: '#',
        teamId: team1._id,
        createdBy: 'admin'
      },
      {
        name: 'random',
        description: 'Random chat',
        icon: '💬',
        teamId: team1._id,
        createdBy: 'admin'
      },
      {
        name: 'announcements',
        description: 'Important announcements',
        icon: '📢',
        teamId: team1._id,
        createdBy: 'admin'
      }
    ]);

    // Create channels for team2
    await Channel.create([
      {
        name: 'notes',
        description: 'Personal notes',
        icon: '📝',
        teamId: team2._id,
        createdBy: 'admin'
      },
      {
        name: 'ideas',
        description: 'Ideas and brainstorming',
        icon: '💡',
        teamId: team2._id,
        createdBy: 'admin'
      }
    ]);

    console.log('Channels created');
    console.log('\n✅ Database seeded successfully!');
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
