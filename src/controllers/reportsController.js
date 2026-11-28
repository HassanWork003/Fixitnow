// const Report = require('../models/Report');
// const User = require('../models/User');
// const { getMessaging } = require('firebase-admin/messaging');
// const { uploadToCloudinary } = require('../config/cloudinaryUpload');

// // ─── @route   POST /reports ───────────────────
// // Create new report (with optional images)
// exports.createReport = async (req, res) => {
//   try {
//     const { title, description, category, lat, lng, address } = req.body;

//     // Validation
//     if (!title || !description || !category || !lat || !lng || !address) {
//       return res.status(400).json({
//         success: false,
//         message: 'Missing required fields',
//       });
//     }

//     // Upload images to Cloudinary (if any)
//     const imageUrls = [];
//     if (req.files && req.files.length > 0) {
//       for (const file of req.files) {
//         const result = await uploadToCloudinary(file.buffer);
//         imageUrls.push(result.secure_url);
//       }
//     }

//     // Create report
//     const report = await Report.create({
//       userId: req.user._id,
//       title,
//       description,
//       category,
//       images: imageUrls,
//       location: {
//         type: 'Point',
//         coordinates: [parseFloat(lng), parseFloat(lat)],
//       },
//       address,
//       status: 'pending',
//     });

//     res.status(201).json({
//       success: true,
//       message: 'Report submitted successfully',
//       report,
//     });
//   } catch (error) {
//     console.error('Create report error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to create report',
//       error: error.message,
//     });
//   }
// };

// // ─── @route   GET /reports ────────────────────
// // List all reports (with filters)
// // exports.getAllReports = async (req, res) => {
// //   try {
// //     const { status, category, limit = 50 } = req.query;

// //     const filter = {};
// //     if (status) filter.status = status;
// //     if (category) filter.category = category;

// //     const reports = await Report.find(filter)
// //       .populate('userId', 'name email')
// //       .sort({ createdAt: -1 })
// //       .limit(parseInt(limit));

// //     res.json({
// //       success: true,
// //       count: reports.length,
// //       reports,
// //     });
// //   } catch (error) {
// //     res.status(500).json({
// //       success: false,
// //       message: 'Failed to fetch reports',
// //       error: error.message,
// //     });
// //   }
// // };
//   // ─── @route   GET /reports ────────────────────
//   // Query params (all optional):
//   //   status=pending|inProgress|resolved|rejected
//   //   category=road|light|water|garbage|drainage|other
//   //   search=<text>           (matches title OR address)
//   //   from=YYYY-MM-DD         (createdAt >=)
//   //   to=YYYY-MM-DD           (createdAt <=)
//   //   sort=newest|oldest|upvotes
//   //   limit=50                (default 50, max 200)
//   exports.getAllReports = async (req, res) => {
//     try {
//       const {
//         status,
//         category,
//         search,
//         from,
//         to,
//         sort = 'newest',
//         limit = 50,
//       } = req.query;

//       // ─── Build filter ───────────────────────
//       const filter = {};

//       if (status) filter.status = status;
//       if (category) filter.category = category;

//       // Text search: matches title or address (case-insensitive)
//       if (search && search.trim().length > 0) {
//         const regex = new RegExp(search.trim(), 'i');
//         filter.$or = [
//           { title: regex },
//           { address: regex },
//           { description: regex },
//         ];
//       }

//       // Date range filter
//       if (from || to) {
//         filter.createdAt = {};
//         if (from) {
//           const fromDate = new Date(from);
//           if (!isNaN(fromDate)) filter.createdAt.$gte = fromDate;
//         }
//         if (to) {
//           const toDate = new Date(to);
//           if (!isNaN(toDate)) {
//             // Include the full "to" day
//             toDate.setHours(23, 59, 59, 999);
//             filter.createdAt.$lte = toDate;
//           }
//         }
//         // If no valid dates parsed, remove the empty createdAt
//         if (Object.keys(filter.createdAt).length === 0) {
//           delete filter.createdAt;
//         }
//       }

