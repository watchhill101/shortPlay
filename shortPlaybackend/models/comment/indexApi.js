// routes/api/comment.js
const express = require('express');
const Comment = require('./index');
const router = express.Router();
const auth = require('../../middleware/auth');

/**
 * @route GET /api/comment/work/:workId
 */
router.get('/work/:workId', async (req, res) => {
  try {
    const workId = req.params.workId;
    const comments = await Comment.find({ work: workId });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * @route POST /api/comment/work/:workId
 */
router.post('/work/:workId', async (req, res) => {
  try {
    const workId = req.params.workId;
    const newComment = new Comment({
      work: workId,
      user: req.body.userId,
      text: req.body.text,
    });
    await newComment.save();
    res.status(201).json(newComment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * @route DELETE /api/comment/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    await comment.remove();
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * @route POST /api/comment/like/:id
 * @description 点赞或取消点赞评论
 */
router.post('/like/:id', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const userId = req.user.id;
    const isLiked = comment.likes.includes(userId);

    if (isLiked) {
      // 取消点赞
      comment.likes.pull(userId);
      comment.likeCount = Math.max(0, comment.likeCount - 1);
      await comment.save();
      res.json({ success: true, message: '已取消点赞', liked: false, likeCount: comment.likeCount });
    } else {
      // 点赞
      comment.likes.push(userId);
      comment.likeCount += 1;
      await comment.save();
      res.json({ success: true, message: '已点赞', liked: true, likeCount: comment.likeCount });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
