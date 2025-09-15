// routes/api/collection.js
const express = require('express');
const Collection = require('../../models/collection');
const Collect = require('../../models/collect');
const Work = require('../../models/work');
const router = express.Router();

/**
 * @route GET /api/collection
 * @description 获取合集列表
 * @access Public
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // 构建排序对象
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // 查询合集列表
    const collections = await Collection.find()
      .sort(sort)
      .skip((page - 1) * pageSize)
      .limit(parseInt(pageSize))
      .lean();

    // 获取总数
    const total = await Collection.countDocuments();

    res.json({
      data: collections,
      pagination: {
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('获取合集列表失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

/**
 * @route GET /api/collection/:id/works
 * @description 获取合集下的作品列表
 * @access Public
 */
router.get('/:id/works', async (req, res) => {
  try {
    const { id } = req.params;

    // 查找合集
    const collection = await Collection.findById(id);
    if (!collection) {
      return res.status(404).json({ message: '合集不存在' });
    }

    // 获取合集下的作品
    const works = await Work.find({ collectionId: id }).lean();

    res.json({
      data: works,
      total: works.length,
    });
  } catch (error) {
    console.error(`获取合集${id}的作品列表失败:`, error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

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
          collection: collectionId,
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
          isFollowing: true,
        });
      } catch (error) {
        // 处理重复关注的情况
        if (error.code === 11000) {
          return res.json({
            message: '已经关注了该合集',
            collectionId: collection._id,
            collectionTitle: collection.title,
            isFollowing: true,
          });
        }
        throw error;
      }
    } else {
      // 取消关注合集
      // 删除收藏记录
      await Collect.findOneAndDelete({
        user: userId,
        collection: collectionId,
      });

      // 更新合集的收藏数量
      collection.collectCount = Math.max(0, (collection.collectCount || 0) - 1);
      await collection.save();

      console.log(`用户 ${userId} 取消关注了合集 ${collectionId}`);
      return res.json({
        message: '取消关注成功',
        collectionId: collection._id,
        collectionTitle: collection.title,
        isFollowing: false,
      });
    }
  } catch (error) {
    console.error('更新合集关注状态失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

module.exports = router;
