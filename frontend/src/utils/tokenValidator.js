// Token validation utility
export const isValidJWT = (token) => {
  if (!token || typeof token !== 'string') {
    return false;
  }
  
  // JWT should have 3 parts separated by dots
  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }
  
  try {
    // Try to decode the header and payload (basic validation)
    const header = JSON.parse(atob(parts[0]));
    const payload = JSON.parse(atob(parts[1]));
    
    // Check if token has expired
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return false;
    }
    
    return true;
  } catch (error) {
    // If we can't decode it, it's malformed
    return false;
  }
};

export const clearInvalidToken = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('hasLoggedOut');
  delete window.axios?.defaults?.headers?.common?.['x-auth-token'];
};