const { getAuth } = require('firebase-admin/auth');
const User = require('../models/User');

// ─── Verify Firebase ID Token ─────────────────
const verifyFirebaseToken = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    // Verify with Firebase Admin SDK (v11+ API)
    const decodedToken = await getAuth().verifyIdToken(token);

    // Find MongoDB user by firebaseUid
    const user = await User.findOne({ firebaseUid: decodedToken.uid }).select(
      '-password'
    );

    if (!user) {
      // User exists in Firebase but not MongoDB — needs sync
      return res.status(401).json({
        success: false,
        message: 'User not synced. Please call /auth/sync first.',
        needsSync: true,
      });
    }

    req.user = user;
    req.firebaseUser = decodedToken;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      error: error.message,
    });
  }
};

// ─── Admin only ────────────────────────────────
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Access denied — admin only',
  });
};

module.exports = { verifyFirebaseToken, adminOnly };