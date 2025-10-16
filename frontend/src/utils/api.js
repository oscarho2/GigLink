import axios from 'axios';
import { executeTurnstile } from './turnstile';
import { isTurnstileDisabled, TURNSTILE_DEV_BYPASS_TOKEN } from './turnstileFlags';

const TURNSTILE_DISABLED = isTurnstileDisabled();

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
  if (TURNSTILE_DISABLED) {
    return request(TURNSTILE_DEV_BYPASS_TOKEN);
  }

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
