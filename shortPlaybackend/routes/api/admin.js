// routes/api/admin.js - 后台管理API
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Collection = require('../../models/collection');
const Work = require('../../models/work');

const router = express.Router();

// 配置文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = 'uploads/';
    if (file.fieldname === 'video') {
      uploadPath += 'video';
    } else if (file.fieldname === 'coverImage') {
      uploadPath += 'coverImage';
    }

    const fullPath = path.join(__dirname, '../../', uploadPath);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
    cb(null, fullPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB 限制
  },
  fileFilter: function (req, file, cb) {
    if (file.fieldname === 'video') {
      // 视频文件类型检查
      if (file.mimetype.startsWith('video/')) {
        cb(null, true);
      } else {
        cb(new Error('只允许上传视频文件'), false);
      }
    } else if (file.fieldname === 'coverImage') {
      // 图片文件类型检查
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('只允许上传图片文件'), false);
      }
    } else {
      cb(null, true);
    }
  },
});

// ===== 剧集管理 =====

/**
 * @route GET /api/admin/collections
 * @desc 获取所有合集（后台管理）
 * @access Private
 */
router.get(
  '/collections',
  /* authMiddleware, */ async (req, res) => {
    try {
      const {
        page = 1,
        pageSize = 10,
        status,
        classifier,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      // 构建查询条件
      const query = {};

      if (status && status !== 'all') {
        query.status = status;
      }

      if (classifier) {
        query.classifier = classifier;
      }

      if (search) {
        query.$or = [{ title: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }];
      }

      // 计算跳过数量
      const skip = (parseInt(page) - 1) * parseInt(pageSize);

      // 构建排序条件
      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // 查询合集列表
      const collections = await Collection.find(query)
        .populate('classifier', 'name')
        .populate('backgroundUser', 'account')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(pageSize));

      // 获取总数
      const total = await Collection.countDocuments(query);

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
      console.error('获取合集列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取合集列表失败',
        error: error.message,
      });
    }
  }
);

/**
 * @route GET /api/admin/collections/:id
 * @desc 获取单个合集详情
 * @access Private
 */
router.get(
  '/collections/:id',
  /* authMiddleware, */ async (req, res) => {
    try {
      const collection = await Collection.findById(req.params.id)
        .populate('classifier', 'name')
        .populate('backgroundUser', 'account');

      if (!collection) {
        return res.status(404).json({
          success: false,
          message: '合集不存在',
        });
      }

      res.json({
        success: true,
        data: collection,
        message: '合集详情获取成功',
      });
    } catch (error) {
      console.error('获取合集详情失败:', error);
      res.status(500).json({
        success: false,
        message: '获取合集详情失败',
        error: error.message,
      });
    }
  }
);

/**
 * @route POST /api/admin/collections
 * @desc 创建新合集
 * @access Private
 */
router.post('/collections', /* authMiddleware, */ upload.single('coverImage'), async (req, res) => {
  try {
    const { title, description, classifier, actors, tags, isFinished = false, status = 'published' } = req.body;

    // 处理封面图片
    let coverImage = '';
    if (req.file) {
      coverImage = `/uploads/coverImage/${req.file.filename}`;
    }

    // 处理演员列表
    let actorsList = [];
    if (actors) {
      actorsList = typeof actors === 'string' ? JSON.parse(actors) : actors;
    }

    // 处理标签列表
    let tagsList = [];
    if (tags) {
      tagsList = typeof tags === 'string' ? JSON.parse(tags) : tags;
    }

    const collection = new Collection({
      title,
      description,
      coverImage,
      classifier,
      actors: actorsList,
      tags: tagsList,
      isFinished,
      backgroundUser: null, // 暂时设为null，因为没有认证用户
      status,
    });

    await collection.save();

    res.status(201).json({
      success: true,
      data: collection,
      message: '合集创建成功',
    });
  } catch (error) {
    console.error('创建合集失败:', error);
    res.status(400).json({
      success: false,
      message: '创建合集失败',
      error: error.message,
    });
  }
});

/**
 * @route PUT /api/admin/collections/:id
 * @desc 更新合集信息
 * @access Private
 */
