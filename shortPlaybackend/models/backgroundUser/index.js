// models/BackgroundUser.js
const mongoose = require('mongoose');

const backgroundUserSchema = new mongoose.Schema(
  {
    account: {
      type: String,
      required: [true, '账号不能为空'],
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, '密码不能为空'],
    },
    // 关联角色（RBAC）
    roles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role',
      },
    ],
    // 额外权限（特殊情况下直接分配给用户的权限）
    additionalPermissions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Permission',
      },
    ],
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

// 用户权限验证方法
backgroundUserSchema.methods.hasPermission = async function (permissionCode) {
  // 1. 调用 getAllPermissions() 获取当前用户实例的所有权限对象
  const allPermissions = await this.getAllPermissions();

  // 2. 使用 Array.prototype.some() 方法来检查
  //    在所有权限对象中，是否存在任何一个权限的 code 与传入的 permissionCode 相等。
  //    .some() 只要找到一个匹配项就会立刻返回 true，效率很高。
  const hasPerm = allPermissions.some(perm => perm.code === permissionCode);

  // 3. 返回最终的布尔值结果
  return hasPerm;
};

// 获取用户所有权限
backgroundUserSchema.methods.getAllPermissions = async function () {
  const Role = require('../role');
  const Permission = require('../permission');

  // 获取角色权限
  const rolesWithPermissions = await Role.find({
    _id: { $in: this.roles },
    status: 'active',
  }).populate('permissions');

  const rolePermissions = rolesWithPermissions.reduce((acc, role) => {
    return acc.concat(role.permissions);
  }, []);

  // 获取额外权限
  const additionalPerms = await Permission.find({
    _id: { $in: this.additionalPermissions },
    status: 'active',
  });

  // 合并并去重
  const allPermissions = [...rolePermissions, ...additionalPerms];
  const uniquePermissions = allPermissions.filter(
    (perm, index, self) => index === self.findIndex(p => p._id.toString() === perm._id.toString())
  );

  return uniquePermissions;
};

const BackgroundUser = mongoose.model('BackgroundUser', backgroundUserSchema, 'BackgroundUser');
module.exports = BackgroundUser;
