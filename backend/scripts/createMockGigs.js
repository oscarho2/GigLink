const mongoose = require('mongoose');
const User = require('../models/User');
const Gig = require('../models/Gig');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const mockGigs = [
  {
    title: 'Jazz Night at Blue Note',
    description: 'Looking for a talented pianist to join our jazz trio for a weekly residency at the famous Blue Note club. Must be comfortable with improvisation and familiar with jazz standards.',
    venue: 'Blue Note Jazz Club',
    location: 'New York, NY',
    date: '2025-09-15',
    time: '20:00',
    payment: '$200',
    instruments: ['Piano'],
    genres: ['Jazz'],
    requirements: 'Professional level, jazz standards knowledge'
  },
  {
    title: 'Wedding Reception Band',
    description: 'Seeking a drummer for a wedding reception gig. We play a mix of classic rock, pop hits, and dance music. Great pay and fun atmosphere!',
    venue: 'Grand Ballroom Hotel',
    location: 'Los Angeles, CA',
    date: '2025-09-20',
    time: '18:00',
    payment: '$300',
    instruments: ['Drums'],
    genres: ['Pop', 'Rock'],
    requirements: 'Own drum kit preferred'
  },
  {
    title: 'Country Music Festival',
    description: 'Bass player needed for a country music festival performance. We\'re a well-established country band looking for someone who can bring energy and groove to our sound.',
    venue: 'Nashville Music Festival Grounds',
    location: 'Nashville, TN',
    date: '2025-09-25',
    time: '15:00',
    payment: '$250',
    instruments: ['Bass Guitar'],
    genres: ['Country'],
    requirements: 'Professional level, festival background preferred'
  },
  {
    title: 'Classical Chamber Concert',
    description: 'Violinist required for a chamber music concert featuring works by Mozart and Brahms. This is a prestigious venue with excellent acoustics.',
    venue: 'Symphony Center',
    location: 'Chicago, IL',
    date: '2025-10-01',
    time: '19:30',
    payment: '$180',
    instruments: ['Violin'],
    genres: ['Classical'],
    requirements: 'Professional level, chamber music background required'
  },
  {
    title: 'Rock Band Audition',
    description: 'Established rock band seeking a lead guitarist for upcoming tour. Must have own equipment and be available for rehearsals and travel.',
    venue: 'Rehearsal Studio',
    location: 'Austin, TX',
    date: '2025-09-18',
    time: '14:00',
    payment: 'Audition - No pay',
    instruments: ['Guitar'],
    genres: ['Rock'],
    requirements: 'Professional level, own equipment, available for tour'
  },
  {
    title: 'Corporate Event Entertainment',
    description: 'Looking for a versatile musician who can provide background music for a corporate event. Piano or acoustic guitar preferred.',
    venue: 'Corporate Conference Center',
    location: 'San Francisco, CA',
    date: '2025-09-22',
    time: '17:00',
    payment: '$220',
    instruments: ['Piano', 'Guitar'],
    genres: ['Jazz', 'Pop'],
    requirements: 'Background music skills'
  }
];

async function createMockGigs() {
  try {
    console.log('Creating mock gigs...');
    
    // Get some users to assign gigs to
    const users = await User.find().limit(6);
    
    if (users.length === 0) {
      console.log('No users found. Please create users first.');
      process.exit(1);
    }
    
    for (let i = 0; i < mockGigs.length && i < users.length; i++) {
      const gigData = {
        ...mockGigs[i],
        user: users[i]._id
      };
      
      const gig = new Gig(gigData);
      await gig.save();
      console.log(`Created gig "${gig.title}" for user: ${users[i].name}`);
    }
    
    console.log('Mock gigs created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating mock gigs:', error);
    process.exit(1);
  }
}

createMockGigs();