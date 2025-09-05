// routes/api/classifiers.js
const express = require('express');
const router = express.Router();
const Classifier = require('./index');

/**
 * @route GET /api/classifier
 * @description 获取所有分类
 * @access Public
 */
router.get('/', async (req, res) => {
  try {
    const classifiers = await Classifier.find({}).sort({ order: 1 });
    res.json({
      success: true,
      data: classifiers,
      message: '分类列表获取成功',
    });
  } catch (error) {
    console.error('获取分类列表失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message,
    });
  }
});

module.exports = router;