router.put('/collections/:id', /* authMiddleware, */ upload.single('coverImage'), async (req, res) => {
  try {
    const { title, description, classifier, actors, tags, isFinished, status } = req.body;

    const collection = await Collection.findById(req.params.id);
    if (!collection) {
      return res.status(404).json({
        success: false,
        message: '合集不存在',
      });
    }

    // 更新字段
    if (title) collection.title = title;
    if (description) collection.description = description;
    if (classifier) collection.classifier = classifier;
    if (isFinished !== undefined) collection.isFinished = isFinished;
    if (status) collection.status = status;

    // 处理封面图片
    if (req.file) {
      collection.coverImage = `/uploads/coverImage/${req.file.filename}`;
    }

    // 处理演员列表
    if (actors) {
      collection.actors = typeof actors === 'string' ? JSON.parse(actors) : actors;
    }

    // 处理标签列表
    if (tags) {
      collection.tags = typeof tags === 'string' ? JSON.parse(tags) : tags;
    }

    await collection.save();

    res.json({
      success: true,
      data: collection,
      message: '合集更新成功',
    });
  } catch (error) {
    console.error('更新合集失败:', error);
    res.status(400).json({
      success: false,
      message: '更新合集失败',
      error: error.message,
    });
  }
});

/**
 * @route DELETE /api/admin/collections/:id
 * @desc 删除合集
 * @access Private
 */
router.delete(
  '/collections/:id',
  /* authMiddleware, */ async (req, res) => {
    try {
      const collection = await Collection.findById(req.params.id);
      if (!collection) {
        return res.status(404).json({
          success: false,
          message: '合集不存在',
        });
      }

      // 检查合集下是否有剧集
      const workCount = await Work.countDocuments({ collectionId: req.params.id });
      if (workCount > 0) {
        return res.status(400).json({
          success: false,
          message: '该合集下还有剧集，请先删除所有剧集后再删除合集',
        });
      }

      await Collection.findByIdAndDelete(req.params.id);

      res.json({
        success: true,
        message: '合集删除成功',
      });
    } catch (error) {
      console.error('删除合集失败:', error);
      res.status(500).json({
        success: false,
        message: '删除合集失败',
        error: error.message,
      });
    }
  }
);

// ===== 分集管理 =====

/**
 * @route GET /api/admin/collections/:id/works
 * @desc 获取合集下的所有作品（后台管理）
 * @access Private
 */
router.get(
  '/collections/:id/works',
  /* authMiddleware, */ async (req, res) => {
    try {
      const { page = 1, pageSize = 20, status } = req.query;

      const query = { collectionId: req.params.id };
      if (status && status !== 'all') {
        query.status = status;
      }

      const skip = (parseInt(page) - 1) * parseInt(pageSize);

      const works = await Work.find(query).sort({ episodeNumber: 1 }).skip(skip).limit(parseInt(pageSize));

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
  }
);

/**
 * @route POST /api/admin/collections/:id/works
 * @desc 为合集添加新作品
 * @access Private
 */
router.post(
  '/collections/:id/works',
  /* authMiddleware, */ upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { title, episodeNumber, duration } = req.body;

      // 验证必填字段
      if (!title) {
        return res.status(400).json({
          success: false,
          message: '作品标题不能为空',
        });
      }
      if (!episodeNumber) {
        return res.status(400).json({
          success: false,
          message: '剧集编号不能为空',
        });
      }
      if (!duration) {
        return res.status(400).json({
          success: false,
          message: '视频时长不能为空',
        });
      }
      if (!req.files || !req.files.video) {
        return res.status(400).json({
          success: false,
          message: '视频文件不能为空',
        });
      }

      // 检查合集是否存在
      const collection = await Collection.findById(req.params.id);
      if (!collection) {
        return res.status(404).json({
          success: false,
          message: '合集不存在',
        });
      }

      const workData = {
        collectionId: req.params.id,
        title,
        episodeNumber: parseInt(episodeNumber),
        duration: parseInt(duration),
        status: 'pending',
      };

      // 处理视频文件
      workData.videoUrl = `/uploads/video/${req.files.video[0].filename}`;

      // 处理封面图片
      if (req.files && req.files.coverImage) {
        workData.coverImage = `/uploads/coverImage/${req.files.coverImage[0].filename}`;
      }

      const work = new Work(workData);
      await work.save();

      // 更新合集的作品数量
      await Collection.findByIdAndUpdate(req.params.id, {
        $inc: { workCount: 1 },
      });

      res.status(201).json({
        success: true,
        data: work,
        message: '作品添加成功',
      });
    } catch (error) {
      if (error.code === 11000) {
        res.status(400).json({
          success: false,
          message: '该剧集编号已存在',
        });
      } else {
        console.error('添加作品失败:', error);
        res.status(400).json({
          success: false,
          message: '添加作品失败',
          error: error.message,
        });
      }
    }
  }
);

