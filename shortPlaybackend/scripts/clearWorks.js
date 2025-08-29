#!/usr/bin/env node

/**
 * 清空所有works数据的脚本
 * 使用方法: node scripts/clearWorks.js
 */

const mongoose = require('mongoose');
const path = require('path');

// 加载配置
require('dotenv-expand').expand(
  require('dotenv').config({
    path: path.resolve(__dirname, '../.env.development'),
  })
);

// 导入模型
const Work = require('../models/work/index');

async function clearWorks() {
  try {
    // 连接数据库
    console.log('正在连接数据库...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shortplay');
    console.log('数据库连接成功！');

    // 清空works集合
    console.log('正在清空works数据...');
    const result = await Work.deleteMany({});
    console.log(`已删除 ${result.deletedCount} 条work记录`);

    console.log('✅ works数据清空完成！');
  } catch (error) {
    console.error('❌ 清空数据时出错:', error);
  } finally {
    // 关闭数据库连接
    await mongoose.connection.close();
    console.log('数据库连接已关闭');
    process.exit(0);
  }
}

// 执行清空操作
clearWorks();
