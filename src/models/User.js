const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, trim: true },

    // Legacy JWT auth only — Firebase users don't have a password
    password: {
      type: String,
      required: false,
      minlength: 6,
    },

    role: {
      type: String,
      enum: ['citizen', 'admin'],
      default: 'citizen',
    },

    // Firebase UID links this MongoDB user to Firebase Auth
    firebaseUid: {
      type: String,
      sparse: true,
      unique: true,
    },

    fcmToken: { type: String },
    photoUrl: { type: String },

    // ── Notification preference ──
    notificationEnabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);