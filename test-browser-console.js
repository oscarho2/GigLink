// Test script to check browser console logs
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  // Listen to console logs
  page.on('console', msg => {
    console.log('BROWSER CONSOLE:', msg.type(), msg.text());
  });
  
  // Listen to network requests
  page.on('request', request => {
    if (request.url().includes('/api/')) {
      console.log('API REQUEST:', request.method(), request.url());
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('/api/')) {
      console.log('API RESPONSE:', response.status(), response.url());
    }
  });
  
  try {
    console.log('First navigating to set-auth.html to set token...');
    await page.goto('http://localhost:3000/set-auth.html', { waitUntil: 'networkidle2' });
    
    // Wait for redirect
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('Now checking messages page...');
    await page.goto('http://localhost:3000/messages', { waitUntil: 'networkidle2' });
    
    // Wait a bit to see console logs
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('Page loaded, checking for authentication token...');
    const token = await page.evaluate(() => {
      return localStorage.getItem('token');
    });
    
    console.log('Token in localStorage:', token ? 'Present' : 'Missing');
    
    if (token) {
      console.log('Token value:', token.substring(0, 20) + '...');
    }
    
    // Wait for conversations to load and try clicking on one
    console.log('Waiting for conversations to load...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Try to find and click on a conversation
    const conversationElements = await page.$$('[data-testid="conversation-item"], .MuiListItem-root');
    console.log('Found conversation elements:', conversationElements.length);
    
    if (conversationElements.length > 0) {
      console.log('Clicking on first conversation...');
      await conversationElements[0].click();
      
      // Wait to see fetchMessages logs
      await new Promise(resolve => setTimeout(resolve, 3000));
    } else {
      console.log('No conversation elements found to click');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();