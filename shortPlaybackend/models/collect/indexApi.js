const express = require('express');
const router = express.Router();
const Collect = require('./index');
const Work = require('../work/index');
const auth = require('../../middleware/auth');

/**
 * @route POST /api/collect
 * @description 收藏或取消收藏作品
 * @access Private
 */
router.post('/', auth, async (req, res) => {
  try {
    const { workId } = req.body;
    const userId = req.user.id;

    const existingCollection = await Collect.findOne({ userId, workId });

    if (existingCollection) {
      // 如果已经收藏，则取消收藏
      await Collect.findByIdAndDelete(existingCollection._id);
      await Work.findByIdAndUpdate(workId, { $inc: { collectCount: -1 } });
      return res.json({ success: true, message: '已取消收藏', collected: false });
    } else {
      // 如果未收藏，则添加收藏
      const newCollection = new Collect({ userId, workId });
      await newCollection.save();
      await Work.findByIdAndUpdate(workId, { $inc: { collectCount: 1 } });
      return res.json({ success: true, message: '已收藏', collected: true });
    }
  } catch (error) {
    console.error('收藏操作失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message,
    });
  }
});

module.exports = router;
