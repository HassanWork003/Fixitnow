const express = require('express');
const multer = require('multer');
const router = express.Router();

const { verifyFirebaseToken } = require('../middleware/firebaseAuth');
const {
  createReport,
  getAllReports,
  getMyReports,
  getNearbyReports,
  getReportById,
  toggleUpvote,
  updateStatus,
} = require('../controllers/reportsController');

// ─── Multer (memory storage — buffer) ─────────
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    // Accept by mimetype OR by extension (Android sometimes sends octet-stream)
    const mime = (file.mimetype || '').toLowerCase();
    const name = (file.originalname || '').toLowerCase();

    const isImageMime = mime.startsWith('image/');
    const isImageExt =
      name.endsWith('.jpg') ||
      name.endsWith('.jpeg') ||
      name.endsWith('.png') ||
      name.endsWith('.webp') ||
      name.endsWith('.heic') ||
      name.endsWith('.heif');

    if (isImageMime || isImageExt) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

// ─── Public routes ────────────────────────────
router.get('/', getAllReports);
router.get('/nearby', getNearbyReports);

// ─── Protected routes (Firebase auth) ─────────
router.get('/me', verifyFirebaseToken, getMyReports);
router.post('/', verifyFirebaseToken, upload.array('images', 5), createReport);
router.post('/:id/upvote', verifyFirebaseToken, toggleUpvote);

// ─── Dynamic route LAST ───────────────────────
router.get('/:id', getReportById);

// ─── Admin routes ─────────────────────────────
router.patch('/:id/status', verifyFirebaseToken, updateStatus);

module.exports = router;