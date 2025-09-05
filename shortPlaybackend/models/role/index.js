// models/Role.js
const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema(
  {
    // 角色名称
    name: {
      type: String,
      required: [true, '角色名称不能为空'],
      unique: true,
      trim: true,
    },
    // 角色编码
    code: {
      type: String,
      required: [true, '角色编码不能为空'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    // 角色描述
    description: {
      type: String,
      trim: true,
    },
    // 角色级别（数字越小权限越高）
    level: {
      type: Number,
      required: true,
      default: 99,
      min: 1,
      max: 99,
    },
    // 角色关联的权限
    permissions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Permission',
      },
    ],
    // 角色状态
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    // 是否为系统内置角色（内置角色不可删除）
    isBuiltIn: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// 添加索引
roleSchema.index({ level: 1 });
roleSchema.index({ status: 1 });

const Role = mongoose.model('Role', roleSchema, 'Role');
module.exports = Role;
