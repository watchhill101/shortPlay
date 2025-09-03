// routes/api/work.js
const express = require('express');
const Work = require('../../models/work');
const Collection = require('../../models/collection');
const router = express.Router();

/**
 * @route GET /api/work/videos
 * @description 获取视频列表
 * @access Public
 */
router.get('/videos', async (req, res) => {
  try {
    // 获取已发布的视频列表，按创建时间倒序排列
    const works = await Work.find({ status: 'published' })
      .populate('collectionId', 'title') // 关联查询合集信息，只返回title字段
      .sort({ createdAt: -1 })
      .limit(20) // 限制返回20条记录
      .exec();

    // 格式化返回数据，将collectionId.title提取为单独的collectionTitle字段
    const formattedWorks = works.map(work => {
      return {
        ...work._doc,
        collectionTitle: work.collectionId?.title || '', // 提取合集标题
      };
    });

    // console.log('====================================');
    // console.log(formattedWorks);
    // console.log('====================================');
    res.json(formattedWorks);
  } catch (error) {
    console.error('获取视频列表失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

/**
 * @route POST /api/work/like/:workId
 * @description 点赞/取消点赞视频
 * @access Public
 */
router.post('/like/:workId', async (req, res) => {
  try {
    const { workId } = req.params;
    const { isLiked } = req.body;

    // 验证参数
    if (typeof isLiked !== 'boolean') {
      return res.status(400).json({ message: 'isLiked参数必须是布尔值' });
    }

    // 查找并更新视频点赞数
    const work = await Work.findById(workId);

    if (!work) {
      return res.status(404).json({ message: '视频不存在' });
    }

    // 根据isLiked状态更新点赞数
    work.likeCount = isLiked
      ? (work.likeCount || 0) + 1
      : Math.max(0, (work.likeCount || 0) - 1);

    await work.save();

    console.log(`视频 ${workId} 点赞状态更新为: ${isLiked}, 点赞数: ${work.likeCount}`);

    // 返回更新后的视频信息
    res.json({
      _id: work._id,
      title: work.title,
      likeCount: work.likeCount,
      isLiked: isLiked
    });
  } catch (error) {
    console.error('更新视频点赞状态失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

/**
 * @route POST /api/work/collect/:workId
 * @description 收藏/取消收藏视频
 * @access Public
 */
router.post('/collect/:workId', async (req, res) => {
  try {
    const { workId } = req.params;
    const { isCollected } = req.body;

    // 验证参数
    if (typeof isCollected !== 'boolean') {
      return res.status(400).json({ message: 'isCollected参数必须是布尔值' });
    }

    // 查找并更新视频评论数
    const work = await Work.findById(workId);

    if (!work) {
      return res.status(404).json({ message: '视频不存在' });
    }

    // 根据isCollected状态更新评论数
    work.commentCount = isCollected
      ? (work.commentCount || 0) + 1
      : Math.max(0, (work.commentCount || 0) - 1);

    await work.save();

    console.log(`视频 ${workId} 收藏状态更新为: ${isCollected}, 评论数: ${work.commentCount}`);

    // 返回更新后的视频信息
    res.json({
      _id: work._id,
      title: work.title,
      commentCount: work.commentCount,
      isCollected: isCollected
    });
  } catch (error) {
    console.error('更新视频收藏状态失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

module.exports = router;
