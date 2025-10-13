import axios from 'axios';
import { executeTurnstile, resetTurnstile } from './turnstile';

const TURNSTILE_SITE_KEY = process.env.REACT_APP_TURNSTILE_SITE_KEY;

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['x-auth-token'] = token;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

export const withTurnstile = async (request) => {
  // Execute turnstile and pass the token to the request
  try {
    const token = await executeTurnstile();
    return await request(token);
  } catch (error) {
    console.error('Turnstile execution failed:', error);
    return await request(null);
  }
};

export default api;
