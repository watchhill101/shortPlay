const express = require('express');
const router = express.Router();
const Comment = require('./index');
const Collection = require('../collection');

/**
 * @route GET /api/comment
 * @description 获取评论列表（带分页和排序）
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // 构建查询条件
    const query = { status: { $ne: 'deleted' } };

    // 构建排序对象
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // 计算分页
    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    // 执行查询
    const [comments, total] = await Promise.all([
      Comment.find(query).sort(sort).skip(skip).limit(limit).populate('user', 'username avatar').lean(),
      Comment.countDocuments(query),
    ]);

    // 获取所有评论涉及的合集ID
    const collectionIds = comments.map(comment => comment.collection).filter(Boolean);

    // 批量获取合集信息
    const collections = await Collection.find({ _id: { $in: collectionIds } })
      .populate('work', 'title')
      .lean();

    // 创建合集信息映射
    const collectionMap = new Map(
      collections.map(collection => [
        collection._id.toString(),
        {
          title: collection.work?.title || '未知标题',
          episodeNumber: collection.episodeNumber || 1,
        },
      ])
    );

    // 格式化评论数据
    const formattedComments = comments.map(comment => {
      const collectionId = comment.collection?.toString();
      const collectionInfo = collectionMap.get(collectionId) || {
        title: '未知标题',
        episodeNumber: 1,
      };

      return {
        id: comment._id.toString(),
        content: comment.content,
        username: comment.userInfo?.nickname || comment.user?.username || '未知用户',
        userAvatar: comment.userInfo?.avatar || comment.user?.avatar || '/static/img/avatar.png',
        workId: comment.collection?.toString(),
        workInfo: {
          collectionTitle: collectionInfo.title,
          episodeNumber: collectionInfo.episodeNumber,
        },
        createTime: comment.createdAt,
        likeCount: comment.likeCount || 0,
        replyCount: comment.replyCount || 0,
      };
    });

    // 返回标准格式的响应
    res.json({
      success: true,
      data: {
        list: formattedComments,
        pagination: {
          total,
          page: parseInt(page),
          pageSize: limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    console.error('获取评论列表失败:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取评论列表失败',
    });
  }
});

/**
 * @route DELETE /api/comment/:id
 * @description 删除评论
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const comment = await Comment.findById(id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: '评论不存在',
      });
    }

    // 软删除评论
    comment.status = 'deleted';
    await comment.save();

    // 如果有回复，也软删除回复
    if (comment.replies && comment.replies.length > 0) {
      await Comment.updateMany({ _id: { $in: comment.replies } }, { status: 'deleted' });
    }

    res.json({
      success: true,
      message: '评论删除成功',
      data: {
        deletedCount: 1 + (comment.replies?.length || 0),
      },
    });
  } catch (err) {
    console.error('删除评论失败:', err);
    res.status(500).json({
      success: false,
      message: err.message || '删除评论失败',
    });
  }
});

/**
 * @route POST /api/comment/notify
 * @description 发送通知给评论相关用户
 */
router.post('/notify', async (req, res) => {
  try {
    const { commentId, userId, message } = req.body;

    // TODO: 实现实际的通知逻辑
    // 这里只返回模拟的成功响应
    res.json({
      success: true,
      message: '通知发送成功',
      data: {
        commentId,
        userId,
        message,
        sentAt: new Date(),
      },
    });
  } catch (err) {
    console.error('发送通知失败:', err);
    res.status(500).json({
      success: false,
      message: err.message || '发送通知失败',
    });
  }
});

module.exports = router;
