const mongoose = require('mongoose');
const User = require('./models/User');
const Profile = require('./models/Profile');

mongoose.connect('mongodb://localhost:27017/giglink')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    const user = await User.findOne({email: 'oscar@oscarho.co.uk'});
    
    if (!user) {
      console.log('❌ Oscar Ho user not found');
      return;
    }
    
    console.log('✅ Found Oscar Ho user');
    
    // Update user data
    user.location = 'Newcastle';
    user.instruments = ['Bass', 'Guitar', 'Vocals'];
    user.genres = ['Jazz', 'Classical', 'Pop'];
    user.isAvailableForGigs = true;
    user.profileCompleted = false;
    await user.save();
    
    console.log('✅ User data updated');
    
    // Update profile
    let profile = await Profile.findOne({user: user._id});
    
    if (!profile) {
      profile = new Profile({
        user: user._id
      });
    }
    
    // Update user bio and experience (these are stored in User model, not Profile)
    user.bio = "Oscar Ho is a dynamic musician currently immersed in the world of jazz at the Guildhall School of Music & Drama. His musical journey began at the prestigious Chetham's School of Music, where he honed his skills in both jazz and classical double bass from 2019 to 2021.\n\nDuring his time at Chetham's, Oscar caught the attention of the musical community, earning the esteemed \"Ida Carroll Scholarship\" for his remarkable progress as one of the most promising string players. Under the mentorship of renowned jazz bassist and educator Steve Berry and bassist Rachel Meerloo from the Hallé, Oscar delved into symphonic works, including Mahler 8, with the Chetham's Symphony Orchestra. His contributions extended to the Chetham's Big Band, led by the accomplished Richard Iles.\n\nOscar's musical prowess extends beyond the double bass; in 2018, he secured the first-place prize at the \"Northern Region Music Championship\" for classical guitar. His achievements include multiple awards from local music festivals, reflecting his versatility and commitment to musical excellence.\n\nSince relocating to London, Oscar has embraced a diverse range of musical opportunities. From collaborations in various musical productions to performances with function bands and orchestras, he has showcased his adaptability and passion for different genres. At the Guildhall School of Music & Drama, Oscar has had the privilege of working with distinguished figures like Norma Winston and Scott Stroman. His education at the Guildhall has been enriched through lessons with esteemed faculty members, including Steve Watts, Tom Farmer, James Maddren, and other mentors.";
    user.experience = 'Professional';
    await user.save();
    
    await profile.save();
    
    console.log('✅ Profile updated successfully');
    console.log('Bio length:', user.bio.length);
    console.log('Experience:', user.experience);
    console.log('Availability:', user.isAvailableForGigs);
    
    mongoose.connection.close();
  })
  .catch(err => {
    console.error('Error:', err.message);
    mongoose.connection.close();
  });