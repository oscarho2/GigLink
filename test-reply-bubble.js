// Simple test to verify reply bubble functionality
// This script helps you test the nested reply bubbles manually

console.log('='.repeat(60));
console.log('REPLY BUBBLE FUNCTIONALITY TEST');
console.log('='.repeat(60));
console.log('');
console.log('To test the nested reply bubbles:');
console.log('');
console.log('1. Open http://localhost:3000 in your browser');
console.log('2. Login with a user account');
console.log('3. Start a conversation with another user');
console.log('4. Send a message');
console.log('5. Hover over the message to see reply button');
console.log('6. Click the reply button');
console.log('7. You should see a reply preview at the bottom');
console.log('8. Type a reply message and send it');
console.log('9. The new message should show a nested bubble with the original message');
console.log('');
console.log('Expected behavior:');
console.log('- Reply preview appears when you click reply button');
console.log('- Sent reply message shows nested bubble with original message content');
console.log('- Nested bubble has blue left border and shows sender name');
console.log('- Clicking nested bubble scrolls to original message');
console.log('');
console.log('If the nested bubble is not appearing:');
console.log('- Check browser console for errors');
console.log('- Check that replyTo field is being sent in network tab');
console.log('- Verify backend is populating replyTo.sender properly');
console.log('');
console.log('='.repeat(60));

// Function to check if reply functionality is working
function checkReplyFunctionality() {
  console.log('\nChecking reply functionality...');
  
  // Check if we're on the messages page
  if (typeof window !== 'undefined' && window.location.pathname === '/messages') {
    console.log('✅ On messages page');
    
    // Check if reply buttons exist
    const replyButtons = document.querySelectorAll('[data-testid="reply-button"]');
    if (replyButtons.length > 0) {
      console.log('✅ Reply buttons found');
    } else {
      console.log('❌ No reply buttons found - hover over a message to see them');
    }
    
    // Check if any messages have nested reply bubbles
    const replyBubbles = document.querySelectorAll('[data-testid="reply-bubble"]');
    if (replyBubbles.length > 0) {
      console.log('✅ Reply bubbles found:', replyBubbles.length);
    } else {
      console.log('❌ No reply bubbles found - try sending a reply to see them');
    }
    
  } else {
    console.log('❌ Not on messages page - navigate to /messages first');
  }
}

// If running in browser, run the check
if (typeof window !== 'undefined') {
  checkReplyFunctionality();
}

console.log('\nTo run this check in browser console:');
console.log('1. Open browser dev tools (F12)');
console.log('2. Go to Console tab');
console.log('3. Copy and paste the checkReplyFunctionality function');
console.log('4. Call checkReplyFunctionality()');