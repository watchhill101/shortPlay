const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authMiddleware = require('../../middleware/auth');

const router = express.Router();

// 存储到 uploads/chat 目录
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/chat');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `chat-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    if (file.mimetype && file.mimetype.startsWith('image/')) return cb(null, true);
    cb(new Error('仅支持上传图片'));
  },
});

// 上传图片：POST /api/chat-media/image
router.post('/image', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请选择图片文件' });
    }
    const relative = `/uploads/chat/${req.file.filename}`;
    const absolute = `${req.protocol}://${req.get('host')}${relative}`;

    // 只为小文件提供base64备用（避免内存问题）
    let base64 = null;
    if (req.file.size < 500 * 1024) {
      // 小于500KB才提供base64
      const imageBuffer = fs.readFileSync(req.file.path);
      base64 = `data:${req.file.mimetype};base64,${imageBuffer.toString('base64')}`;
    }

    res.json({
      success: true,
      message: '上传成功',
      data: {
        url: absolute,
        relative,
        base64, // 只有小文件才有base64
        filename: req.file.filename,
        size: req.file.size,
      },
    });
  } catch (error) {
    console.error('聊天媒体上传失败:', error);
    res.status(500).json({ success: false, message: '上传失败', error: error.message });
  }
});

module.exports = router;
