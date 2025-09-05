const express = require('express');
const router = express.Router();
const Activity = require('./index');

/**
 * @route GET /api/activity
 * @description 获取所有活动
 * @access Public
 */
router.get('/', async (req, res) => {
  try {
    const activities = await Activity.find({ status: 'published' }).sort({ startTime: -1 });
    res.json({
      success: true,
      data: activities,
      message: '活动列表获取成功',
    });
  } catch (error) {
    console.error('获取活动列表失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message,
    });
  }
});

module.exports = router;
