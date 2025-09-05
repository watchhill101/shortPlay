// models/Classifier.js
const mongoose = require('mongoose');

const ClassifierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, '分类名称不能为空'],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    // 用于排序，数字越小越靠前
    order: {
      type: Number,
      default: 0,
    },
    // 分类状态，可以动态上下线某个分类
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    // 分类图标（可选）
    icon: {
      type: String,
    },
    // 分类颜色（可选）
    color: {
      type: String,
    },
  },
  { timestamps: true }
);

// 添加索引
ClassifierSchema.index({ status: 1 });
ClassifierSchema.index({ order: 1 });

// 添加索引
ClassifierSchema.index({ status: 1 });
ClassifierSchema.index({ order: 1 });

const Classifier = mongoose.model('Classifier', ClassifierSchema);
module.exports = Classifier;
