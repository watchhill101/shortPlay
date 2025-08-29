const mongoose = require('mongoose');

const primaryNavigationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, '导航标题不能为空'],
      trim: true,
    },
    link: {
      type: String,
      required: [true, '导航链接不能为空'],
      trim: true,
    },
    // 图标
    icon: {
      type: String,
      trim: true,
    },
    // 权限控制 - 关联权限
    permission: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Permission',
      required: [true, '导航权限不能为空'],
    },
    // 排序
    order: {
      type: Number,
      default: 0,
    },
    // 状态
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    // 是否显示（可以用于临时隐藏菜单）
    visible: {
      type: Boolean,
      default: true,
    },
    // 创建者
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BackgroundUser',
    },
  },
  { timestamps: true }
);

// 添加索引
primaryNavigationSchema.index({ permission: 1 });
primaryNavigationSchema.index({ status: 1, visible: 1 });
primaryNavigationSchema.index({ order: 1 });

const PrimaryNavigation = mongoose.model('PrimaryNavigation', primaryNavigationSchema, 'PrimaryNavigation');
module.exports = PrimaryNavigation;
