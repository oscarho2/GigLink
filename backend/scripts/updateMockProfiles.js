const mongoose = require('mongoose');
const Profile = require('../models/Profile');
const User = require('../models/User');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const profileUpdates = [
  {
    userEmail: 'alex.johnson@email.com',
    updates: {
      videos: [
        {
          title: 'Jazz Piano Performance',
          description: 'Live performance at Blue Note NYC',
          url: 'https://youtube.com/watch?v=example1',
          thumbnail: 'https://img.youtube.com/vi/example1/maxresdefault.jpg'
        }
      ],
      education: [
        {
          school: 'Berklee College of Music',
          degree: 'Bachelor of Music',
          fieldOfStudy: 'Jazz Performance',
          from: new Date('2015-09-01'),
          to: new Date('2019-05-15'),
          current: false,
          description: 'Focused on jazz piano and composition'
        }
      ],

      skills: ['Jazz Piano', 'Composition', 'Music Theory', 'Improvisation', 'Recording']
    }
  },
  {
    userEmail: 'sarah.martinez@email.com',
    updates: {
      videos: [
        {
          title: 'Acoustic Guitar Solo',
          description: 'Original composition on acoustic guitar',
          url: 'https://youtube.com/watch?v=example2',
          thumbnail: 'https://img.youtube.com/vi/example2/maxresdefault.jpg'
        }
      ],
      education: [
        {
          school: 'Los Angeles Music Academy',
          degree: 'Certificate',
          fieldOfStudy: 'Guitar Performance',
          from: new Date('2018-01-01'),
          to: new Date('2019-12-15'),
          current: false,
          description: 'Intensive guitar performance and songwriting program'
        }
      ],

      skills: ['Acoustic Guitar', 'Electric Guitar', 'Songwriting', 'Music Education', 'Live Performance']
    }
  },
  {
    userEmail: 'mike.chen@email.com',
    updates: {
      videos: [
        {
          title: 'Bass Guitar Groove',
          description: 'Funk bass line demonstration',
          url: 'https://youtube.com/watch?v=example3',
          thumbnail: 'https://img.youtube.com/vi/example3/maxresdefault.jpg'
        }
      ],
      education: [
        {
          school: 'Musicians Institute',
          degree: 'Associate Degree',
          fieldOfStudy: 'Bass Performance',
          from: new Date('2016-09-01'),
          to: new Date('2018-06-15'),
          current: false,
          description: 'Comprehensive bass guitar program with focus on various genres'
        }
      ],

      skills: ['Bass Guitar', 'Funk', 'Rock', 'Jazz', 'Studio Recording', 'Live Performance']
    }
  },
  {
    userEmail: 'emma.wilson@email.com',
    updates: {
      videos: [
        {
          title: 'Violin Concerto Performance',
          description: 'Mozart Violin Concerto No. 4',
          url: 'https://youtube.com/watch?v=example4',
          thumbnail: 'https://img.youtube.com/vi/example4/maxresdefault.jpg'
        }
      ],
      education: [
        {
          school: 'Juilliard School',
          degree: 'Master of Music',
          fieldOfStudy: 'Violin Performance',
          from: new Date('2017-09-01'),
          to: new Date('2019-05-15'),
          current: false,
          description: 'Advanced violin studies with focus on classical repertoire'
        },
        {
          school: 'New England Conservatory',
          degree: 'Bachelor of Music',
          fieldOfStudy: 'Violin Performance',
          from: new Date('2013-09-01'),
          to: new Date('2017-05-15'),
          current: false,
          description: 'Classical violin training with chamber music emphasis'
        }
      ],

      skills: ['Classical Violin', 'Chamber Music', 'Orchestra Performance', 'Music Theory', 'Sight Reading']
    }
  },
  {
    userEmail: 'david.rodriguez@email.com',
    updates: {
      videos: [
        {
          title: 'Rock Guitar Solo',
          description: 'Original rock composition with guitar solo',
          url: 'https://youtube.com/watch?v=example5',
          thumbnail: 'https://img.youtube.com/vi/example5/maxresdefault.jpg'
        }
      ],
      education: [
        {
          school: 'Guitar Institute of Technology',
          degree: 'Certificate',
          fieldOfStudy: 'Rock Guitar',
          from: new Date('2015-01-01'),
          to: new Date('2016-12-15'),
          current: false,
          description: 'Intensive rock guitar program with focus on technique and songwriting'
        }
      ],

      skills: ['Electric Guitar', 'Rock', 'Blues', 'Songwriting', 'Live Performance', 'Music Education']
    }
  }
];

async function updateMockProfiles() {
  try {
    console.log('Updating mock profiles...');
    console.log('MongoDB connected');

    for (const profileUpdate of profileUpdates) {
      // Find user by email
      const user = await User.findOne({ email: profileUpdate.userEmail });
      if (!user) {
        console.log(`User not found: ${profileUpdate.userEmail}`);
        continue;
      }

      // Find and update profile
      const profile = await Profile.findOneAndUpdate(
        { user: user._id },
        { $set: profileUpdate.updates },
        { new: true, upsert: false }
      );

      if (profile) {
        console.log(`Updated profile for user: ${user.name}`);
      } else {
        console.log(`Profile not found for user: ${user.name}`);
      }
    }

    console.log('Mock profiles updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error updating profiles:', error);
    process.exit(1);
  }
}

updateMockProfiles();