// 初始化RBAC权限系统脚本
const mongoose = require('mongoose');
const config = require('../config');
const { initRBACSystem } = require('../models/rbac-init');

async function initializeRBACSystem() {
  try {
    console.log('🔗 正在连接数据库...');

    // 连接数据库
    await mongoose.connect(config.mongodb.uri, config.mongodb.options);
    console.log('✅ 数据库连接成功');

    console.log('🚀 开始初始化RBAC权限系统...');

    // 初始化RBAC系统
    await initRBACSystem();

    console.log('🎉 RBAC权限系统初始化完成！');
    console.log('');
    console.log('📋 默认账号信息:');
    console.log('   账号: admin');
    console.log('   密码: password');
    console.log('   角色: 超级管理员');
    console.log('');
    console.log('🔐 默认角色配置:');
    console.log('   - 超级管理员 (SUPER_ADMIN): 拥有所有权限');
    console.log('   - 内容管理员 (CONTENT_MANAGER): 内容和导航管理');
    console.log('   - 数据分析员 (DATA_ANALYST): 数据统计分析');
    console.log('   - 审核员 (MODERATOR): 内容审核');
  } catch (error) {
    console.error('❌ RBAC初始化失败:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    // 关闭数据库连接
    await mongoose.connection.close();
    console.log('🔌 数据库连接已关闭');
    process.exit(0);
  }
}

// 执行初始化
initializeRBACSystem();
