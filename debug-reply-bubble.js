// Debug script to check reply bubble data
// Run this in browser console on the messages page

function debugReplyBubbles() {
  console.log('=== REPLY BUBBLE DEBUG ===');
  
  // Check if we're on the messages page
  if (window.location.pathname !== '/messages') {
    console.log('❌ Not on messages page. Navigate to /messages first.');
    return;
  }
  
  // Look for message elements
  const messageElements = document.querySelectorAll('[id^="message-"]');
  console.log(`Found ${messageElements.length} message elements`);
  
  // Check for nested reply bubbles
  const replyBubbles = document.querySelectorAll('div[id^="message-"] > div > div > div');
  console.log(`Found ${replyBubbles.length} potential reply bubble containers`);
  
  // Look for specific reply indicators
  const replyIcons = document.querySelectorAll('svg[data-testid="ReplyIcon"]');
  console.log(`Found ${replyIcons.length} reply icons`);
  
  // Check React component state (if available)
  try {
    const reactRoot = document.querySelector('#root');
    if (reactRoot && reactRoot._reactInternalFiber) {
      console.log('React fiber found - checking component state...');
    }
  } catch (e) {
    console.log('Cannot access React internals');
  }
  
  // Check for messages with specific content
  const messageTexts = Array.from(document.querySelectorAll('p')).filter(p => 
    p.textContent === 'five' || p.textContent === 'six'
  );
  
  console.log('Messages found:', messageTexts.map(p => ({
    text: p.textContent,
    parent: p.closest('[id^="message-"]')?.id,
    hasReplyBubble: !!p.closest('div').querySelector('svg[data-testid="ReplyIcon"]')
  })));
  
  // Check network requests
  console.log('\nTo check network data:');
  console.log('1. Open Network tab in DevTools');
  console.log('2. Filter by "conversation"');
  console.log('3. Look for the response data and check if messages have replyTo field');
  
  // Check for console logs from the app
  console.log('\nLooking for app debug logs...');
  console.log('Check above for any "Message with reply found:" logs');
  
  return {
    messageElements: messageElements.length,
    replyBubbles: replyBubbles.length,
    replyIcons: replyIcons.length,
    targetMessages: messageTexts.length
  };
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
  debugReplyBubbles();
}

console.log('\nTo run this debug script:');
console.log('1. Copy this entire function to browser console');
console.log('2. Call debugReplyBubbles()');
console.log('3. Check the output for missing elements');