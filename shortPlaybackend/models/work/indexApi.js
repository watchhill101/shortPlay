// routes/api/work.js
const express = require('express');
const Work = require('./index');
const router = express.Router();
const auth = require('../../middleware/auth'); // Added auth middleware

/**
 * @route GET /api/work/videos
 * @description 获取视频列表
 * @access Public
 */
router.get('/videos', async (req, res) => {
  try {
    console.log('📚 获取合集列表');

    const {
      page = 1,
      pageSize = 10,
      status = 'published',
      classifier = null,
      tags = null, // 新增：按标签筛选
      dateRange = null, // 新增：按时间范围筛选 (天数)
      sortBy = 'createdAt', // 新增：排序字段
    } = req.query;

    // 构建查询条件
    const query = { status };

    // 如果指定了分类，添加分类筛选
    if (classifier && classifier !== 'all' && mongoose.Types.ObjectId.isValid(classifier)) {
      query.classifier = classifier;
    }

    // 新增：处理标签筛选 (假设 tags 是以逗号分隔的字符串)
    if (tags) {
      const tagArray = tags.split(',').filter(tag => tag.trim() !== '');
      if (tagArray.length > 0) {
        query.tags = { $all: tagArray }; // 使用 $all 来确保所有标签都匹配
      }
    }

    // 新增：处理时间范围筛选
    if (dateRange && !isNaN(parseInt(dateRange))) {
      const days = parseInt(dateRange);
      if (days > 0) {
        const date = new Date();
        date.setDate(date.getDate() - days);
        query.createdAt = { $gte: date };
      }
    }

    // 计算跳过的数量
    const skip = (parseInt(page) - 1) * parseInt(pageSize);

    // 新增：处理排序
    const sortOptions = {};
    if (sortBy === 'totalPlayCount') {
      sortOptions.totalPlayCount = -1; // 按播放量降序
    } else {
      sortOptions.createdAt = -1; // 默认按创建时间降序
    }

    // 获取合集列表（现在使用 populate 来获取分类名称）
    const collections = await Collection.find(query)
      .populate('classifier', 'name') // 关联查询分类的名称
      .sort(sortOptions) // 应用排序
      .skip(skip)
      .limit(parseInt(pageSize));

    // 获取总数
    const total = await Collection.countDocuments(query);

    console.log(`✅ 成功获取 ${collections.length} 个合集`);

    res.json({
      success: true,
      data: collections,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total,
        totalPages: Math.ceil(total / parseInt(pageSize)),
      },
      message: '合集列表获取成功',
    });
  } catch (error) {
    console.error('❌ 获取合集列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取合集列表失败',
      error: error.message,
    });
  }
});

// GET /api/collections/search - 搜索合集（必须在/:id路由之前）
router.get('/search', async (req, res) => {
  try {
    const { keyword, page = 1, pageSize = 10 } = req.query;

    if (!keyword || keyword.trim() === '') {
      return res.json({
        success: true,
        data: [],
        total: 0,
        message: '请输入搜索关键词',
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(pageSize);

    // 构建搜索条件
    const searchQuery = {
      status: 'published',
      $or: [
        { title: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
        { tags: { $in: [new RegExp(keyword, 'i')] } },
        { actors: { $in: [new RegExp(keyword, 'i')] } }, // 添加主演搜索
      ],
    };

    const collections = await Collection.find(searchQuery).sort({ createdAt: -1 }).skip(skip).limit(parseInt(pageSize));

    const total = await Collection.countDocuments(searchQuery);

    res.json({
      success: true,
      data: collections,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total,
        totalPages: Math.ceil(total / parseInt(pageSize)),
      },
      message: '搜索完成',
    });
  } catch (error) {
    console.error('❌ 搜索合集失败:', error);
    res.status(500).json({
      success: false,
      message: '搜索失败',
      error: error.message,
    });
  }
});

// GET /api/collections/:id - 获取单个合集详情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 验证ObjectId格式
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: '无效的合集ID格式',
      });
    }

    console.log('📖 获取合集详情, ID:', id);

    // 获取合集信息（暂时不使用populate）
    const collection = await Collection.findById(id);

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: '合集不存在',
      });
    }

    // 获取该合集下的作品统计信息
    const works = await Work.find({
      collectionId: id,
      status: 'published',
    }).sort({ episodeNumber: 1 });

    // 计算实际的统计数据
    const actualStats = {
      workCount: works.length,
      totalPlayCount: works.reduce((sum, work) => sum + (work.playCount || 0), 0),
      totalLikeCount: works.reduce((sum, work) => sum + (work.likeCount || 0), 0),
      totalCommentCount: works.reduce((sum, work) => sum + (work.commentCount || 0), 0),
    };

    // 返回合集信息和实际统计数据
    const result = {
      ...collection.toObject(),
      ...actualStats, // 使用实际统计数据覆盖缓存数据
      works: works, // 包含剧集列表
    };

    console.log(`✅ 成功获取合集: ${collection.title}, 共${actualStats.workCount}集`);

    res.json({
      success: true,
      data: result,
      message: '合集详情获取成功',
    });
  } catch (error) {
    console.error('❌ 获取合集详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取合集详情失败',
      error: error.message,
    });
  }
});

// GET /api/collections/:id/works - 获取合集下的所有剧集
router.get('/:id/works', async (req, res) => {
  try {
    const { id } = req.params;

    // 验证ObjectId格式
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: '无效的合集ID格式',
      });
    }

    console.log('📺 获取合集剧集列表, 合集ID:', id);

    // 检查合集是否存在
    const collection = await Collection.findById(id);
    if (!collection) {
      return res.status(404).json({
        success: false,
        message: '合集不存在',
      });
    }

    // 获取该合集下的所有剧集
    const works = await Work.find({
      collectionId: id,
      status: 'published',
    }).sort({ episodeNumber: 1 });

    console.log(`✅ 成功获取合集《${collection.title}》的 ${works.length} 个剧集`);

    res.json({
      success: true,
      data: works,
      collection: {
        id: collection._id,
        title: collection.title,
        description: collection.description,
        coverImage: collection.coverImage,
      },
      message: '合集剧集获取成功',
    });
  } catch (error) {
    console.error('❌ 获取合集剧集失败:', error);
    res.status(500).json({
      success: false,
      message: '获取合集剧集失败',
      error: error.message,
    });
  }
});

// POST /api/work/like/:workId - 点赞或取消点赞作品
router.post('/like/:workId', auth, async (req, res) => {
  try {
    const { workId } = req.params;
    const userId = req.user.id;

    // 检查作品是否存在
    const work = await Work.findById(workId);
    if (!work) {
      return res.status(404).json({ success: false, message: '作品不存在' });
    }

    // 检查用户是否已经点赞
    const isLiked = work.likes.includes(userId);

    if (isLiked) {
      // 如果已点赞，则取消点赞
      work.likes.pull(userId);
      work.likeCount = Math.max(0, work.likeCount - 1);
      await work.save();
      res.json({ success: true, message: '已取消点赞', liked: false, likeCount: work.likeCount });
    } else {
      // 如果未点赞，则添加点赞
      work.likes.push(userId);
      work.likeCount += 1;
      await work.save();
      res.json({ success: true, message: '已点赞', liked: true, likeCount: work.likeCount });
    }
  } catch (error) {
    console.error('❌ 点赞操作失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message,
    });
  }
});

module.exports = router;
