// routes/api/uniIdAuth.js - uni-id-co认证相关路由
const express = require('express');
const User = require('../../models/User');
const { verifyUniIdToken, hybridAuth } = require('../../middleware/uniIdAuth');

const router = express.Router();

/**
 * @desc    验证uni-id-co Token并获取用户信息
 * @route   GET /api/uniid-auth/verify
 * @access  Private (需要uni-id-co Token)
 */
router.get('/verify', verifyUniIdToken, async (req, res, next) => {
  try {
    // 从数据库获取用户详细信息
    const user = await User.findById(req.user.id).select('-__v');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          nickname: user.nickname,
          avatar: user.avatar,
          mobilePhoneNumber: user.mobilePhoneNumber,
          douyinProfile: user.douyinProfile,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt
        },
        tokenInfo: {
          type: 'uniId',
          userId: req.user.id,
          role: req.user.role,
          permissions: req.user.permissions
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @desc    更新用户信息（支持uni-id-co Token）
 * @route   PUT /api/uniid-auth/profile
 * @access  Private (需要uni-id-co Token)
 */
router.put('/profile', verifyUniIdToken, async (req, res, next) => {
  try {
    const { nickname, avatar } = req.body;
    
    const updateData = {};
    if (nickname) updateData.nickname = nickname;
    if (avatar) updateData.avatar = avatar;
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, select: '-__v' }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          nickname: user.nickname,
          avatar: user.avatar,
          mobilePhoneNumber: user.mobilePhoneNumber
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @desc    获取用户会话信息（兼容uni-id-co和传统Token）
 * @route   GET /api/uniid-auth/sessions
 * @access  Private
 */
router.get('/sessions', hybridAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('nickname avatar lastLoginAt');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        currentSession: {
          userId: req.user.id,
          tokenType: req.user.tokenType,
          lastLoginAt: user.lastLoginAt,
          nickname: user.nickname,
          avatar: user.avatar
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @desc    同步用户数据（从uni-id-co到本地数据库）
 * @route   POST /api/uniid-auth/sync-user
 * @access  Private (需要uni-id-co Token)
 */
router.post('/sync-user', verifyUniIdToken, async (req, res, next) => {
  try {
    const { mobile, nickname, avatar } = req.body;
    
    // 查找或创建用户
    let user = await User.findById(req.user.id);
    
    if (!user) {
      // 创建新用户
      user = new User({
        _id: req.user.id, // 使用uni-id-co的用户ID
        mobilePhoneNumber: mobile,
        nickname: nickname || `用户${mobile ? mobile.slice(-4) : req.user.id.slice(-4)}`,
        avatar: avatar || '/static/img/default-avatar.png',
        lastLoginAt: new Date()
      });
    } else {
      // 更新现有用户
      if (mobile && !user.mobilePhoneNumber) {
        user.mobilePhoneNumber = mobile;
      }
      if (nickname) user.nickname = nickname;
      if (avatar) user.avatar = avatar;
      user.lastLoginAt = new Date();
    }
    
    await user.save();

    res.json({
      success: true,
      message: 'User data synchronized successfully',
      data: {
        user: {
          id: user._id,
          nickname: user.nickname,
          avatar: user.avatar,
          mobilePhoneNumber: user.mobilePhoneNumber
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
