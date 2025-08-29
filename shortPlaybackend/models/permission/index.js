// models/Permission.js
const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema(
  {
    // 权限名称
    name: {
      type: String,
      required: [true, '权限名称不能为空'],
      unique: true,
      trim: true,
    },
    // 权限编码（用于程序判断）
    code: {
      type: String,
      required: [true, '权限编码不能为空'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    // 权限描述
    description: {
      type: String,
      trim: true,
    },
    // 权限分组
    group: {
      type: String,
      required: true,
      enum: ['navigation', 'content', 'user', 'system', 'data'],
      default: 'navigation',
    },
    // 权限类型
    type: {
      type: String,
      required: true,
      enum: ['menu', 'button', 'api', 'data'],
      default: 'menu',
    },
    // 资源路径（用于菜单权限）
    resource: {
      type: String,
      trim: true,
    },
    // 权限状态
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  { timestamps: true }
);

// 添加索引
permissionSchema.index({ code: 1 });
permissionSchema.index({ group: 1, type: 1 });
permissionSchema.index({ status: 1 });

const Permission = mongoose.model('Permission', permissionSchema, 'Permission');
module.exports = Permission;
