const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { check, validationResult } = require('express-validator');
const { OAuth2Client } = require('google-auth-library');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Profile = require('../models/Profile');
const { checkTurnstile } = require('../middleware/turnstile');
const { downloadImage } = require('../utils/imageDownloader');
const { getPublicUrl } = require('../utils/r2Config');
const { sendPasswordResetEmail } = require('../utils/emailService');
const { isAdminEmail } = require('../utils/adminAuth');
const path = require('path');
const {
  verifyIdToken: verifyAppleIdToken,
  exchangeAuthorizationCode: exchangeAppleAuthorizationCode
} = require('../utils/appleAuth');

// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// @route   GET api/auth/google/client
// @desc    Provide Google OAuth client ID to frontend
// @access  Public
router.get('/google/client', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(503).json({ message: 'Google client ID not configured' });
  }
  res.json({ clientId });
});

// @route   GET api/auth
// @desc    Get authenticated user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const userObj = user.toObject();
    userObj.avatar = getPublicUrl(userObj.avatar);
    userObj.isAdmin = isAdminEmail(user.email);
    
    res.json(userObj);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/auth
// @desc    Authenticate user & get token
// @access  Public
router.post(
  '/',
  [
    checkTurnstile, // Add turnstile check
    check('email', 'Please include a valid email')
      .isEmail()
      .normalizeEmail()
      .isLength({ max: 100 })
      .withMessage('Email must be less than 100 characters'),
    check('password', 'Password is required')
      .exists()
      .isLength({ min: 1 })
      .withMessage('Password cannot be empty')
  ],
  async (req, res) => {
    console.log('Login route hit');
    const { email, password } = req.body;
    console.log('Login request received for:', email);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // Normalize email to lowercase
      const normalizedEmail = email.toLowerCase().trim();
      
      // Check if user exists
      const user = await User.findOne({ email: normalizedEmail });
      let isMatch = false;
      
      if (user) {
        isMatch = await user.comparePassword(password);
      }
      
      if (!user) {
        return res.status(400).json({ 
          errors: [{ msg: 'This email is not registered. Please join to create an account.' }],
          type: 'unregistered_email'
        });
      }

      if (!isMatch) {
        return res.status(400).json({ errors: [{ msg: 'Invalid credentials' }] });
      }

      if (user.accountStatus === 'suspended') {
        return res.status(403).json({ message: 'Account suspended. Please contact support for assistance.' });
      }

      // Return JWT with user info
      const isAdmin = isAdminEmail(user.email);
      const payload = {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          isEmailVerified: user.isEmailVerified,
          isAdmin
        }
      };

      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        (err, token) => {
          if (err) {
            console.error('JWT signing error:', err);
            return res.status(500).json({ errors: [{ msg: 'Error generating token' }] });
          }
          res.json({ 
            token,
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              avatar: getPublicUrl(user.avatar),
              isEmailVerified: user.isEmailVerified,
              isAdmin
            }
          });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route   POST api/auth/google
// @desc    Authenticate user with Google OAuth
// @access  Public
router.post('/google', async (req, res) => {
  try {
    console.log('🔵 Google OAuth request started');
    const { idToken, email, name, imageUrl } = req.body;

    if (!idToken) {
      console.log('❌ No ID token provided');
      return res.status(400).json({ message: 'ID token is required' });
    }

    console.log('🔍 Verifying Google ID token...');
    // Verify Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const googleId = payload['sub'];
    const verifiedEmail = payload['email'];
    const emailVerified = payload['email_verified'];

    console.log('✅ Google token verified for:', verifiedEmail);

    // Verify email matches
    if (verifiedEmail !== email) {
      console.log('❌ Email verification failed');
      return res.status(400).json({ message: 'Email verification failed' });
    }

    // Normalize email
    const normalizedEmail = verifiedEmail.toLowerCase().trim();

    console.log('🔍 Checking for existing user...');
    const [googleUser, emailUser] = await Promise.all([
      User.findOne({ googleId }),
      User.findOne({ email: normalizedEmail })
    ]);

    if (googleUser && emailUser && googleUser.id !== emailUser.id) {
      return res.status(409).json({
        type: 'account_conflict',
        message:
          'An account already exists for this Google account, and a different account exists for this email. Please sign in using your original method and contact support to merge accounts.'
      });
    }

    if (!googleUser && emailUser) {
      if (emailUser.googleId && emailUser.googleId !== googleId) {
        return res.status(409).json({
          type: 'google_link_mismatch',
          message:
            'This email is already linked to a different Google account. Please sign in with your original method and contact support if you need help.'
        });
      }

      if (!emailUser.googleId) {
        const linkToken = jwt.sign(
          {
            googleLink: {
              googleId,
              email: normalizedEmail,
              name: payload?.name || name || '',
              picture: payload?.picture || imageUrl || ''
            }
          },
          process.env.JWT_SECRET,
          { expiresIn: '10m' }
        );

        return res.status(409).json({
          type: 'link_required',
          message:
            'An account already exists for this email. Please confirm your email and password to link Sign in with Google.',
          email: normalizedEmail,
          linkToken
        });
      }
    }

    let user = googleUser || emailUser;

    console.log('📥 Downloading avatar image...');
    let avatarPath = null;
    const resolvedImageUrl = payload?.picture || imageUrl;
    if (resolvedImageUrl) {
      try {
        const uploadsDir = path.join(__dirname, '../uploads/images');
        avatarPath = await downloadImage(resolvedImageUrl, uploadsDir);
        console.log('📸 Avatar download result:', avatarPath ? 'Success' : 'Failed');
      } catch (downloadError) {
        console.warn('📸 Avatar download failed:', downloadError?.message || downloadError);
      }
    }

    if (user) {
      console.log('👤 Found existing user:', user._id);
      // Update Google ID and avatar if not set
      let needsUpdate = false;
      if (!user.googleId) {
        user.googleId = googleId;
        needsUpdate = true;
      }
      if (avatarPath && (!user.avatar || user.avatar !== avatarPath)) {
        user.avatar = avatarPath;
        needsUpdate = true;
      }
      if (!user.isEmailVerified && emailVerified) {
        user.isEmailVerified = true;
        needsUpdate = true;
      }
      if (!user.name && (payload?.name || name)) {
        user.name = payload?.name || name;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        console.log('💾 Updating existing user...');
        try {
          await user.save();
        } catch (saveError) {
          if (saveError?.code === 11000) {
            return res.status(409).json({
              type: 'google_already_linked',
              message:
                'This Google account is already linked to another GigLink account. Please sign in using your original method and contact support to merge accounts.'
            });
          }
          throw saveError;
        }
        console.log('✅ User updated successfully');
      }
    } else {
      console.log('➕ Creating new user...');
      // Create new user - let the pre-save middleware handle password hashing
      user = new User({
        name: payload?.name || name || verifiedEmail.split('@')[0],
        email: normalizedEmail,
        googleId: googleId,
        avatar: avatarPath,
        password: 'google_oauth_user', // This will be hashed by the pre-save middleware
        isEmailVerified: true // Google users are considered verified
      });
      
      // Save the new user normally
      try {
        await user.save();
      } catch (saveError) {
        if (saveError?.code === 11000) {
          return res.status(409).json({
            type: 'email_already_registered',
            message:
              'This email is already registered. Please sign in with your email/password first, then link Sign in with Google.'
          });
        }
        throw saveError;
      }
      console.log('✅ New user created:', user._id);
    }

    console.log('🔍 Ensuring user profile exists...');
    // Check if user has a profile, create default if missing
    let profile = await Profile.findOne({ user: user._id });
    if (!profile) {
      try {
        profile = await Profile.create({
          user: user._id,
          skills: [],
          videos: []
        });
        console.log('🆕 Default profile created for user:', user._id);
      } catch (profileErr) {
        console.error('❌ Failed to create default profile:', profileErr);
      }
    }
    const profileComplete = !!profile;
    console.log('📋 Profile present:', profileComplete);

    if (user.accountStatus === 'suspended') {
      console.log('⛔ Account suspended, aborting login');
      return res.status(403).json({ message: 'Account suspended. Please contact support for assistance.' });
    }

    const isAdmin = isAdminEmail(user.email);
    console.log('🔑 Generating JWT token...');
    // Generate JWT token
    const jwtPayload = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isEmailVerified: user.isEmailVerified,
        isAdmin
      }
    };

    jwt.sign(
      jwtPayload,
      process.env.JWT_SECRET,
      (err, token) => {
        if (err) {
          console.error('❌ JWT signing error:', err);
          return res.status(500).json({ message: 'Error generating token' });
        }
        
        console.log('✅ Google OAuth completed successfully for user:', user._id);
        res.json({
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: getPublicUrl(user.avatar),
            isEmailVerified: user.isEmailVerified,
            isAdmin,
            profileComplete: profileComplete
          }
        });
      }
    );
  } catch (error) {
    console.error('❌ Google OAuth Error:', error);
    console.error('📍 Error stack:', error.stack);
    
    // Provide more specific error messages
    if (error.message && error.message.includes('Invalid token')) {
      return res.status(400).json({ message: 'Invalid Google token' });
    }
    
    res.status(500).json({ 
      message: 'Server error during Google authentication',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

// @route   POST api/auth/google/confirm-link
// @desc    Confirm ownership of an existing email account and link Google Sign-In, then create a session
// @access  Public
router.post('/google/confirm-link', async (req, res) => {
  try {
    const { linkToken, email, password } = req.body || {};

    if (!linkToken || typeof linkToken !== 'string') {
      return res.status(400).json({ message: 'linkToken is required' });
    }

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: 'email is required' });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ message: 'password is required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(linkToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ type: 'link_token_invalid', message: 'Google link request has expired. Please try again.' });
    }

    const googleLink = decoded?.googleLink || {};
    const googleId = googleLink.googleId;
    const tokenEmail = (googleLink.email || '').toLowerCase().trim();
    const normalizedEmail = email.toLowerCase().trim();

    if (!googleId) {
      return res.status(400).json({ type: 'link_token_invalid', message: 'Invalid Google link request. Please try again.' });
    }

    if (!tokenEmail || tokenEmail !== normalizedEmail) {
      return res.status(400).json({
        type: 'email_mismatch',
        message: 'Please enter the same email address that is associated with your Google sign-in.'
      });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ type: 'user_not_found', message: 'No account found for that email.' });
    }

    if (user.accountStatus === 'suspended') {
      return res.status(403).json({ message: 'Account suspended. Please contact support for assistance.' });
    }

    const validPassword = await user.comparePassword(password);
    if (!validPassword) {
      return res.status(401).json({ type: 'invalid_credentials', message: 'Incorrect password.' });
    }

    if (user.googleId && user.googleId !== googleId) {
      return res.status(409).json({
        type: 'google_link_mismatch',
        message:
          'This email is already linked to a different Google account. Please sign in with your original method and contact support if you need help.'
      });
    }

    const existingOwner = await User.findOne({ googleId });
    if (existingOwner && existingOwner.id !== user.id) {
      return res.status(409).json({
        type: 'google_already_linked',
        message:
          'This Google account is already linked to another GigLink account. Please sign in using your original method and contact support to merge accounts.'
      });
    }

    let avatarPath = null;
    const resolvedPicture = typeof googleLink.picture === 'string' ? googleLink.picture.trim() : '';
    if (resolvedPicture) {
      try {
        const uploadsDir = path.join(__dirname, '../uploads/images');
        avatarPath = await downloadImage(resolvedPicture, uploadsDir);
      } catch (err) {
        // ignore
      }
    }

    let needsUpdate = false;
    if (!user.googleId) {
      user.googleId = googleId;
      needsUpdate = true;
    }
    if (!user.name && typeof googleLink.name === 'string' && googleLink.name.trim()) {
      user.name = googleLink.name.trim();
      needsUpdate = true;
    }
    if (avatarPath && (!user.avatar || user.avatar !== avatarPath)) {
      user.avatar = avatarPath;
      needsUpdate = true;
    }
    if (!user.isEmailVerified) {
      user.isEmailVerified = true;
      needsUpdate = true;
    }

    if (needsUpdate) {
      try {
        await user.save();
      } catch (saveError) {
        if (saveError?.code === 11000) {
          return res.status(409).json({
            type: 'google_already_linked',
            message:
              'This Google account is already linked to another GigLink account. Please sign in using your original method and contact support to merge accounts.'
          });
        }
        throw saveError;
      }
    }

    let profile = await Profile.findOne({ user: user._id });
    if (!profile) {
      try {
        profile = await Profile.create({ user: user._id, skills: [], videos: [] });
      } catch (profileError) {
        console.error('Failed to create default profile for Google-linked user:', profileError);
      }
    }
    const profileComplete = !!profile;

    const isAdmin = isAdminEmail(user.email);
    const tokenPayload = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isEmailVerified: user.isEmailVerified,
        isAdmin
      }
    };

    jwt.sign(tokenPayload, process.env.JWT_SECRET, (err, token) => {
      if (err) {
        console.error('Error generating JWT for Google link confirm:', err);
        return res.status(500).json({ message: 'Error generating token' });
      }

      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: getPublicUrl(user.avatar),
          isEmailVerified: user.isEmailVerified,
          isAdmin,
          profileComplete
        }
      });
    });
  } catch (error) {
    console.error('Google confirm-link error:', error);
    res.status(500).json({
      message: 'Server error during Google account linking',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

// @route   POST api/auth/apple
// @desc    Authenticate user with Apple Sign-In
// @access  Public
router.post('/apple', async (req, res) => {
  try {
    const requestBody = req.body || {};
    const {
      authorizationCode,
      idToken,
      identityToken: identityTokenFromBody,
      email: providedEmail,
      fullName
    } = requestBody;
    const rawUserInfo = requestBody.user || {};

    if (!authorizationCode && !idToken) {
      return res.status(400).json({ message: 'Apple authorization code or identity token is required' });
    }

    let tokenExchangeResponse = null;
    if (authorizationCode) {
      try {
        tokenExchangeResponse = await exchangeAppleAuthorizationCode(authorizationCode);
      } catch (exchangeError) {
        console.error('Apple authorization code exchange failed:', exchangeError?.response?.data || exchangeError.message);
        return res.status(400).json({ message: 'Invalid or expired Apple authorization code' });
      }
    }

    const resolvedIdentityToken = idToken || identityTokenFromBody || tokenExchangeResponse?.id_token;
    if (!resolvedIdentityToken) {
      return res.status(400).json({ message: 'Unable to verify Apple identity token' });
    }

    let applePayload;
    try {
      applePayload = await verifyAppleIdToken(resolvedIdentityToken);
    } catch (verificationError) {
      console.error('Apple identity token verification failed:', verificationError.message);
      return res.status(400).json({ message: 'Apple identity token verification failed' });
    }

    const appleId = applePayload?.sub;
    if (!appleId) {
      return res.status(400).json({ message: 'Apple identity token is missing subject identifier' });
    }

    const normalizedEmail = (applePayload.email || providedEmail || '').toLowerCase().trim();
    const emailVerificationFieldPresent = Object.prototype.hasOwnProperty.call(applePayload, 'email_verified');
    const isAppleEmailVerified = applePayload.email_verified === 'true' || applePayload.email_verified === true;
    const shouldMarkEmailVerified = isAppleEmailVerified || !emailVerificationFieldPresent;

    const nameFromApplePayload = (() => {
      if (typeof fullName === 'string' && fullName.trim()) {
        return fullName.trim();
      }
      const userName = rawUserInfo.name || {};
      const firstName = userName.firstName || userName.givenName || '';
      const lastName = userName.lastName || userName.familyName || '';
      const combined = `${firstName} ${lastName}`.trim();
      return combined || (normalizedEmail ? normalizedEmail.split('@')[0] : 'Apple User');
    })();

    const [appleUser, emailUser] = await Promise.all([
      User.findOne({ appleId }),
      normalizedEmail ? User.findOne({ email: normalizedEmail }) : Promise.resolve(null)
    ]);

    if (appleUser && emailUser && appleUser.id !== emailUser.id) {
      return res.status(409).json({
        type: 'account_conflict',
        message:
          'An account already exists for this Apple ID, and a different account exists for this email. Please sign in using your email/password and contact support to merge accounts.'
      });
    }

    if (!appleUser && emailUser) {
      if (emailUser.appleId && emailUser.appleId === appleId) {
        // Already linked; proceed to create session below.
      } else if (emailUser.appleId && emailUser.appleId !== appleId) {
        return res.status(409).json({
          type: 'apple_link_mismatch',
          message:
            'This email is already linked to a different Apple account. Please sign in with your original method and contact support if you need help.'
        });
      } else {
        const linkToken = jwt.sign(
          {
            appleLink: {
              appleId,
              email: normalizedEmail
            }
          },
          process.env.JWT_SECRET,
          { expiresIn: '10m' }
        );

        return res.status(409).json({
          type: 'link_required',
          message:
            'An account already exists for this email. Please confirm your email and password to link Sign in with Apple.',
          email: normalizedEmail,
          linkToken
        });
      }
    }

    let user = appleUser || emailUser;

    if (user) {
      let updated = false;

      if (user.appleId && user.appleId !== appleId) {
        return res.status(409).json({
          type: 'apple_link_mismatch',
          message:
            'This email is already linked to a different Apple account. Please sign in with your original method and contact support if you need help.'
        });
      }

      if (!user.appleId) {
        user.appleId = appleId;
        updated = true;
      }

      if (normalizedEmail && user.email !== normalizedEmail) {
        // If the account was created with a different email (e.g. Google), do not overwrite unless empty
        if (!user.email) {
          user.email = normalizedEmail;
          updated = true;
        }
      }

      if (!user.isEmailVerified && shouldMarkEmailVerified) {
        user.isEmailVerified = true;
        updated = true;
      }

      if (!user.name && nameFromApplePayload) {
        user.name = nameFromApplePayload;
        updated = true;
      }

      if (updated) {
        try {
          await user.save();
        } catch (saveError) {
          if (saveError?.code === 11000) {
            return res.status(409).json({
              type: 'apple_already_linked',
              message:
                'This Apple account is already linked to another GigLink account. Please sign in using your original method and contact support to merge accounts.'
            });
          }
          throw saveError;
        }
      }
    } else {
      if (!normalizedEmail) {
        return res.status(400).json({
          message: 'Apple did not return an email address for this account. Please allow email sharing or use another sign-in method.'
        });
      }

      const generatedPassword = crypto.randomBytes(32).toString('hex');
      user = new User({
        name: nameFromApplePayload,
        email: normalizedEmail,
        appleId,
        password: generatedPassword,
        isEmailVerified: shouldMarkEmailVerified
      });

      try {
        await user.save();
      } catch (saveError) {
        if (saveError?.code === 11000) {
          return res.status(409).json({
            type: 'email_already_registered',
            message:
              'This email is already registered. Please sign in with your email/password first, then link Sign in with Apple.'
          });
        }
        throw saveError;
      }
    }

    if (user.accountStatus === 'suspended') {
      return res.status(403).json({ message: 'Account suspended. Please contact support for assistance.' });
    }

    let profile = await Profile.findOne({ user: user._id });
    if (!profile) {
      try {
        profile = await Profile.create({
          user: user._id,
          skills: [],
          videos: []
        });
      } catch (profileError) {
        console.error('Failed to create default profile for Apple user:', profileError);
      }
    }
    const profileComplete = !!profile;

    const isAdmin = isAdminEmail(user.email);
    const tokenPayload = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isEmailVerified: user.isEmailVerified,
        isAdmin
      }
    };

    jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      (err, token) => {
        if (err) {
          console.error('Error generating JWT for Apple sign-in:', err);
          return res.status(500).json({ message: 'Error generating token' });
        }

        res.json({
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: getPublicUrl(user.avatar),
            isEmailVerified: user.isEmailVerified,
            isAdmin,
            profileComplete
          }
        });
      }
    );
  } catch (error) {
    console.error('Apple sign-in error:', error);
    res.status(500).json({
      message: 'Server error during Apple authentication',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

// @route   POST api/auth/apple/confirm-link
// @desc    Confirm ownership of an existing email account and link Apple Sign-In, then create a session
// @access  Public
router.post('/apple/confirm-link', async (req, res) => {
  try {
    const { linkToken, email, password } = req.body || {};

    if (!linkToken || typeof linkToken !== 'string') {
      return res.status(400).json({ message: 'linkToken is required' });
    }

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: 'email is required' });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ message: 'password is required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(linkToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ type: 'link_token_invalid', message: 'Apple link request has expired. Please try again.' });
    }

    const appleLink = decoded?.appleLink || {};
    const appleId = appleLink.appleId;
    const tokenEmail = (appleLink.email || '').toLowerCase().trim();
    const normalizedEmail = email.toLowerCase().trim();

    if (!appleId) {
      return res.status(400).json({ type: 'link_token_invalid', message: 'Invalid Apple link request. Please try again.' });
    }

    if (!tokenEmail || tokenEmail !== normalizedEmail) {
      return res.status(400).json({
        type: 'email_mismatch',
        message: 'Please enter the same email address that is associated with your Apple sign-in.'
      });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ type: 'user_not_found', message: 'No account found for that email.' });
    }

    if (user.accountStatus === 'suspended') {
      return res.status(403).json({ message: 'Account suspended. Please contact support for assistance.' });
    }

    const validPassword = await user.comparePassword(password);
    if (!validPassword) {
      return res.status(401).json({ type: 'invalid_credentials', message: 'Incorrect password.' });
    }

    if (user.appleId && user.appleId !== appleId) {
      return res.status(409).json({
        type: 'apple_link_mismatch',
        message:
          'This email is already linked to a different Apple account. Please sign in with your original method and contact support if you need help.'
      });
    }

    const existingOwner = await User.findOne({ appleId });
    if (existingOwner && existingOwner.id !== user.id) {
      return res.status(409).json({
        type: 'apple_already_linked',
        message:
          'This Apple account is already linked to another GigLink account. Please sign in using your original method and contact support to merge accounts.'
      });
    }

    if (!user.appleId) {
      user.appleId = appleId;
      try {
        await user.save();
      } catch (saveError) {
        if (saveError?.code === 11000) {
          return res.status(409).json({
            type: 'apple_already_linked',
            message:
              'This Apple account is already linked to another GigLink account. Please sign in using your original method and contact support to merge accounts.'
          });
        }
        throw saveError;
      }
    }

    let profile = await Profile.findOne({ user: user._id });
    if (!profile) {
      try {
        profile = await Profile.create({ user: user._id, skills: [], videos: [] });
      } catch (profileError) {
        console.error('Failed to create default profile for Apple-linked user:', profileError);
      }
    }
    const profileComplete = !!profile;

    const isAdmin = isAdminEmail(user.email);
    const tokenPayload = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isEmailVerified: user.isEmailVerified,
        isAdmin
      }
    };

    jwt.sign(tokenPayload, process.env.JWT_SECRET, (err, token) => {
      if (err) {
        console.error('Error generating JWT for Apple link confirm:', err);
        return res.status(500).json({ message: 'Error generating token' });
      }

      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: getPublicUrl(user.avatar),
          isEmailVerified: user.isEmailVerified,
          isAdmin,
          profileComplete
        }
      });
    });
  } catch (error) {
    console.error('Apple confirm-link error:', error);
    res.status(500).json({
      message: 'Server error during Apple account linking',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

// @route   GET api/auth/verify-email/:token
// @desc    Verify user email
// @access  Public
router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    if (!token) {
      return res.status(400).json({ 
        success: false,
        message: 'Verification token is required' 
      });
    }

    // Find user with this verification token
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      // Check if token exists but is expired (to differentiate from invalid token)
      const expiredUser = await User.findOne({
        emailVerificationToken: token
      });
      
      if (expiredUser) {
        // Token exists but has expired
        return res.status(400).json({ 
          success: false,
          message: 'This verification link has expired. Verification links are only valid for 24 hours for security purposes.',
          expired: true
        });
      } else {
        // Token doesn't exist at all - could be already used/verified
        // Before returning an error, let's see if we can identify if the user was already verified
        // by somehow tracking that this token had been used, but we don't store that currently
        return res.status(400).json({ 
          success: false,
          message: 'Invalid or already used verification token' 
        });
      }
    }

    // If we have a user, check if they are already verified
    // This would happen if there's some race condition where verification happens twice
    // before the first request completes
    if (user.isEmailVerified) {
      return res.status(200).json({ 
        success: true,
        message: 'Your email has already been verified successfully!',
        alreadyVerified: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      });
    }

    // Mark email as verified and clear verification fields
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.json({ 
      success: true,
      message: 'Email verified successfully! You can now log in to your account.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (err) {
    console.error('Email verification error:', err.message);
    res.status(500).json({ 
      success: false,
      message: 'Server error during email verification' 
    });
  }
});

// @route   POST api/auth/forgot-password
// @desc    Request password reset
// @access  Public
router.post(
  '/forgot-password',
  [
    check('email', 'Please include a valid email')
      .isEmail()
      .normalizeEmail()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    try {
      const normalizedEmail = email.toLowerCase().trim();
      const user = await User.findOne({ email: normalizedEmail });

      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: 'User not found' 
        });
      }

      // Generate password reset token
      const passwordResetToken = crypto.randomBytes(32).toString('hex');
      const passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Save reset token to user
      user.passwordResetToken = passwordResetToken;
      user.passwordResetExpires = passwordResetExpires;
      await user.save();

      // Send password reset email
      try {
        await sendPasswordResetEmail(user.email, user.name, passwordResetToken);
        
        res.json({ 
          success: true,
          message: 'A password reset link has been sent to your email.' 
        });
      } catch (emailErr) {
        console.error('Error sending password reset email:', emailErr);
        res.status(500).json({ 
          success: false,
          message: 'Error sending password reset email. Please try again later.' 
        });
      }
    } catch (err) {
      console.error('Password reset request error:', err.message);
      res.status(500).json({ 
        success: false,
        message: 'Server error during password reset request' 
      });
    }
  }
);

// @route   POST api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post(
  '/reset-password',
  [
    check('token', 'Reset token is required')
      .not().isEmpty(),
    check('password', 'Password must be at least 8 characters long')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, password } = req.body;

    try {
      // Find user with valid reset token
      const user = await User.findOne({
        passwordResetToken: token,
        passwordResetExpires: { $gt: Date.now() }
      });

      if (!user) {
        return res.status(400).json({ 
          success: false,
          message: 'Invalid or expired password reset token' 
        });
      }

      // Update password and clear reset fields
      user.password = password;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      res.json({ 
        success: true,
        message: 'Password reset successfully! You can now log in with your new password.' 
      });
    } catch (err) {
      console.error('Password reset error:', err.message);
      res.status(500).json({ 
        success: false,
        message: 'Server error during password reset' 
      });
    }
  }
);

// @route   GET api/auth/user-from-token/:token
// @desc    Get user email from password reset token
// @access  Public
router.get('/user-from-token/:token', async (req, res) => {
  try {
    const user = await User.findOne({
      passwordResetToken: req.params.token,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(404).json({ msg: 'User not found or token expired' });
    }

    res.json({ email: user.email });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
