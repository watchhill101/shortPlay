const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User/index');
const Friend = require('../models/Friend/index');

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

// 创建测试用户数据
const createTestUsers = async () => {
  try {
    // 清空现有数据（仅测试环境）
    if (process.env.NODE_ENV !== 'production') {
      await User.deleteMany({});
      await Friend.deleteMany({});
      console.log('🗑️ 清空现有测试数据');
    }

    const testUsers = [
      {
        nickname: '阿龙',
        mobilePhoneNumber: '13800138001',
        avatar: '/static/img/avatar1.jpg',
        status: 'active',
        douyinProfile: {
          nickname: '阿龙',
          gender: 1,
          city: '北京',
          province: '北京',
          country: '中国'
        }
      },
      {
        nickname: '小明',
        mobilePhoneNumber: '13800138002',
        avatar: '/static/img/avatar2.jpg',
        status: 'active',
        douyinProfile: {
          nickname: '小明同学',
          gender: 1,
          city: '上海',
          province: '上海',
          country: '中国'
        }
      },
      {
        nickname: '小红',
        mobilePhoneNumber: '13800138003',
        avatar: '/static/img/avatar3.jpg',
        status: 'active',
        douyinProfile: {
          nickname: '小红姐姐',
          gender: 2,
          city: '广州',
          province: '广东',
          country: '中国'
        }
      },
      {
        nickname: '小刚',
        mobilePhoneNumber: '13800138004',
        avatar: '/static/img/avatar4.jpg',
        status: 'active',
        douyinProfile: {
          nickname: '小刚哥哥',
          gender: 1,
          city: '深圳',
          province: '广东',
          country: '中国'
        }
      },
      {
        nickname: '小美',
        mobilePhoneNumber: '13800138005',
        avatar: '/static/img/avatar5.jpg',
        status: 'active',
        douyinProfile: {
          nickname: '小美美',
          gender: 2,
          city: '杭州',
          province: '浙江',
          country: '中国'
        }
      },
      {
        nickname: '小李',
        mobilePhoneNumber: '13800138006',
        avatar: '/static/img/avatar6.jpg',
        status: 'active',
        douyinProfile: {
          nickname: '小李子',
          gender: 1,
          city: '成都',
          province: '四川',
          country: '中国'
        }
      },
      {
        nickname: '小王',
        mobilePhoneNumber: '13800138007',
        avatar: '/static/img/avatar7.jpg',
        status: 'active',
        douyinProfile: {
          nickname: '小王王',
          gender: 2,
          city: '武汉',
          province: '湖北',
          country: '中国'
        }
      },
      {
        nickname: '小张',
        mobilePhoneNumber: '13800138008',
        avatar: '/static/img/avatar8.jpg',
        status: 'active',
        douyinProfile: {
          nickname: '小张张',
          gender: 1,
          city: '西安',
          province: '陕西',
          country: '中国'
        }
      }
    ];

    // 创建用户
    const createdUsers = [];
    for (const userData of testUsers) {
      const user = new User(userData);
      await user.save();
      createdUsers.push(user);
      console.log(`✅ 创建用户: ${user.nickname} (${user._id})`);
    }

    return createdUsers;
  } catch (error) {
    console.error('❌ 创建测试用户失败:', error);
    throw error;
  }
};

// 创建测试好友关系
const createTestFriendships = async (users) => {
  try {
    const friendships = [
      // 阿龙的好友关系
      {
        requester: users[0]._id, // 阿龙
        recipient: users[1]._id, // 小明
        status: 'accepted',
        requestMessage: '我们是老朋友了',
        requesterRemark: '小明同学',
        recipientRemark: '龙哥',
        acceptedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7天前
        lastInteractionAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1天前
      },
      {
        requester: users[2]._id, // 小红
        recipient: users[0]._id, // 阿龙
        status: 'accepted',
        requestMessage: '加个好友吧',
        requesterRemark: '阿龙',
        recipientRemark: '小红',
        acceptedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5天前
        lastInteractionAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2小时前
      },
      {
        requester: users[3]._id, // 小刚
        recipient: users[0]._id, // 阿龙
        status: 'pending',
        requestMessage: '想和你做朋友',
        lastInteractionAt: new Date(Date.now() - 1 * 60 * 60 * 1000) // 1小时前
      },
      // 其他用户之间的关系
      {
        requester: users[1]._id, // 小明
        recipient: users[2]._id, // 小红
        status: 'accepted',
        requestMessage: '你好，加个好友',
        acceptedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3天前
        lastInteractionAt: new Date(Date.now() - 6 * 60 * 60 * 1000) // 6小时前
      },
      {
        requester: users[4]._id, // 小美
        recipient: users[1]._id, // 小明
        status: 'pending',
        requestMessage: '通过推荐添加你为好友',
        lastInteractionAt: new Date(Date.now() - 30 * 60 * 1000) // 30分钟前
      },
      {
        requester: users[5]._id, // 小李
        recipient: users[2]._id, // 小红
        status: 'rejected',
        requestMessage: '可以加个好友吗',
        lastInteractionAt: new Date(Date.now() - 12 * 60 * 60 * 1000) // 12小时前
      }
    ];

    // 创建好友关系
    for (const friendData of friendships) {
      const friendship = new Friend(friendData);
      await friendship.save();
      
      const requester = users.find(u => u._id.equals(friendData.requester));
      const recipient = users.find(u => u._id.equals(friendData.recipient));
      console.log(`✅ 创建好友关系: ${requester.nickname} → ${recipient.nickname} (${friendData.status})`);
    }

    console.log(`✅ 成功创建 ${friendships.length} 个好友关系`);
  } catch (error) {
    console.error('❌ 创建好友关系失败:', error);
    throw error;
  }
};

// 主函数
const initTestData = async () => {
  try {
    console.log('🚀 开始初始化好友系统测试数据...');
    
    await connectDB();
    const users = await createTestUsers();
    await createTestFriendships(users);
    
    console.log('🎉 测试数据初始化完成！');
    console.log('\n📊 数据统计:');
    console.log(`👥 用户数量: ${users.length}`);
    
    const friendCount = await Friend.countDocuments();
    console.log(`🤝 好友关系数量: ${friendCount}`);
    
    const pendingCount = await Friend.countDocuments({ status: 'pending' });
    console.log(`⏳ 待处理申请: ${pendingCount}`);
    
    const acceptedCount = await Friend.countDocuments({ status: 'accepted' });
    console.log(`✅ 已接受关系: ${acceptedCount}`);
    
    console.log('\n🔗 可以使用以下用户测试:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.nickname} (${user.mobilePhoneNumber}) - ID: ${user._id}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 初始化失败:', error);
    process.exit(1);
  }
};

// 如果直接运行此脚本
if (require.main === module) {
  initTestData();
}

module.exports = { initTestData, createTestUsers, createTestFriendships }; 