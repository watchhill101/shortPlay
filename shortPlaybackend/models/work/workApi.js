// routes/api/work.js - Work模型专用API
const express = require('express');
const Work = require('./index');
const Collection = require('../collection/index');
const router = express.Router();

/**
 * @route GET /api/work
 * @description 获取作品列表
 * @access Public
 */
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      collectionId,
      status = 'published',
      sortBy = 'episodeNumber',
      sortOrder = 'asc',
    } = req.query;

    // 构建查询条件
    const query = {};

    if (collectionId) {
      query.collectionId = collectionId;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    // 计算跳过的数量
    const skip = (parseInt(page) - 1) * parseInt(pageSize);

    // 构建排序选项
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // 获取作品列表
    const works = await Work.find(query)
      .populate('collectionId', 'title coverImage')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(pageSize));

    // 获取总数
    const total = await Work.countDocuments(query);

    res.json({
      success: true,
      data: works,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total,
        totalPages: Math.ceil(total / parseInt(pageSize)),
      },
      message: '作品列表获取成功',
    });
  } catch (error) {
    console.error('获取作品列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取作品列表失败',
      error: error.message,
    });
  }
});

/**
 * @route GET /api/work/:id
 * @description 获取单个作品详情
 * @access Public
 */
router.get('/:id', async (req, res) => {
  try {
    const work = await Work.findById(req.params.id).populate('collectionId', 'title coverImage description');

    if (!work) {
      return res.status(404).json({
        success: false,
        message: '作品不存在',
      });
    }

    res.json({
      success: true,
      data: work,
      message: '作品详情获取成功',
    });
  } catch (error) {
    console.error('获取作品详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取作品详情失败',
      error: error.message,
    });
  }
});

/**
 * @route POST /api/work
 * @description 创建新作品
 * @access Private
 */
router.post('/', async (req, res) => {
  try {
    const { collectionId, title, episodeNumber, videoUrl, coverImage, duration, status = 'draft' } = req.body;

    // 检查合集是否存在
    const collection = await Collection.findById(collectionId);
    if (!collection) {
      return res.status(404).json({
        success: false,
        message: '合集不存在',
      });
    }

    const work = new Work({
      collectionId,
      title,
      episodeNumber: parseInt(episodeNumber),
      videoUrl,
      coverImage,
      duration: parseInt(duration),
      status,
    });

    await work.save();

    // 更新合集的作品数量
    await Collection.findByIdAndUpdate(collectionId, {
      $inc: { workCount: 1 },
    });

    res.status(201).json({
      success: true,
      data: work,
      message: '作品创建成功',
    });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({
        success: false,
        message: '该剧集编号已存在',
      });
    } else {
      console.error('创建作品失败:', error);
      res.status(400).json({
        success: false,
        message: '创建作品失败',
        error: error.message,
      });
    }
  }
});

/**
 * @route PUT /api/work/:id
 * @description 更新作品
 * @access Private
 */
router.put('/:id', async (req, res) => {
  try {
    const { title, episodeNumber, videoUrl, coverImage, duration, status } = req.body;

    const work = await Work.findById(req.params.id);
    if (!work) {
      return res.status(404).json({
        success: false,
        message: '作品不存在',
      });
    }

    // 更新字段
    if (title) work.title = title;
    if (episodeNumber) work.episodeNumber = parseInt(episodeNumber);
    if (videoUrl) work.videoUrl = videoUrl;
    if (coverImage !== undefined) work.coverImage = coverImage;
    if (duration) work.duration = parseInt(duration);
    if (status) work.status = status;

    await work.save();

    res.json({
      success: true,
      data: work,
      message: '作品更新成功',
    });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({
        success: false,
        message: '该剧集编号已存在',
      });
    } else {
      console.error('更新作品失败:', error);
      res.status(400).json({
        success: false,
        message: '更新作品失败',
        error: error.message,
      });
    }
  }
});

/**
 * @route DELETE /api/work/:id
 * @description 删除作品
 * @access Private
 */
router.delete('/:id', async (req, res) => {
  try {
    const work = await Work.findById(req.params.id);
    if (!work) {
      return res.status(404).json({
        success: false,
        message: '作品不存在',
      });
    }

    const collectionId = work.collectionId;
    await Work.findByIdAndDelete(req.params.id);

    // 更新合集的作品数量
    await Collection.findByIdAndUpdate(collectionId, {
      $inc: { workCount: -1 },
    });

    res.json({
      success: true,
      message: '作品删除成功',
    });
  } catch (error) {
    console.error('删除作品失败:', error);
    res.status(500).json({
      success: false,
      message: '删除作品失败',
      error: error.message,
    });
  }
});

module.exports = router;
