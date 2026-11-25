const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ['road', 'light', 'water', 'garbage', 'drainage', 'other'],
      required: true,
    },
    images: [{ type: String }],
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    address: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'inProgress', 'resolved', 'rejected'],
      default: 'pending',
    },
    department: { type: String },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    upvoteCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Geospatial index for "nearby reports" queries
reportSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Report', reportSchema);