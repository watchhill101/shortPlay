const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    mobilePhoneNumber: {
      type: String,
      trim: true,
      // 使用 sparse 索引：只对存在 phone 字段的文档强制唯一性
      // 这允许用户只通过抖音注册而没有手机号
      index: {
        unique: true,
        sparse: true,
      },
      //格式验证
      match: [/^1[3-9]\d{9}$/, '手机号格式不正确'],
    },
    douyinProfile: {
      openId: {
        type: String,
        //索引
        index: {
          unique: true,
          sparse: true,
        },
      },
      unionId: {
        // 如果你的应用在多个字节跳动平台发布，unionId 很重要
        type: String,
        index: {
          unique: true,
          sparse: true,
        },
      },
      nickname: String, // 从抖音获取的昵称
      avatar: String, // 从抖音获取的头像
      // 可以根据需要存储更多从抖音获取的信息
      gender: Number, // 0-未知，1-男，2-女
      city: String,
      province: String,
      country: String,
    },
    // --- 公共用户信息 ---
    nickname: {
      type: String,
      required: [true, 'Nickname is required'],
      trim: true,
    },
    avatar: {
      type: String,
      default: '/static/img/default-avatar.png', // 提供一个默认头像
    },

    // --- 状态与活动记录 ---
    status: {
      type: String,
      enum: ['active', 'inactive', 'banned'],
      default: 'active',
    },
    lastLoginAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // 自动管理 createdAt 和 updatedAt 字段
  }
);
// 在创建用户时，自动生成一个默认昵称 (如果未提供)
UserSchema.pre('validate', function (next) {
  if (this.isNew && !this.nickname) {
    // 如果是通过抖音登录，使用抖音的昵称
    if (this.douyinProfile && this.douyinProfile.nickname) {
      this.nickname = this.douyinProfile.nickname;
    }
    // 如果是通过手机登录，生成一个默认昵称
    else if (this.mobilePhoneNumber) {
      // 生成一个类似 "抖友_xxxxxx" 的昵称
      this.nickname = `抖友_${Math.random().toString(36).substring(2, 8)}`;
    }
  }
  next();
});

const User = mongoose.model('User', UserSchema, 'User');

module.exports = User;