//       // ─── Sort ──────────────────────────────
//       let sortOption = { createdAt: -1 }; // newest
//       if (sort === 'oldest') sortOption = { createdAt: 1 };
//       if (sort === 'upvotes') sortOption = { upvoteCount: -1, createdAt: -1 };

//       // ─── Limit (safety cap) ───────────────
//       const parsedLimit = Math.min(parseInt(limit) || 50, 200);

//       // ─── Query ─────────────────────────────
//       const reports = await Report.find(filter)
//         .populate('userId', 'name email')
//         .sort(sortOption)
//         .limit(parsedLimit);

//       res.json({
//         success: true,
//         count: reports.length,
//         filters: {
//           status: status || null,
//           category: category || null,
//           search: search || null,
//           from: from || null,
//           to: to || null,
//           sort,
//           limit: parsedLimit,
//         },
//         reports,
//       });
//     } catch (error) {
//       console.error('getAllReports error:', error.message);
//       res.status(500).json({
//         success: false,
//         message: 'Failed to fetch reports',
//         error: error.message,
//       });
//     }
//   };



// // ─── @route   GET /reports/me ─────────────────
// // Current user's reports
// exports.getMyReports = async (req, res) => {
//   try {
//     const reports = await Report.find({ userId: req.user._id })
//       .sort({ createdAt: -1 });

//     res.json({
//       success: true,
//       count: reports.length,
//       reports,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch your reports',
//       error: error.message,
//     });
//   }
// };

// // ─── @route   GET /reports/nearby ─────────────
// // Reports within radius (km)
// exports.getNearbyReports = async (req, res) => {
//   try {
//     const { lat, lng, radius = 5 } = req.query;

//     if (!lat || !lng) {
//       return res.status(400).json({
//         success: false,
//         message: 'lat and lng are required',
//       });
//     }

//     const reports = await Report.find({
//       location: {
//         $near: {
//           $geometry: {
//             type: 'Point',
//             coordinates: [parseFloat(lng), parseFloat(lat)],
//           },
//           $maxDistance: parseFloat(radius) * 1000,
//         },
//       },
//     })
//       .populate('userId', 'name')
//       .limit(50);

//     res.json({
//       success: true,
//       count: reports.length,
//       reports,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch nearby reports',
//       error: error.message,
//     });
//   }
// };

// // ─── @route   GET /reports/:id ────────────────
// exports.getReportById = async (req, res) => {
//   try {
//     const report = await Report.findById(req.params.id)
//       .populate('userId', 'name email')
//       .populate('assignedTo', 'name email');

//     if (!report) {
//       return res.status(404).json({
//         success: false,
//         message: 'Report not found',
//       });
//     }

//     res.json({ success: true, report });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch report',
//       error: error.message,
//     });
//   }
// };

// // ─── @route   POST /reports/:id/upvote ────────
// // Toggle upvote on a report
// exports.toggleUpvote = async (req, res) => {
//   try {
//     const report = await Report.findById(req.params.id);

//     if (!report) {
//       return res.status(404).json({
//         success: false,
//         message: 'Report not found',
//       });
//     }

//     const userId = req.user._id;
//     const hasUpvoted = report.upvotes.some((id) => id.equals(userId));

//     if (hasUpvoted) {
//       report.upvotes = report.upvotes.filter((id) => !id.equals(userId));
//       report.upvoteCount = Math.max(0, report.upvoteCount - 1);
//     } else {
//       report.upvotes.push(userId);
//       report.upvoteCount += 1;
//     }

//     await report.save();

//     res.json({
//       success: true,
//       upvoted: !hasUpvoted,
//       upvoteCount: report.upvoteCount,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: 'Failed to toggle upvote',
//       error: error.message,
//     });
//   }
// };

