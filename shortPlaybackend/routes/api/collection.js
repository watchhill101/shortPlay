// routes/api/collection.js
const express = require('express');
const Collection = require('../../models/collection');
const Collect = require('../../models/collect');
const router = express.Router();

/**
 * @route POST /api/collection/follow/:collectionId
 * @description 关注/取消关注合集
 * @access Public
 */
router.post('/follow/:collectionId', async (req, res) => {
  try {
    const { collectionId } = req.params;
    const { isFollowing } = req.body;

    // 验证参数
    if (typeof isFollowing !== 'boolean') {
      return res.status(400).json({ message: 'isFollowing参数必须是布尔值' });
    }

    // 查找合集是否存在
    const collection = await Collection.findById(collectionId);

    if (!collection) {
      return res.status(404).json({ message: '合集不存在' });
    }

    // 模拟用户ID（实际应用中应该从登录状态获取）
    const userId = '60d5ec49f1c9b93d88000001'; // 临时模拟用户ID

    if (isFollowing) {
      // 关注合集
      try {
        // 创建收藏记录
        const collectRecord = new Collect({
          user: userId,
          collection: collectionId
        });
        await collectRecord.save();

        // 更新合集的收藏数量
        collection.collectCount = (collection.collectCount || 0) + 1;
        await collection.save();

        console.log(`用户 ${userId} 关注了合集 ${collectionId}`);
        return res.json({
          message: '关注成功',
          collectionId: collection._id,
          collectionTitle: collection.title,
          isFollowing: true
        });
      } catch (error) {
        // 处理重复关注的情况
        if (error.code === 11000) {
          return res.json({
            message: '已经关注了该合集',
            collectionId: collection._id,
            collectionTitle: collection.title,
            isFollowing: true
          });
        }
        throw error;
      }
    } else {
      // 取消关注合集
      // 删除收藏记录
      await Collect.findOneAndDelete({
        user: userId,
        collection: collectionId
      });

      // 更新合集的收藏数量
      collection.collectCount = Math.max(0, (collection.collectCount || 0) - 1);
      await collection.save();

      console.log(`用户 ${userId} 取消关注了合集 ${collectionId}`);
      return res.json({
        message: '取消关注成功',
        collectionId: collection._id,
        collectionTitle: collection.title,
        isFollowing: false
      });
    }
  } catch (error) {
    console.error('更新合集关注状态失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

module.exports = router;