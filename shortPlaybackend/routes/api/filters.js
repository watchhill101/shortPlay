// shortPlaybackend/routes/api/filters.js
const express = require('express');
const router = express.Router();
const Collection = require('../../models/collection/index');
const Classifier = require('../../models/Classifier/index');

// GET /api/filters/options - 获取筛选选项
router.get('/options', async (req, res) => {
  try {
    console.log('Fetching filter options...');

    // 1. 获取所有可用的分类
    const classifiers = await Classifier.find({ status: 'active' }).sort({ order: 1 }).select('name');

    // 2. 获取所有唯一的、已发布的合集中的标签
    const tags = await Collection.distinct('tags', { status: 'published' });

    // 3. 定义固定的时间范围选项
    const timeOptions = [
      { label: '全部时间', value: 'all' },
      { label: '最近7天', value: 'seven_days' },
      { label: '最近30天', value: 'thirty_days' },
      { label: '最近半年', value: 'half_year' },
      { label: '最近一年', value: 'one_year' },
    ];

    const filterOptions = {
      classifiers,
      tags: tags.filter(tag => tag), // 过滤掉 null 或空字符串的标签
      timeOptions,
    };

    console.log('Filter options loaded successfully.');
    res.json({
      success: true,
      data: filterOptions,
      message: '筛选选项获取成功',
    });
  } catch (error) {
    console.error('Failed to fetch filter options:', error);
    res.status(500).json({
      success: false,
      message: '获取筛选选项失败',
      error: error.message,
    });
  }
});

module.exports = router;
