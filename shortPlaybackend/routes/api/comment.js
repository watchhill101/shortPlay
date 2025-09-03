// routes/api/comment.js
const express = require('express');
const mongoose = require('mongoose');
const Comment = require('../../models/comment');
const router = express.Router();

/**
 * @route GET /api/comment/work/:workId
 * @description 获取某个作品的评论列表（兼容旧数据格式，点赞最多的5条置顶）
 * @access Public
 */
router.get('/work/:workId', async (req, res) => {
  try {
    const { workId } = req.params;

    console.log('获取作品评论列表，workId:', workId);

    // 将字符串形式的workId转换为ObjectId类型
    let objectIdWorkId;
    try {
      objectIdWorkId = new mongoose.Types.ObjectId(workId);
      console.log('成功转换为ObjectId:', objectIdWorkId);
    } catch (error) {
      console.error('无效的workId格式:', error);
      return res.status(400).json({ message: '无效的作品ID格式' });
    }

    // 查询条件
    const queryCondition = {
      $or: [
        { collection: objectIdWorkId, parentComment: null }, // 旧格式：collection字段等于转换后的ObjectId
        { targetType: 'work', targetId: objectIdWorkId, parentComment: null }, // 新格式（使用ObjectId）
        { targetType: 'work', targetId: workId, parentComment: null } // 兼容可能的字符串格式
      ]
    };

    // 1. 先查询点赞数最高的5条评论作为置顶评论
    const topComments = await Comment.find(queryCondition)
      .sort({ likeCount: -1 })
      .limit(5)
      .exec();

    // 获取置顶评论的ID，用于排除
    const topCommentIds = topComments.map(comment => comment._id);

    // 2. 查询剩余的评论，按创建时间降序排序
    const regularComments = await Comment.find({
      ...queryCondition,
      _id: { $nin: topCommentIds } // 排除置顶评论
    })
      .sort({ createdAt: -1 })
      .exec();

    // 合并置顶评论和普通评论
    const comments = [...topComments, ...regularComments];

    // 对于每条顶级评论，获取其回复
    const commentsWithReplies = await Promise.all(
      comments.map(async comment => {
        // 获取当前评论的回复
        const replies = await Comment.find({
          parentComment: comment._id
        })
          .sort({ createdAt: 1 })
          .exec();

        return {
          ...comment._doc,
          replies
        };
      })
    );

    res.json(commentsWithReplies);
  } catch (error) {
    console.error('获取评论列表失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

/**
 * @route POST /api/comment
 * @description 添加评论（兼容旧数据格式）
 * @access Private (需要用户登录)
 */
router.post('/', async (req, res) => {
  try {
    // 注意：实际项目中需要验证用户身份
    // 这里假设req.user包含了当前登录用户的信息

    const { targetType, targetId, content, parentComment = null } = req.body;

    // 验证必填字段
    if (!targetType || !targetId || !content) {
      return res.status(400).json({ message: '缺少必要参数' });
    }

    // 验证targetType的有效性
    if (!['collection', 'work'].includes(targetType)) {
      return res.status(400).json({ message: '无效的targetType' });
    }

    // 创建评论对象
    const commentData = {
      targetType,
      targetId,
      user: '60d5ecb2f9a1b33b8c3d9f2a', // 模拟用户ID，实际项目中应该从req.user获取
      userInfo: {
        nickname: '测试用户', // 模拟用户昵称
        avatar: '/static/img/1.gif' // 模拟用户头像
      },
      content,
      parentComment
    };

    // 对于work类型的评论，同时设置collection字段，确保向后兼容
    if (targetType === 'work') {
      commentData.collection = targetId; // 同时设置旧格式的collection字段
    }

    // 创建评论
    const newComment = new Comment(commentData);

    // 保存评论
    await newComment.save();

    res.status(201).json(newComment);
  } catch (error) {
    console.error('添加评论失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

/**
 * @route POST /api/comment/like/:commentId
 * @description 点赞评论
 * @access Private (需要用户登录)
 */
router.post('/like/:commentId', async (req, res) => {
  try {
    const { commentId } = req.params;

    // 更新评论的点赞数
    const comment = await Comment.findByIdAndUpdate(
      commentId,
      { $inc: { likeCount: 1 } },
      { new: true }
    );

    if (!comment) {
      return res.status(404).json({ message: '评论不存在' });
    }

    res.json(comment);
  } catch (error) {
    console.error('点赞评论失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

module.exports = router;
