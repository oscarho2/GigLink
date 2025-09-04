// Script to set authentication token in browser localStorage
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiNjhiOTBhNTc4NDJkZjQyYjAzNTMwODI4IiwiZW1haWwiOiJhbGV4LmpvaG5zb25AZW1haWwuY29tIiwibmFtZSI6IkFsZXggSm9obnNvbiJ9LCJpYXQiOjE3NTcwMTEwNzgsImV4cCI6MTc1NzA5NzQ3OH0.T60jBylW_f6RCv_iYvIVCezifsnBi9C1KM7ZuaNWwuE';

// Set token in localStorage
localStorage.setItem('token', token);

// Set user data in localStorage
const userData = {
  id: '68b90a57842df42b03530828',
  name: 'Alex Johnson',
  email: 'alex.johnson@email.com'
};
localStorage.setItem('user', JSON.stringify(userData));

console.log('Token and user data set in localStorage');
console.log('Token:', localStorage.getItem('token'));
console.log('User:', localStorage.getItem('user'));

// Navigate to messages page
window.location.href = '/messages';