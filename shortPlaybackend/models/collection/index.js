// models/Collection.js
const mongoose = require('mongoose');

const CollectionSchema = new mongoose.Schema(
  {
    backgroundUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BackgroundUser',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, '合集标题不能为空'],
      trim: true,
      index: true, // 为标题添加索引，便于搜索
    },
    description: {
      type: String,
      required: [true, '合集简介不能为空'],
    },
    coverImage: {
      type: String,
      required: [true, '合集封面图不能为空'],
    },
    // 关联分类
    classifier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Classifier',
      required: true,
      index: true,
    },
    // 状态：draft（草稿）, published（已发布）, archived（已归档）
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    tags: [String],
    isFinished: {
      type: Boolean,
      default: false, // 标记该合集是否已完结
    },

    // --- 计数器缓存 ---
    // 为了性能，这些数据可以在相关操作（如发布作品、收藏）时更新，而不是实时查询
    workCount: {
      type: Number,
      default: 0,
    },
    totalPlayCount: {
      // 合集总播放量
      type: Number,
      default: 0,
    },
    collectCount: {
      // 合集被收藏次数
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const Collection = mongoose.model('Collection', CollectionSchema, 'Collection');
module.exports = Collection;
