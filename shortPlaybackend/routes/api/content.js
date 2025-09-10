const express = require('express');
const router = express.Router();
const Collection = require('../../models/collection');
const Work = require('../../models/work');
const Classifier = require('../../models/Classifier');
const auth = require('../../middleware/auth');
const multer = require('multer');
const path = require('path');

// 配置文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'coverImage') {
      cb(null, 'uploads/coverImage/');
    } else if (file.fieldname === 'video') {
      cb(null, 'uploads/video/');
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// ===== 剧集管理 =====

/**
 * @route GET /api/content/collections
 * @desc 获取合集列表（分页）
 * @access Private
 */
router.get('/collections', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const classifier = req.query.classifier;
    const keyword = req.query.keyword;

    const query = {};
    if (status) query.status = status;
    if (classifier) query.classifier = classifier;
    if (keyword) {
      query.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } }
      ];
    }

    const collections = await Collection.find(query)
      .populate('backgroundUser', 'name')
      .populate('classifier', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Collection.countDocuments(query);

    res.json({
      success: true,
      data: {
        collections,
        pagination: {
          current: page,
          pageSize: limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/content/collections
 * @desc 创建新合集
 * @access Private
 */
router.post('/collections', auth, upload.single('coverImage'), async (req, res) => {
  try {
    const { title, description, classifier, tags, isFinished } = req.body;
    
    const collectionData = {
      backgroundUser: req.user.id,
      title,
      description,
      classifier,
      status: 'draft',
      isFinished: isFinished === 'true'
    };

    if (req.file) {
      collectionData.coverImage = `/uploads/coverImage/${req.file.filename}`;
    }

    if (tags) {
      collectionData.tags = Array.isArray(tags) ? tags : tags.split(',');
    }

    const collection = new Collection(collectionData);
    await collection.save();

    await collection.populate(['backgroundUser', 'classifier']);

    res.status(201).json({
      success: true,
      data: collection,
      message: '合集创建成功'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route PUT /api/content/collections/:id
 * @desc 更新合集信息
 * @access Private
 */
router.put('/collections/:id', auth, upload.single('coverImage'), async (req, res) => {
  try {
    const { title, description, classifier, tags, isFinished, status } = req.body;
    
    const updateData = {
      title,
      description,
      classifier,
      isFinished: isFinished === 'true',
      status
    };

    if (req.file) {
      updateData.coverImage = `/uploads/coverImage/${req.file.filename}`;
    }

    if (tags) {
      updateData.tags = Array.isArray(tags) ? tags : tags.split(',');
    }

    const collection = await Collection.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate(['backgroundUser', 'classifier']);

    if (!collection) {
      return res.status(404).json({ success: false, message: '合集不存在' });
    }

    res.json({
      success: true,
      data: collection,
      message: '合集更新成功'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route DELETE /api/content/collections/:id
 * @desc 删除合集
 * @access Private
 */
router.delete('/collections/:id', auth, async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);
    if (!collection) {
      return res.status(404).json({ success: false, message: '合集不存在' });
    }

    // 检查是否有关联的作品
    const workCount = await Work.countDocuments({ collectionId: req.params.id });
    if (workCount > 0) {
      return res.status(400).json({ 
        success: false, 
        message: '该合集下还有作品，请先删除所有作品后再删除合集' 
      });
    }

    await Collection.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: '合集删除成功'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===== 分集管理 =====

/**
 * @route GET /api/content/collections/:id/works
 * @desc 获取合集下的所有作品
 * @access Private
 */
router.get('/collections/:id/works', auth, async (req, res) => {
  try {
    const works = await Work.find({ collectionId: req.params.id })
      .sort({ episodeNumber: 1 });

    res.json({
      success: true,
      data: works
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/content/collections/:id/works
 * @desc 为合集添加新作品
 * @access Private
 */
router.post('/collections/:id/works', auth, upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 }
]), async (req, res) => {
  try {
    const { title, episodeNumber, duration } = req.body;

    // 检查合集是否存在
    const collection = await Collection.findById(req.params.id);
    if (!collection) {
      return res.status(404).json({ success: false, message: '合集不存在' });
    }

    const workData = {
      collectionId: req.params.id,
      title,
      episodeNumber: parseInt(episodeNumber),
      duration: parseInt(duration),
      status: 'draft'
    };

    if (req.files.video) {
      workData.videoUrl = `/uploads/video/${req.files.video[0].filename}`;
    }

    if (req.files.coverImage) {
      workData.coverImage = `/uploads/coverImage/${req.files.coverImage[0].filename}`;
    }

    const work = new Work(workData);
    await work.save();

    // 更新合集的作品数量
    await Collection.findByIdAndUpdate(req.params.id, {
      $inc: { workCount: 1 }
    });

    res.status(201).json({
      success: true,
      data: work,
      message: '作品添加成功'
    });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ success: false, message: '该剧集编号已存在' });
    } else {
      res.status(400).json({ success: false, message: error.message });
    }
  }
});

/**
 * @route PUT /api/content/works/:id
 * @desc 更新作品信息
 * @access Private
 */
router.put('/works/:id', auth, upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 }
]), async (req, res) => {
  try {
    const { title, episodeNumber, duration, status } = req.body;

    const updateData = {
      title,
      episodeNumber: parseInt(episodeNumber),
      duration: parseInt(duration),
      status
    };

    if (req.files.video) {
      updateData.videoUrl = `/uploads/video/${req.files.video[0].filename}`;
    }

    if (req.files.coverImage) {
      updateData.coverImage = `/uploads/coverImage/${req.files.coverImage[0].filename}`;
    }

    const work = await Work.findByIdAndUpdate(req.params.id, updateData, { new: true });

    if (!work) {
      return res.status(404).json({ success: false, message: '作品不存在' });
    }

    res.json({
      success: true,
      data: work,
      message: '作品更新成功'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route DELETE /api/content/works/:id
 * @desc 删除作品
 * @access Private
 */
router.delete('/works/:id', auth, async (req, res) => {
  try {
    const work = await Work.findById(req.params.id);
    if (!work) {
      return res.status(404).json({ success: false, message: '作品不存在' });
    }

    const collectionId = work.collectionId;
    await Work.findByIdAndDelete(req.params.id);

    // 更新合集的作品数量
    await Collection.findByIdAndUpdate(collectionId, {
      $inc: { workCount: -1 }
    });

    res.json({
      success: true,
      message: '作品删除成功'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===== 分类管理 =====

/**
 * @route GET /api/content/classifiers
 * @desc 获取所有分类
 * @access Private
 */
router.get('/classifiers', auth, async (req, res) => {
  try {
    const classifiers = await Classifier.find({ status: 'active' })
      .sort({ order: 1 });

    res.json({
      success: true,
      data: classifiers
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/content/classifiers
 * @desc 创建新分类
 * @access Private
 */
router.post('/classifiers', auth, async (req, res) => {
  try {
    const { name, description, order } = req.body;

    const classifier = new Classifier({
      name,
      description,
      order: order || 0,
      status: 'active'
    });

    await classifier.save();

    res.status(201).json({
      success: true,
      data: classifier,
      message: '分类创建成功'
    });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ success: false, message: '分类名称已存在' });
    } else {
      res.status(400).json({ success: false, message: error.message });
    }
  }
});

// ===== 内容审核 =====

/**
 * @route PUT /api/content/collections/:id/status
 * @desc 更新合集状态（审核）
 * @access Private
 */
router.put('/collections/:id/status', auth, async (req, res) => {
  try {
    const { status, reason } = req.body;

    const collection = await Collection.findByIdAndUpdate(
      req.params.id,
      { 
        status,
        auditReason: reason || null,
        auditBy: req.user.id,
        auditAt: new Date()
      },
      { new: true }
    ).populate(['backgroundUser', 'classifier']);

    if (!collection) {
      return res.status(404).json({ success: false, message: '合集不存在' });
    }

    res.json({
      success: true,
      data: collection,
      message: `合集${status === 'published' ? '审核通过' : '审核拒绝'}`
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
