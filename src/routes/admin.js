const express = require('express');
const router = express.Router();

const { getAuth } = require('firebase-admin/auth');
const User = require('../models/User');
const {
  verifyFirebaseToken,
  adminOnly,
} = require('../middleware/firebaseAuth');

const SUPERADMIN_EMAIL = 'hassan@fixitnow.pk';

// All admin routes require authentication and admin role
router.use(verifyFirebaseToken);
router.use(adminOnly);

// Only the superadmin can create or delete admins
const superAdminOnly = (req, res, next) => {
  const email = req.user?.email?.toLowerCase();

  if (email !== SUPERADMIN_EMAIL) {
    return res.status(403).json({
      success: false,
      message: 'Only the superadmin can manage admins',
    });
  }

  next();
};

// Admin dashboard stats
router.get('/stats', async (req, res) => {
  res.json({
    success: true,
    message: 'Admin stats coming soon',
  });
});

// Create a new admin
router.post('/create-admin', superAdminOnly, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: cleanEmail });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email already exists',
      });
    }

    const firebaseUser = await getAuth().createUser({
      email: cleanEmail,
      password,
      displayName: name.trim(),
    });

    const newAdmin = await User.create({
      firebaseUid: firebaseUser.uid,
      name: name.trim(),
      email: cleanEmail,
      role: 'admin',
    });

    return res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      user: {
        _id: newAdmin._id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role,
      },
    });
  } catch (error) {
    console.error('Create admin error:', error.message);

    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({
        success: false,
        message: 'Email already registered in Firebase',
      });
    }

    if (error.code === 'auth/invalid-password') {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to create admin',
    });
  }
});

// Delete an admin
router.delete('/:id', superAdminOnly, async (req, res) => {
  try {
    const admin = await User.findById(req.params.id);

    if (!admin || admin.role !== 'admin') {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
      });
    }

    // Never allow the superadmin account to be deleted
    if (admin.email.toLowerCase() === SUPERADMIN_EMAIL) {
      return res.status(403).json({
        success: false,
        message: 'The superadmin cannot be deleted',
      });
    }

    const adminCount = await User.countDocuments({ role: 'admin' });

    if (adminCount <= 1) {
      return res.status(400).json({
        success: false,
        message: 'At least one admin must remain',
      });
    }

    await getAuth().deleteUser(admin.firebaseUid);
    await User.findByIdAndDelete(admin._id);

    return res.json({
      success: true,
      message: 'Admin removed successfully',
    });
  } catch (error) {
    console.error('Delete admin error:', error.message);

    if (error.code === 'auth/user-not-found') {
      await User.findByIdAndDelete(req.params.id);

      return res.json({
        success: true,
        message: 'Admin removed from the database',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to remove admin',
    });
  }
});

// List admins
router.get('/list-admins', async (req, res) => {
  try {
    const admins = await User.find({ role: 'admin' })
      .select('name email role createdAt')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      admins,
    });
  } catch (error) {
    console.error('List admins error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to load admins',
    });
  }
});

module.exports = router;