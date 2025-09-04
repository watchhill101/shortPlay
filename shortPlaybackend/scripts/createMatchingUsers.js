const mongoose = require('mongoose');
const User = require('../models/User/index');

// 连接数据库
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shortplay', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB连接成功');
  } catch (error) {
    console.error('❌ MongoDB连接失败:', error);
    process.exit(1);
  }
};

// 创建匹配的用户数据
const createMatchingUsers = async () => {
  try {
    // 清空现有数据
    await User.deleteMany({});
    await Friend.deleteMany({});
    console.log('🗑️ 清空现有数据');

    // 创建与前端ID匹配的用户
    const users = [
      {
        _id: new mongoose.Types.ObjectId('68b19015d2f73796f58caf13'),
        nickname: '阿龙',
        mobilePhoneNumber: '13800138001',
        avatar: '/static/img/avatar1.jpg',
        status: 'active',
        lastLoginAt: new Date()
      },
      {
        _id: new mongoose.Types.ObjectId('68b19015d2f73796f58caf14'),
        nickname: '小明',
        mobilePhoneNumber: '13800138002',
        avatar: '/static/img/avatar2.jpg',
        status: 'active',
        lastLoginAt: new Date(Date.now() - 60000)
      },
      {
        _id: new mongoose.Types.ObjectId('68b19015d2f73796f58caf15'),
        nickname: '小红',
        mobilePhoneNumber: '13800138003',
        avatar: '/static/img/avatar3.jpg',
        status: 'active',
        lastLoginAt: new Date(Date.now() - 120000)
      },
      {
        _id: new mongoose.Types.ObjectId('68b19015d2f73796f58caf16'),
        nickname: '小刚',
        mobilePhoneNumber: '13800138004',
        avatar: '/static/img/avatar4.jpg',
        status: 'active',
        lastLoginAt: new Date(Date.now() - 180000)
      },
      {
        _id: new mongoose.Types.ObjectId('68b19015d2f73796f58caf17'),
        nickname: '小美',
        mobilePhoneNumber: '13800138005',
        avatar: '/static/img/avatar5.jpg',
        status: 'active',
        lastLoginAt: new Date(Date.now() - 240000)
      }
    ];

    // 插入用户
    for (const userData of users) {
      const user = new User(userData);
      await user.save();
      console.log(`✅ 创建用户: ${user.nickname} (${user._id})`);
    }

    console.log('🎉 用户数据创建完成！');
    console.log('\n📋 可用的测试用户:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.nickname} - ID: ${user._id}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ 创建用户失败:', error);
    process.exit(1);
  }
};

// 主函数
const init = async () => {
  await connectDB();
  await createMatchingUsers();
};

if (require.main === module) {
  init();
}

module.exports = { createMatchingUsers }; 