// // ─── @route   PATCH /reports/:id/status ───────
// // Admin updates report status + sends FCM to report owner
// exports.updateStatus = async (req, res) => {
//   try {
//     const { status, department } = req.body;

//     if (!status) {
//       return res.status(400).json({
//         success: false,
//         message: 'Status is required',
//       });
//     }

//     // Update report
//     const report = await Report.findByIdAndUpdate(
//       req.params.id,
//       {
//         status,
//         ...(department && { department }),
//       },
//       { new: true }
//     );

//     if (!report) {
//       return res.status(404).json({
//         success: false,
//         message: 'Report not found',
//       });
//     }

//     // ─── Send FCM notification to report owner ─
//     try {
//       const reportOwner = await User.findById(report.userId);

//       if (reportOwner && reportOwner.fcmToken) {
//         const statusLabels = {
//           pending: 'Pending',
//           inProgress: 'In Progress',
//           resolved: 'Resolved',
//           rejected: 'Rejected',
//         };

//         const title = '📢 Report Status Updated';
//         const body = `Your report "${report.title}" is now ${
//           statusLabels[status] || status
//         }`;

//         await getMessaging().send({
//           token: reportOwner.fcmToken,
//           notification: {
//             title,
//             body,
//           },
//           data: {
//             reportId: report._id.toString(),
//             status: status,
//             type: 'status_update',
//           },
//           android: {
//             priority: 'high',
//             notification: {
//               channelId: 'fixitnow_channel',
//               sound: 'default',
//               priority: 'high',
//             },
//           },
//           apns: {
//             payload: {
//               aps: {
//                 sound: 'default',
//                 badge: 1,
//               },
//             },
//           },
//         });

//         console.log(
//           `📱 FCM sent to ${reportOwner.email}: "${report.title}" → ${status}`
//         );
//       } else {
//         console.log(
//           `⚠️ No FCM token for report owner (${report.userId})`
//         );
//       }
//     } catch (fcmError) {
//       console.error('❌ FCM send failed:', fcmError.message);
//       // Don't fail the request — status was already updated
//     }

//     res.json({
//       success: true,
//       message: 'Status updated',
//       report,
//     });
//   } catch (error) {
//     console.error('Update status error:', error.message);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to update status',
//       error: error.message,
//     });
//   }
// };






const Report = require('../models/Report');
const User = require('../models/User');
const { getMessaging } = require('firebase-admin/messaging');
const { uploadToCloudinary } = require('../config/cloudinaryUpload');

// ─── @route   POST /reports ───────────────────
exports.createReport = async (req, res) => {
  try {
    const { title, description, category, lat, lng, address, district } = req.body;

    if (!title || !description || !category || !lat || !lng || !address || !district) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    const imageUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await uploadToCloudinary(file.buffer);
        imageUrls.push(result.secure_url);
      }
    }

    const report = await Report.create({
      userId: req.user._id,
      title,
      description,
      category,
      images: imageUrls,
      location: {
        type: 'Point',
        coordinates: [parseFloat(lng), parseFloat(lat)],
      },
      address,
      district,
      status: 'pending',
    });

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully',
      report,
    });
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create report',
      error: error.message,
    });
  }
};

