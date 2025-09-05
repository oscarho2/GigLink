const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false, devtools: true });
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    console.log('BROWSER LOG:', msg.text());
  });
  
  try {
    console.log('Navigating to localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    // Check if we need to login
    const loginButton = await page.$('a[href="/login"]');
    if (loginButton) {
      console.log('Need to login first...');
      await page.goto('http://localhost:3000/login');
      await page.waitForTimeout(2000);
      
      // Fill login form (you may need to adjust these selectors)
      await page.type('input[name="email"]', 'test@example.com');
      await page.type('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
    }
    
    // Navigate to messages
    console.log('Navigating to messages...');
    await page.goto('http://localhost:3000/messages');
    await page.waitForTimeout(3000);
    
    // Look for message bubbles and reply buttons
    console.log('Looking for messages and reply functionality...');
    
    // Wait for messages to load
    await page.waitForTimeout(5000);
    
    // Try to find a message with hover functionality
    const messages = await page.$$('.message-bubble, [data-testid="message"]');
    console.log('Found messages:', messages.length);
    
    if (messages.length > 0) {
      console.log('Hovering over first message to trigger reply button...');
      await messages[0].hover();
      await page.waitForTimeout(1000);
      
      // Look for reply button
      const replyButton = await page.$('[data-testid="reply-button"], button[aria-label*="reply"], button[title*="reply"]');
      if (replyButton) {
        console.log('Found reply button, clicking...');
        await replyButton.click();
        await page.waitForTimeout(2000);
        
        // Check if reply preview appears
        const replyPreview = await page.$('[data-testid="reply-preview"]');
        if (replyPreview) {
          console.log('SUCCESS: Reply preview is visible!');
        } else {
          console.log('ISSUE: Reply preview not found after clicking reply');
        }
      } else {
        console.log('ISSUE: Reply button not found on hover');
      }
    } else {
      console.log('ISSUE: No messages found to test reply functionality');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Keep browser open for manual inspection
    console.log('Test completed. Browser will stay open for manual inspection.');
    // await browser.close();
  }
})();