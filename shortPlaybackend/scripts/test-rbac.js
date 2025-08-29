// 测试RBAC权限系统脚本
const mongoose = require('mongoose');
const config = require('../config');
const BackgroundUser = require('../models/backgroundUser');
const Role = require('../models/role');
const Permission = require('../models/permission');

async function testRBACSystem() {
  try {
    console.log('🔗 正在连接数据库...');

    // 连接数据库
    await mongoose.connect(config.mongodb.uri, config.mongodb.options);
    console.log('✅ 数据库连接成功');

    console.log('🧪 开始测试RBAC系统...');

    // 统计数据
    const permissionCount = await Permission.countDocuments();
    const roleCount = await Role.countDocuments();
    const userCount = await BackgroundUser.countDocuments();

    console.log(`📊 系统统计:`);
    console.log(`   权限数量: ${permissionCount}`);
    console.log(`   角色数量: ${roleCount}`);
    console.log(`   用户数量: ${userCount}`);

    // 测试管理员账号
    const admin = await BackgroundUser.findOne({ account: 'admin' }).populate('roles');
    if (admin) {
      console.log(`👤 管理员账号: ${admin.account}`);
      console.log(`   姓名: ${admin.name}`);
      console.log(`   状态: ${admin.status}`);
      console.log(`   角色数量: ${admin.roles.length}`);

      if (admin.roles.length > 0) {
        console.log(`   主要角色: ${admin.roles[0].name}`);
      }

      // 测试权限获取
      const permissions = await admin.getAllPermissions();
      console.log(`   权限数量: ${permissions.length}`);
    }

    // 显示所有角色
    const roles = await Role.find().populate('permissions');
    console.log('\n🔐 角色配置:');
    for (const role of roles) {
      console.log(`   ${role.name} (${role.code}):`);
      console.log(`     级别: ${role.level}`);
      console.log(`     权限数: ${role.permissions.length}`);
      console.log(`     状态: ${role.status}`);
    }

    console.log('\n✅ RBAC系统测试完成！');
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error(error);
  } finally {
    // 关闭数据库连接
    await mongoose.connection.close();
    console.log('🔌 数据库连接已关闭');
    process.exit(0);
  }
}

// 执行测试
testRBACSystem();
