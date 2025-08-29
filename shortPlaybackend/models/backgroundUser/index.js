// models/BackgroundUser.js
const mongoose = require('mongoose');

const backgroundUserSchema = new mongoose.Schema(
  {
    account: {
      type: String,
      required: [true, '账号不能为空'],
      unique: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: [true, '密码不能为空'],
    },
    // 管理员角色
    role: {
      type: String,
      enum: ['admin', 'content_manager', 'moderator'],
      default: 'content_manager',
    },
    // 管理员姓名
    name: {
      type: String,
      required: [true, '姓名不能为空'],
      trim: true,
    },
    // 管理员邮箱
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    // 账号状态
    status: {
      type: String,
      enum: ['active', 'inactive', 'locked'],
      default: 'active',
    },
    // 最后登录时间
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true, // 使用标准的 createdAt 和 updatedAt
  }
);

// 添加索引
backgroundUserSchema.index({ account: 1 });
backgroundUserSchema.index({ status: 1 });

const BackgroundUser = mongoose.model('BackgroundUser', backgroundUserSchema, 'BackgroundUser');
module.exports = BackgroundUser;
