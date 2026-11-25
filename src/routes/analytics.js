const express = require('express');
const Report = require('../models/Report');
const { verifyFirebaseToken } = require('../middleware/firebaseAuth');

const router = express.Router();

// ─── @route   GET /analytics ──────────────────
// Auth applied inline (safer if middleware is missing)
router.get('/', verifyFirebaseToken, async (req, res) => {
  try {
    console.log('📊 Analytics requested by:', req.user?.email);

    // 1. Counts by status
    const statusCounts = await Report.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // 2. Counts by category
    const categoryCounts = await Report.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // 3. Department performance
    const departmentStats = await Report.aggregate([
      { $match: { department: { $nin: [null, ''] } } },
      {
        $group: {
          _id: '$department',
          total: { $sum: 1 },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] },
          },
        },
      },
      { $sort: { total: -1 } },
    ]);

    // 4. Weekly trend (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weeklyTrend = await Report.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // 5. Average resolution time
    const resolvedReports = await Report.find({
      status: 'resolved',
    }).select('createdAt updatedAt');

    let avgResolutionHours = 0;
    if (resolvedReports.length > 0) {
      const totalMs = resolvedReports.reduce((sum, r) => {
        return sum + (r.updatedAt - r.createdAt);
      }, 0);
      avgResolutionHours =
        totalMs / resolvedReports.length / (1000 * 60 * 60);
    }

    // 6. Top locations
    const topLocations = await Report.aggregate([
      { $group: { _id: '$address', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // 7. Total count
    const total = await Report.countDocuments();

    res.json({
      success: true,
      analytics: {
        total,
        statusCounts,
        categoryCounts,
        departmentStats,
        weeklyTrend,
        avgResolutionHours: Math.round(avgResolutionHours * 10) / 10,
        topLocations,
      },
    });
  } catch (error) {
    console.error('Analytics error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message,
    });
  }
});

module.exports = router;