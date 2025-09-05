const express = require('express');
const router = express.Router();
const PlayData = require('./index');
const Work = require('../work/index');
const auth = require('../../middleware/auth');

/**
 * @route POST /api/playdata
 * @description 记录播放数据
 * @access Private
 */
router.post('/', auth, async (req, res) => {
  try {
    const { workId, watchDuration } = req.body;
    const userId = req.user.id;

    // 验证数据
    if (!workId || !watchDuration) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }

    // 创建新的播放记录
    const playData = new PlayData({
      userId,
      workId,
      watchDuration,
    });
    await playData.save();

    // 更新作品的总播放次数和总播放时长
    await Work.findByIdAndUpdate(workId, {
      $inc: { playCount: 1, totalWatchTime: watchDuration },
    });

    res.status(201).json({
      success: true,
      data: playData,
      message: '播放数据记录成功',
    });
  } catch (error) {
    console.error('记录播放数据失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message,
    });
  }
});

module.exports = router;
