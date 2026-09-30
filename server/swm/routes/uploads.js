const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAuth } = require('../../shared/authMiddleware');

// Ensure destination directory exists: uploads/products
const uploadDir = path.join(process.cwd(), 'uploads', 'products');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Disk Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `prod-${uniqueSuffix}${ext}`);
  }
});

// Allow only valid image MIME types
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'image/avif'
  ];
  if (allowedTypes.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error('الملف المرفوع يجب أن يكون صورة بصيغة مدعومة (JPEG, PNG, WEBP, GIF, SVG)'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

/**
 * POST /api/swm/upload/product-image
 * Dedicated multipart/form-data image upload endpoint
 */
router.post('/product-image', requireAuth, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'لم يتم استلام أي ملف صورة صالح للرفع'
      });
    }

    // Standardized public URL path
    const imageUrl = `/uploads/products/${req.file.filename}`;

    return res.status(200).json({
      success: true,
      image_url: imageUrl,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (err) {
    console.error('File upload error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'حدث خطأ أثناء معالجة وحفظ الصورة'
    });
  }
});

module.exports = router;
