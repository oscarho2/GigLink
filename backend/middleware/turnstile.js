const checkTurnstile = async (req, res, next) => {
  // Turnstile is temporarily disabled
  return next();
};
