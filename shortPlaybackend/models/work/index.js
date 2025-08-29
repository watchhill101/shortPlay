// models/Work.js
const mongoose = require('mongoose');

const WorkSchema = new mongoose.Schema(
  {
    // 关联到具体的合集
    collectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Collection',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, '作品标题不能为空'],
      trim: true,
    },
    // 剧集编号，用于排序
    episodeNumber: {
      type: Number,
      required: [true, '剧集编号不能为空'],
    },
    videoUrl: {
      type: String,
      required: [true, '视频地址不能为空'],
    },
    // 单集封面，如果未提供，前端可使用合集封面
    coverImage: {
      type: String,
    },
    // 视频时长（秒）
    duration: {
      type: Number,
      required: [true, '视频时长不能为空'],
    },
    // 状态：draft（草稿）, published（已发布）
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
    },

    // --- 计数器缓存 ---
    playCount: {
      type: Number,
      default: 0,
    },
    likeCount: {
      type: Number,
      default: 0,
    },
    commentCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// 创建复合索引，确保同一合集下的剧集编号是唯一的
WorkSchema.index({ collectionId: 1, episodeNumber: 1 }, { unique: true });
// 添加状态索引
WorkSchema.index({ status: 1 });

const Work = mongoose.model('Work', WorkSchema);
module.exports = Work;