/**
 * @route PUT /api/admin/works/:id
 * @desc 更新作品信息
 * @access Private
 */
router.put(
  '/works/:id',
  /* authMiddleware, */ upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { title, episodeNumber, duration, status } = req.body;

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
      if (duration) work.duration = parseInt(duration);
      if (status) work.status = status;

      // 处理视频文件
      if (req.files && req.files.video) {
        work.videoUrl = `/uploads/video/${req.files.video[0].filename}`;
      }

      // 处理封面图片
      if (req.files && req.files.coverImage) {
        work.coverImage = `/uploads/coverImage/${req.files.coverImage[0].filename}`;
      }

      await work.save();

      res.json({
        success: true,
        data: work,
        message: '作品更新成功',
      });
    } catch (error) {
      console.error('更新作品失败:', error);
      res.status(400).json({
        success: false,
        message: '更新作品失败',
        error: error.message,
      });
    }
  }
);

/**
 * @route DELETE /api/admin/works/:id
 * @desc 删除作品
 * @access Private
 */
router.delete(
  '/works/:id',
  /* authMiddleware, */ async (req, res) => {
    try {
      const work = await Work.findById(req.params.id);
      if (!work) {
        return res.status(404).json({
          success: false,
          message: '作品不存在',
        });
      }

      const collectionId = work.collectionId;

      // 删除作品
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
  }
);

// ===== 内容审核 =====

/**
 * @route GET /api/admin/review/collections
 * @desc 获取待审核的合集
 * @access Private
 */
router.get(
  '/review/collections',
  /* authMiddleware, */ async (req, res) => {
    try {
      const { page = 1, pageSize = 10 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(pageSize);

      // 先找到包含pending状态分集的合集ID
      const pendingWorks = await Work.find({ status: 'pending' }).distinct('collectionId');

      if (pendingWorks.length === 0) {
        return res.json({
          success: true,
          data: [],
          pagination: {
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            total: 0,
            totalPages: 0,
          },
          message: '暂无待审核内容',
        });
      }

      const collections = await Collection.find({ _id: { $in: pendingWorks } })
        .populate('classifier', 'name')
        .populate('backgroundUser', 'account')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(pageSize));

      const total = await Collection.countDocuments({ _id: { $in: pendingWorks } });

      res.json({
        success: true,
        data: collections,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total,
          totalPages: Math.ceil(total / parseInt(pageSize)),
        },
        message: '待审核合集列表获取成功',
      });
    } catch (error) {
      console.error('获取待审核合集失败:', error);
      res.status(500).json({
        success: false,
        message: '获取待审核合集失败',
        error: error.message,
      });
    }
  }
);

/**
 * @route PUT /api/admin/review/collections/:id
 * @desc 审核合集
 * @access Private
 */
router.put(
  '/review/collections/:id',
  /* authMiddleware, */ async (req, res) => {
    try {
      const { status, reviewNote } = req.body;

      if (!['published', 'archived'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: '无效的审核状态',
        });
      }

      // 先检查合集是否存在
      const collection = await Collection.findById(req.params.id);
      if (!collection) {
        return res.status(404).json({
          success: false,
          message: '合集不存在',
        });
      }

      // 更新该合集下所有pending状态的分集
      let workStatus;
      let collectionUpdate = {};

      if (status === 'published') {
        workStatus = 'published';
        // 通过审核时，更新合集状态为已发布
        collectionUpdate = {
          status: 'published',
          reviewNote,
          reviewedAt: new Date(),
          reviewedBy: req.user ? req.user._id : null,
        };
      } else if (status === 'archived') {
        workStatus = 'rejected';
        // 拒绝归档时，只更新分集状态，不更新合集状态
        collectionUpdate = {
          reviewNote,
          reviewedAt: new Date(),
          reviewedBy: req.user ? req.user._id : null,
        };
      }

      // 更新分集状态
      if (workStatus) {
        await Work.updateMany(
          {
            collectionId: req.params.id,
            status: 'pending',
          },
          {
            status: workStatus,
            reviewedAt: new Date(),
            reviewNote: reviewNote || '',
          }
        );
      }

      // 更新合集信息（但不改变合集状态，除非是通过审核）
      const updatedCollection = await Collection.findByIdAndUpdate(req.params.id, collectionUpdate, { new: true });

      res.json({
        success: true,
        data: updatedCollection,
        message: '审核完成',
      });
    } catch (error) {
      console.error('审核合集失败:', error);
      res.status(500).json({
        success: false,
        message: '审核合集失败',
        error: error.message,
      });
    }
  }
);

module.exports = router;
