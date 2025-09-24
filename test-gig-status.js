const axios = require('axios');

// Test script to create a scenario for testing gig status display
const BASE_URL = 'http://localhost:5001';

// You'll need to replace these with actual user tokens from your application
const USER1_TOKEN = 'your_user1_token_here'; // User who will apply but not get accepted
const USER2_TOKEN = 'your_user2_token_here'; // User who will get accepted
const GIG_OWNER_TOKEN = 'your_gig_owner_token_here'; // User who owns the gig

async function testGigStatusScenario() {
  try {
    console.log('Testing gig status display scenario...');
    
    // Step 1: Get available gigs
    const gigsResponse = await axios.get(`${BASE_URL}/api/gigs`, {
      headers: { 'x-auth-token': USER1_TOKEN }
    });
    
    if (gigsResponse.data.length === 0) {
      console.log('No gigs found. Please create some gigs first.');
      return;
    }
    
    const testGig = gigsResponse.data[0];
    console.log(`Using gig: ${testGig.title}`);
    
    // Step 2: User 1 applies to the gig
    await axios.post(`${BASE_URL}/api/gigs/${testGig._id}/apply`, {
      message: 'I would love to play this gig!'
    }, {
      headers: { 'x-auth-token': USER1_TOKEN }
    });
    console.log('User 1 applied to the gig');
    
    // Step 3: User 2 applies to the gig
    await axios.post(`${BASE_URL}/api/gigs/${testGig._id}/apply`, {
      message: 'I am very experienced and available!'
    }, {
      headers: { 'x-auth-token': USER2_TOKEN }
    });
    console.log('User 2 applied to the gig');
    
    // Step 4: Get the gig details to find applicant IDs
    const gigDetailsResponse = await axios.get(`${BASE_URL}/api/gigs/${testGig._id}`, {
      headers: { 'x-auth-token': GIG_OWNER_TOKEN }
    });
    
    const applicants = gigDetailsResponse.data.applicants;
    if (applicants.length < 2) {
      console.log('Not enough applicants found');
      return;
    }
    
    // Find User 2's application
    const user2Application = applicants[1]; // Assuming User 2 is the second applicant
    const user2Id = typeof user2Application.user === 'string' ? user2Application.user : user2Application.user._id;
    
    // Step 5: Gig owner accepts User 2
    await axios.post(`${BASE_URL}/api/gigs/${testGig._id}/accept/${user2Id}`, {}, {
      headers: { 'x-auth-token': GIG_OWNER_TOKEN }
    });
    console.log('Gig owner accepted User 2');
    
    // Step 6: Check User 1's applications to see if it shows 'fixed' status
    const user1ApplicationsResponse = await axios.get(`${BASE_URL}/api/gigs/user/applications`, {
      headers: { 'x-auth-token': USER1_TOKEN }
    });
    
    const user1Application = user1ApplicationsResponse.data.find(app => app._id === testGig._id);
    if (user1Application) {
      console.log('User 1 application status:', user1Application.applicationStatus);
      console.log('Accepted by other:', user1Application.acceptedByOther);
      console.log('Is filled:', user1Application.isFilled);
      
      if (user1Application.acceptedByOther) {
        console.log('✅ SUCCESS: acceptedByOther is true - frontend should show "fixed" status');
      } else {
        console.log('❌ ISSUE: acceptedByOther is false - this should be true');
      }
    } else {
      console.log('❌ User 1 application not found');
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

// Instructions for use
console.log('To use this script:');
console.log('1. Log in to your application and get auth tokens for 3 different users');
console.log('2. Replace the token variables at the top of this file');
console.log('3. Make sure you have gigs available');
console.log('4. Run: node test-gig-status.js');
console.log('');
console.log('Uncomment the line below to run the test:');
console.log('// testGigStatusScenario();');

// Uncomment to run:
// testGigStatusScenario();