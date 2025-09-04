const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../../models/User');
const authMiddleware = require('../../middleware/auth');

const router = express.Router();

// 测试认证状态
router.get('/me', authMiddleware, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        id: req.user._id,
        nickname: req.user.nickname,
        authenticated: true
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 配置multer用于文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/avatars');
    // 确保目录存在
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB限制
  },
  fileFilter: function (req, file, cb) {
    // 只允许图片文件
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件'), false);
    }
  }
});

// 获取用户信息
router.get('/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('获取用户信息请求:', { 
      requestUserId: userId, 
      authUserId: req.user.id,
      authUserIdStr: req.user._id?.toString()
    });
    
    // 验证用户只能访问自己的信息 (比较字符串形式)
    if (req.user._id.toString() !== userId && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: '无权访问其他用户信息'
      });
    }

    const user = await User.findById(userId).select('-password -douyinProfile.accessToken -douyinProfile.refreshToken');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    res.json({
      success: true,
      data: {
        id: user._id,
        nickname: user.nickname,
        avatar: user.avatar,
        mobilePhoneNumber: user.mobilePhoneNumber,
        gender: user.gender,
        birthday: user.birthday,
        bio: user.bio,
        status: user.status,
        lastLoginAt: user.lastLoginAt
      }
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 更新用户信息
router.put('/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { nickname, avatar, mobilePhoneNumber, gender, birthday, bio } = req.body;
    
    console.log('更新用户信息请求:', { 
      requestUserId: userId, 
      authUserId: req.user.id,
      authUserIdStr: req.user._id?.toString()
    });
    
    // 验证用户只能更新自己的信息 (比较字符串形式)
    if (req.user._id.toString() !== userId && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: '无权修改其他用户信息'
      });
    }

    // 构建更新数据
    const updateData = {};
    if (nickname !== undefined) updateData.nickname = nickname;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (mobilePhoneNumber !== undefined) updateData.mobilePhoneNumber = mobilePhoneNumber;
    if (gender !== undefined) updateData.gender = gender;
    if (birthday !== undefined) updateData.birthday = birthday;
    if (bio !== undefined) updateData.bio = bio;

    const user = await User.findByIdAndUpdate(
      userId, 
      updateData, 
      { new: true, runValidators: true }
    ).select('-password -douyinProfile.accessToken -douyinProfile.refreshToken');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    res.json({
      success: true,
      data: {
        id: user._id,
        nickname: user.nickname,
        avatar: user.avatar,
        mobilePhoneNumber: user.mobilePhoneNumber,
        gender: user.gender,
        birthday: user.birthday,
        bio: user.bio
      }
    });
  } catch (error) {
    console.error('更新用户信息失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 上传头像
router.post('/upload/avatar', authMiddleware, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的头像文件'
      });
    }

    // 构建文件访问URL
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    
    // 更新用户头像
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { avatar: avatarUrl },
      { new: true }
    ).select('avatar');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    res.json({
      success: true,
      data: {
        url: avatarUrl,
        filename: req.file.filename
      }
    });
  } catch (error) {
    console.error('上传头像失败:', error);
    
    // 删除已上传的文件
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('删除文件失败:', unlinkError);
      }
    }
    
    res.status(500).json({
      success: false,
      message: '上传失败'
    });
  }
});

module.exports = router; 