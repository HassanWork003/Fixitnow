const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getAuth } = require('firebase-admin/auth');

const router = express.Router();

const { verifyFirebaseToken } = require('../middleware/firebaseAuth');
// ═══════════════════════════════════════════════
// FIREBASE AUTH ENDPOINTS
// ═══════════════════════════════════════════════

// ─── @route   POST /auth/sync ─────────────────
// Called after Firebase signup/login
// Verifies Firebase ID token and creates/updates MongoDB user
router.post('/sync', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await getAuth().verifyIdToken(idToken);

    // Find or create user in MongoDB
    let user = await User.findOne({ firebaseUid: decodedToken.uid });

    if (!user) {
      // First time — create the user
      user = await User.create({
        firebaseUid: decodedToken.uid,
        email: decodedToken.email || req.body.email || '',
        name: decodedToken.name || req.body.name || 'New User',
        phone: decodedToken.phone_number || req.body.phone,
        role: 'citizen', // default role
      });
      console.log(`👤 New user synced: ${user.email} (${user.role})`);
    } else {
      // Update name/phone if changed
      let updated = false;
      if (req.body.name && user.name !== req.body.name) {
        user.name = req.body.name;
        updated = true;
      }
      if (req.body.phone && user.phone !== req.body.phone) {
        user.phone = req.body.phone;
        updated = true;
      }
      if (updated) await user.save();
    }

    res.json({
      success: true,
      message: 'User synced successfully',
      user: {
        id: user._id,
        firebaseUid: user.firebaseUid,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Sync error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to sync user',
      error: error.message,
    });
  }
});

// ─── @route   GET /auth/me ────────────────────
// Get current user from Firebase token
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await getAuth().verifyIdToken(idToken);

    const user = await User.findOne({ firebaseUid: decodedToken.uid }).select(
      '-password'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        firebaseUid: user.firebaseUid,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: error.message,
    });
  }
});

// ═══════════════════════════════════════════════
// LEGACY AUTH ENDPOINTS (keep for backward compat)
// ═══════════════════════════════════════════════

// ─── Helper: Generate JWT ─────────────────────
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// ─── @route   POST /auth/signup ───────────────
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      phone,
      password: hashedPassword,
      role: 'citizen',
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error during signup',
      error: error.message,
    });
  }
});

// ─── @route   POST /auth/login ────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message,
    });
  }
});

// ─── @route   PATCH /auth/profile ─────────────
// Update name + phone for the logged-in user
router.patch('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await getAuth().verifyIdToken(idToken);

    const { name, phone } = req.body;

    const user = await User.findOneAndUpdate(
      { firebaseUid: decodedToken.uid },
      {
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Sync name with Firebase Auth (non-blocking)
    if (name) {
      try {
        await getAuth().updateUser(decodedToken.uid, {
          displayName: name,
        });
      } catch (e) {
        console.error('Firebase displayName sync failed:', e.message);
      }
    }

    res.json({
      success: true,
      message: 'Profile updated',
      user: {
        id: user._id,
        firebaseUid: user.firebaseUid,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message,
    });
  }
});

// ─── @route   PATCH /auth/fcm-token ───────────
// Save or clear the FCM token for push notifications
router.patch('/fcm-token', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await getAuth().verifyIdToken(idToken);

    const { fcmToken } = req.body;

    const user = await User.findOneAndUpdate(
      { firebaseUid: decodedToken.uid },
      { fcmToken: fcmToken || null },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    console.log(
      `📱 FCM token ${
        fcmToken ? 'saved' : 'cleared'
      } for ${user.email}`
    );

    res.json({
      success: true,
      message: fcmToken ? 'FCM token saved' : 'FCM token cleared',
    });
  } catch (error) {
    console.error('FCM token save error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to save FCM token',
      error: error.message,
    });
  }
});

// ─── @route   GET /auth/notification-prefs ────
router.get('/notification-prefs', verifyFirebaseToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      'notificationEnabled'
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      notificationEnabled: user.notificationEnabled !== false,
    });
  } catch (error) {
    console.error('Get prefs error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── @route   PATCH /auth/notification-prefs ──
router.patch('/notification-prefs', verifyFirebaseToken, async (req, res) => {
  try {
    const { notificationEnabled } = req.body;

    if (typeof notificationEnabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'notificationEnabled must be a boolean',
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { notificationEnabled },
      { new: true }
    ).select('notificationEnabled');

    res.json({
      success: true,
      message: notificationEnabled
        ? 'Notifications enabled'
        : 'Notifications disabled',
      notificationEnabled: user.notificationEnabled,
    });
  } catch (error) {
    console.error('Update prefs error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;