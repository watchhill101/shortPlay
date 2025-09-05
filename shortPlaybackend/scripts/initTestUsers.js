const mongoose = require('mongoose');

const User = require('../models/User/index');
const Message = require('../models/Message/index');
const config = require('../config/index');

// 连接数据库
async function connectDB() {
  try {
    await mongoose.connect(config.database.uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('数据库连接成功');
  } catch (error) {
    console.error('数据库连接失败:', error);
    process.exit(1);
  }
}

// 测试用户数据
const testUsers = [
  {
    nickname: 'UserA',
    avatar: 'https://img2.baidu.com/it/u=1978192862,2048448374&fm=253&fmt=auto&app=138&f=JPEG?w=504&h=500',
    mobilePhoneNumber: '13800138001',
    status: 'active',
    douyinProfile: {
      nickname: 'UserA',
      avatar: 'https://img2.baidu.com/it/u=1978192862,2048448374&fm=253&fmt=auto&app=138&f=JPEG?w=504&h=500',
      gender: 1,
      city: '北京',
      province: '北京',
      country: '中国',
    },
  },
  {
    nickname: 'UserB',
    avatar: 'https://img1.baidu.com/it/u=1996815830,3764325567&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=500',
    mobilePhoneNumber: '13800138002',
    status: 'active',
    douyinProfile: {
      nickname: 'UserB',
      avatar: 'https://img1.baidu.com/it/u=1996815830,3764325567&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=500',
      gender: 2,
      city: '上海',
      province: '上海',
      country: '中国',
    },
  },
];

// 初始化测试消息数据
const initTestMessages = async (userA, userB) => {
  const testMessages = [
    {
      senderId: userA._id,
      receiverId: userB._id,
      content: '你好，我是UserA！',
      messageType: 'text',
      status: 'read',
      isRead: true,
      readAt: new Date(Date.now() - 60000), // 1分钟前已读
    },
    {
      senderId: userB._id,
      receiverId: userA._id,
      content: '你好UserA，很高兴认识你！',
      messageType: 'text',
      status: 'read',
      isRead: true,
      readAt: new Date(Date.now() - 50000), // 50秒前已读
    },
    {
      senderId: userA._id,
      receiverId: userB._id,
      content: '今天天气不错呢',
      messageType: 'text',
      status: 'read',
      isRead: true,
      readAt: new Date(Date.now() - 40000), // 40秒前已读
    },
    {
      senderId: userB._id,
      receiverId: userA._id,
      content: '是的，适合出去走走',
      messageType: 'text',
      status: 'sent',
      isRead: false, // 未读消息
    },
    {
      senderId: userB._id,
      receiverId: userA._id,
      content: '你有什么推荐的地方吗？',
      messageType: 'text',
      status: 'sent',
      isRead: false, // 未读消息
    },
  ];

  // 创建消息，设置不同的创建时间
  for (let i = 0; i < testMessages.length; i++) {
    const messageData = testMessages[i];
    const message = new Message(messageData);

    // 设置创建时间，每条消息间隔10秒
    message.createdAt = new Date(Date.now() - (testMessages.length - i) * 10000);
    message.updatedAt = message.createdAt;

    await message.save();
    console.log(`创建测试消息 ${i + 1}:`, message.content);
  }
};

// 初始化测试用户
async function initTestUsers() {
  try {
    console.log('开始初始化测试用户...');

    // 检查是否已存在测试用户
    const existingUserA = await User.findOne({ nickname: 'UserA' });
    const existingUserB = await User.findOne({ nickname: 'UserB' });

    if (existingUserA && existingUserB) {
      console.log('测试用户已存在，跳过创建');
      console.log('UserA ID:', existingUserA._id);
      console.log('UserB ID:', existingUserB._id);

      // 检查是否已有测试消息
      const messageCount = await Message.countDocuments({
        $or: [
          { senderId: existingUserA._id, receiverId: existingUserB._id },
          { senderId: existingUserB._id, receiverId: existingUserA._id },
        ],
      });

      if (messageCount === 0) {
        console.log('创建测试消息...');
        await initTestMessages(existingUserA, existingUserB);
      } else {
        console.log('测试消息已存在，跳过创建');
      }

      return { userA: existingUserA, userB: existingUserB };
    }

    // 删除可能存在的旧测试用户
    await User.deleteMany({ nickname: { $in: ['UserA', 'UserB'] } });
    console.log('清理旧的测试用户数据');

    // 创建新的测试用户
    const createdUsers = [];

    for (const userData of testUsers) {
      const user = new User(userData);
      await user.save();
      createdUsers.push(user);
      console.log(`创建测试用户: ${user.nickname} (ID: ${user._id})`);
    }

    const [userA, userB] = createdUsers;

    // 创建测试消息
    console.log('创建测试消息...');
    await initTestMessages(userA, userB);

    console.log('测试用户和消息初始化完成！');
    console.log('UserA ID:', userA._id);
    console.log('UserB ID:', userB._id);

    return { userA, userB };
  } catch (error) {
    console.error('初始化测试用户失败:', error);
    throw error;
  }
}

// 获取测试用户信息
async function getTestUsers() {
  try {
    const userA = await User.findOne({ nickname: 'UserA' });
    const userB = await User.findOne({ nickname: 'UserB' });

    if (!userA || !userB) {
      throw new Error('测试用户不存在，请先运行初始化脚本');
    }

    return { userA, userB };
  } catch (error) {
    console.error('获取测试用户失败:', error);
    throw error;
  }
}

// 清理测试数据
async function cleanTestData() {
  try {
    console.log('开始清理测试数据...');

    // 获取测试用户
    const userA = await User.findOne({ nickname: 'UserA' });
    const userB = await User.findOne({ nickname: 'UserB' });

    if (userA && userB) {
      // 删除测试消息
      await Message.deleteMany({
        $or: [{ senderId: userA._id }, { receiverId: userA._id }, { senderId: userB._id }, { receiverId: userB._id }],
      });
      console.log('删除测试消息');
    }

    // 删除测试用户
    await User.deleteMany({ nickname: { $in: ['UserA', 'UserB'] } });
    console.log('删除测试用户');

    console.log('测试数据清理完成！');
  } catch (error) {
    console.error('清理测试数据失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  (async () => {
    await connectDB();

    const command = process.argv[2];

    try {
      switch (command) {
        case 'init':
          await initTestUsers();
          break;
        case 'clean':
          await cleanTestData();
          break;
        case 'get':
          const users = await getTestUsers();
          console.log('测试用户信息:', users);
          break;
        default:
          console.log('使用方法:');
          console.log('  node initTestUsers.js init   - 初始化测试用户');
          console.log('  node initTestUsers.js clean  - 清理测试数据');
          console.log('  node initTestUsers.js get    - 获取测试用户信息');
      }
    } catch (error) {
      console.error('操作失败:', error);
    } finally {
      await mongoose.disconnect();
      console.log('数据库连接已关闭');
    }
  })();
}

module.exports = {
  initTestUsers,
  getTestUsers,
  cleanTestData,
  connectDB,
};
