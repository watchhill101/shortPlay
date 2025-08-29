const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// 加载现有配置
require('../config/index');

// 导入模型
const Work = require('../models/work/index');
const Collection = require('../models/collection/index');

async function importUploads() {
  try {
    // 连接数据库 - 使用现有配置
    console.log('正在连接数据库...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('数据库连接成功！');

    // 获取uploads文件
    const videoDir = path.join(__dirname, '../uploads/video');
    const coverDir = path.join(__dirname, '../uploads/coverImage');
    
    const videoFiles = fs.readdirSync(videoDir).filter(f => f.endsWith('.mp4'));
    const coverFiles = fs.readdirSync(coverDir).filter(f => f.endsWith('.png'));
    
    console.log(`视频文件: ${videoFiles.length}个`);
    console.log(`封面文件: ${coverFiles.length}个`);

    // 创建默认合集
    let collection = await Collection.findOne({ title: '本地短剧合集' });
    if (!collection) {
      collection = new Collection({
        backgroundUser: new mongoose.Types.ObjectId(),
        title: '本地短剧合集',
        description: '本地上传的短剧作品',
        coverImage: `/uploads/coverImage/${coverFiles[0]}`,
        classifier: new mongoose.Types.ObjectId(),
        status: 'published'
      });
      await collection.save();
    }

    // 清空现有works
    await Work.deleteMany({});

    // 导入works
    const works = videoFiles.map((videoFile, index) => ({
      collectionId: collection._id,
      title: `短剧 ${index + 1}`,
      episodeNumber: index + 1,
      videoUrl: `/uploads/video/${videoFile}`,
      coverImage: `/uploads/coverImage/${coverFiles[index % coverFiles.length]}`,
      duration: 300 + Math.floor(Math.random() * 600), // 5-15分钟
      status: 'published',
      playCount: Math.floor(Math.random() * 5000),
      likeCount: Math.floor(Math.random() * 500),
      commentCount: Math.floor(Math.random() * 50)
    }));

    const result = await Work.insertMany(works);
    console.log(`✅ 成功导入 ${result.length} 个作品`);

  } catch (error) {
    console.error('❌ 导入失败:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

importUploads();
