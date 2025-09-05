// Debug script to check if reply bubbles are rendering
console.log('=== Checking for Reply Bubbles ===');

// Check for messages with data-testid="reply-bubble"
const replyBubbles = document.querySelectorAll('[data-testid="reply-bubble"]');
console.log(`Found ${replyBubbles.length} reply bubbles with data-testid`);

// Check for any Paper components that might be reply bubbles
const allPapers = document.querySelectorAll('[class*="MuiPaper"]');
const potentialReplyBubbles = Array.from(allPapers).filter(paper => {
  return paper.textContent.includes('Unknown') || 
         paper.querySelector('[data-testid="ReplyIcon"]') ||
         paper.style.borderLeft?.includes('3px solid');
});
console.log(`Found ${potentialReplyBubbles.length} potential reply bubbles`);

// Check for messages that should have replies
const messageElements = document.querySelectorAll('[id^="message-"]');
console.log(`Found ${messageElements.length} message elements`);

// Look for any elements containing "five" or "six" (our test messages)
messageElements.forEach((msg, index) => {
  if (msg.textContent.includes('five') || msg.textContent.includes('six')) {
    console.log(`Message ${index + 1}:`, {
      id: msg.id,
      content: msg.textContent.substring(0, 100),
      hasReplyBubble: msg.querySelector('[data-testid="reply-bubble"]') !== null,
      paperCount: msg.querySelectorAll('[class*="MuiPaper"]').length
    });
  }
});

console.log('=== End Reply Bubble Check ===');