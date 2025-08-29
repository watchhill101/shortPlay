const mongoose = require('mongoose');

const secondaryNavigationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, '二级导航标题不能为空'],
      trim: true,
    },
    link: {
      type: String,
      required: [true, '二级导航链接不能为空'],
      trim: true,
    },
    // 图标
    icon: {
      type: String,
      trim: true,
    },
    // 父级导航（关联一级导航）
    parentNavigation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PrimaryNavigation',
      required: [true, '必须指定父级导航'],
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
    // 是否显示
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
secondaryNavigationSchema.index({ parentNavigation: 1, order: 1 });
secondaryNavigationSchema.index({ permission: 1 });
secondaryNavigationSchema.index({ status: 1, visible: 1 });

const SecondaryNavigation = mongoose.model('SecondaryNavigation', secondaryNavigationSchema, 'SecondaryNavigation');
module.exports = SecondaryNavigation;
