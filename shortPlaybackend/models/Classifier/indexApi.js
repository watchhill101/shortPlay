// routes/api/classifiers.js
const express = require('express');
const router = express.Router();
const Classifier = require('./index');

/**
 * @route GET /api/classifier
 * @description 获取所有分类
 * @access Public
 */
router.get('/', async (req, res) => {
  try {
    // 使用 sortorder 字段排序，因为数据库中使用的是 sortorder 而不是 order
    const classifiers = await Classifier.find({}).sort({ sortOrder: -1, createdAt: -1 });
    console.log('获取到的分类数量:', classifiers.length);
    console.log(
      '分类数据:',
      classifiers.map(c => ({ name: c.name, sortOrder: c.sortOrder }))
    );
    res.json({
      success: true,
      data: classifiers,
      message: '分类列表获取成功',
    });
  } catch (error) {
    console.error('获取分类列表失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message,
    });
  }
});

/**
 * @route GET /api/classifier/:id
 * @description 获取单个分类详情
 * @access Public
 */
router.get('/:id', async (req, res) => {
  try {
    const classifier = await Classifier.findById(req.params.id);
    if (!classifier) {
      return res.status(404).json({
        success: false,
        message: '分类不存在',
      });
    }
    res.json({
      success: true,
      data: classifier,
      message: '分类详情获取成功',
    });
  } catch (error) {
    console.error('获取分类详情失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message,
    });
  }
});

/**
 * @route POST /api/classifier
 * @description 创建新分类
 * @access Public
 */
router.post('/', async (req, res) => {
  try {
    const { name, description, sortOrder, status, icon, color } = req.body;

    const classifier = new Classifier({
      name,
      description,
      sortOrder: sortOrder || 0,
      status: status || 'active',
      icon,
      color,
    });

    await classifier.save();

    res.status(201).json({
      success: true,
      data: classifier,
      message: '分类创建成功',
    });
  } catch (error) {
    console.error('创建分类失败:', error);
    if (error.code === 11000) {
      res.status(400).json({
        success: false,
        message: '分类名称已存在',
      });
    } else {
      res.status(400).json({
        success: false,
        message: '创建分类失败',
        error: error.message,
      });
    }
  }
});

/**
 * @route PUT /api/classifier/:id
 * @description 更新分类
 * @access Public
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, description, sortOrder, status, icon, color } = req.body;

    const classifier = await Classifier.findByIdAndUpdate(
      req.params.id,
      { name, description, sortOrder, status, icon, color },
      { new: true, runValidators: true }
    );

    if (!classifier) {
      return res.status(404).json({
        success: false,
        message: '分类不存在',
      });
    }

    res.json({
      success: true,
      data: classifier,
      message: '分类更新成功',
    });
  } catch (error) {
    console.error('更新分类失败:', error);
    if (error.code === 11000) {
      res.status(400).json({
        success: false,
        message: '分类名称已存在',
      });
    } else {
      res.status(400).json({
        success: false,
        message: '更新分类失败',
        error: error.message,
      });
    }
  }
});

/**
 * @route DELETE /api/classifier/:id
 * @description 删除分类
 * @access Public
 */
router.delete('/:id', async (req, res) => {
  try {
    const classifier = await Classifier.findByIdAndDelete(req.params.id);

    if (!classifier) {
      return res.status(404).json({
        success: false,
        message: '分类不存在',
      });
    }

    res.json({
      success: true,
      message: '分类删除成功',
    });
  } catch (error) {
    console.error('删除分类失败:', error);
    res.status(500).json({
      success: false,
      message: '删除分类失败',
      error: error.message,
    });
  }
});

module.exports = router;