// ─── @route   GET /reports ────────────────────
exports.getAllReports = async (req, res) => {
  try {
    const {
      status,
      category,
      district, // 👈 Now properly extracted
      search,
      from,
      to,
      sort = 'newest',
      limit = 50,
    } = req.query;

    const filter = {};

    if (status) filter.status = status;
    if (category) filter.category = category;
    if (district) filter.district = district; // 👈 Applied to MongoDB query

    if (search && search.trim().length > 0) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { title: regex },
        { address: regex },
        { description: regex },
      ];
    }

    if (from || to) {
      filter.createdAt = {};
      if (from) {
        const fromDate = new Date(from);
        if (!isNaN(fromDate)) filter.createdAt.$gte = fromDate;
      }
      if (to) {
        const toDate = new Date(to);
        if (!isNaN(toDate)) {
          toDate.setHours(23, 59, 59, 999);
          filter.createdAt.$lte = toDate;
        }
      }
      if (Object.keys(filter.createdAt).length === 0) {
        delete filter.createdAt;
      }
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'oldest') sortOption = { createdAt: 1 };
    if (sort === 'upvotes') sortOption = { upvoteCount: -1, createdAt: -1 };

    const parsedLimit = Math.min(parseInt(limit) || 50, 200);

    const reports = await Report.find(filter)
      .populate('userId', 'name email')
      .sort(sortOption)
      .limit(parsedLimit);

    res.json({
      success: true,
      count: reports.length,
      filters: { status, category, district, search, from, to, sort, limit: parsedLimit },
      reports,
    });
  } catch (error) {
    console.error('getAllReports error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reports',
      error: error.message,
    });
  }
};

// ─── @route   GET /reports/by-district ────────
exports.getReportsByDistrict = async (req, res) => {
  try {
    const districtStats = await Report.aggregate([
      {
        $group: {
          _id: '$district',
          count: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.json({ success: true, districtStats });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch district stats',
      error: error.message,
    });
  }
};

// ─── @route   GET /reports/me ─────────────────
exports.getMyReports = async (req, res) => {
  try {
    const reports = await Report.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, count: reports.length, reports });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch your reports', error: error.message });
  }
};

// ─── @route   GET /reports/nearby ─────────────
exports.getNearbyReports = async (req, res) => {
  try {
    const { lat, lng, radius = 5 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'lat and lng are required' });
    }

    const reports = await Report.find({
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseFloat(radius) * 1000,
        },
      },
    })
      .populate('userId', 'name')
      .limit(50);

    res.json({ success: true, count: reports.length, reports });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch nearby reports', error: error.message });
  }
};

// ─── @route   GET /reports/:id ────────────────
exports.getReportById = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('userId', 'name email')
      .populate('assignedTo', 'name email');

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    res.json({ success: true, report });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch report', error: error.message });
  }
};

// ─── @route   POST /reports/:id/upvote ────────
exports.toggleUpvote = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    const userId = req.user._id;
    const hasUpvoted = report.upvotes.some((id) => id.equals(userId));

    if (hasUpvoted) {
      report.upvotes = report.upvotes.filter((id) => !id.equals(userId));
      report.upvoteCount = Math.max(0, report.upvoteCount - 1);
    } else {
      report.upvotes.push(userId);
      report.upvoteCount += 1;
    }

    await report.save();

    res.json({ success: true, upvoted: !hasUpvoted, upvoteCount: report.upvoteCount });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to toggle upvote', error: error.message });
  }
};

// ─── @route   PATCH /reports/:id/status ───────
exports.updateStatus = async (req, res) => {
  try {
    const { status, department } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { status, ...(department && { department }) },
      { new: true }
    );

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    try {
      const reportOwner = await User.findById(report.userId);

      if (reportOwner && reportOwner.fcmToken) {
        const statusLabels = { pending: 'Pending', inProgress: 'In Progress', resolved: 'Resolved', rejected: 'Rejected' };
        const title = '📢 Report Status Updated';
        const body = `Your report "${report.title}" is now ${statusLabels[status] || status}`;

        await getMessaging().send({
          token: reportOwner.fcmToken,
          notification: { title, body },
          data: { reportId: report._id.toString(), status: status, type: 'status_update' },
          android: { priority: 'high', notification: { channelId: 'fixitnow_channel', sound: 'default', priority: 'high' } },
          apns: { payload: { aps: { sound: 'default', badge: 1 } } },
        });

        console.log(`📱 FCM sent to ${reportOwner.email}: "${report.title}" → ${status}`);
      }
    } catch (fcmError) {
      console.error('❌ FCM send failed:', fcmError.message);
    }

    res.json({ success: true, message: 'Status updated', report });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update status', error: error.message });
  }
};

// Force Railway update