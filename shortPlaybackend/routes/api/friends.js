const express = require('express');
const mongoose = require('mongoose');
const Friend = require('../../models/Friend/index');
const User = require('../../models/User/index');
const router = express.Router();

// 搜索用户（用于添加好友）
router.get('/search/users', async (req, res) => {
  try {
    const { keyword, currentUserId } = req.query;
    const { page = 1, limit = 20 } = req.query;

    console.log('搜索参数:', { keyword, currentUserId, page, limit });

    // 如果没有关键词，返回最近注册的用户作为推荐
    if (!keyword || keyword.trim().length === 0) {
      const users = await User.find({
        _id: { $ne: new mongoose.Types.ObjectId(currentUserId) },
        status: 'active',
      })
        .select('nickname avatar status lastLoginAt mobilePhoneNumber douyinProfile')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));

      const usersWithRelation = await Promise.all(
        users.map(async user => {
          const relation = await Friend.findOne({
            $or: [
              { requester: currentUserId, recipient: user._id },
              { requester: user._id, recipient: currentUserId },
            ],
          });
          return {
            ...user.toObject(),
            relationStatus: relation ? relation.status : null,
            relationId: relation ? relation._id : null,
          };
        })
      );

      return res.json({
        success: true,
        data: {
          users: usersWithRelation,
          pagination: {
            page: 1,
            limit: parseInt(limit),
            total: usersWithRelation.length,
            totalPages: 1,
          },
        },
      });
    }

    if (!currentUserId) {
      return res.status(400).json({
        success: false,
        message: '当前用户ID不能为空',
      });
    }

    const skip = (page - 1) * limit;

    // 搜索用户（排除自己）
    const searchQuery = {
      _id: { $ne: new mongoose.Types.ObjectId(currentUserId) },
      $or: [
        { nickname: { $regex: keyword, $options: 'i' } },
        { mobilePhoneNumber: { $regex: keyword } },
        { 'douyinProfile.nickname': { $regex: keyword, $options: 'i' } },
      ],
      status: 'active',
    };

    const users = await User.find(searchQuery)
      .select('nickname avatar status lastLoginAt mobilePhoneNumber')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ lastLoginAt: -1 });

    const total = await User.countDocuments(searchQuery);

    // 检查每个用户与当前用户的好友关系
    const usersWithRelation = await Promise.all(
      users.map(async user => {
        const relation = await Friend.findOne({
          $or: [
            { requester: currentUserId, recipient: user._id },
            { requester: user._id, recipient: currentUserId },
          ],
        });
        return {
          ...user.toObject(),
          relationStatus: relation ? relation.status : null,
          relationId: relation ? relation._id : null,
        };
      })
    );

    res.json({
      success: true,
      data: {
        users: usersWithRelation,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('搜索用户失败:', error);
    res.status(500).json({
      success: false,
      message: '搜索用户失败',
      error: error.message,
    });
  }
});

// 发送好友申请
router.post('/request', async (req, res) => {
  try {
    const { requesterId, recipientId, message = '我想加你为好友' } = req.body;

    if (!requesterId || !recipientId) {
      return res.status(400).json({
        success: false,
        message: '用户ID不能为空',
      });
    }

    if (requesterId === recipientId) {
      return res.status(400).json({
        success: false,
        message: '不能添加自己为好友',
      });
    }

    // 检查接收者是否存在
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
      });
    }

    // 检查是否已存在好友关系
    const existingRelation = await Friend.findOne({
      $or: [
        { requester: requesterId, recipient: recipientId },
        { requester: recipientId, recipient: requesterId },
      ],
    });

    if (existingRelation) {
      let message = '';
      switch (existingRelation.status) {
        case 'accepted':
          message = '已经是好友了';
          break;
        case 'pending':
          message = '好友申请已发送，请等待对方回应';
          break;
        case 'rejected':
          message = '对方已拒绝好友申请';
          break;
        case 'blocked':
          message = '无法添加该用户为好友';
          break;
      }
      return res.status(400).json({
        success: false,
        message,
      });
    }

    // 创建好友申请
    const friendRequest = new Friend({
      requester: requesterId,
      recipient: recipientId,
      requestMessage: message,
      status: 'pending',
    });

    await friendRequest.save();

    res.json({
      success: true,
      message: '好友申请已发送',
      data: friendRequest,
    });
  } catch (error) {
    console.error('发送好友申请失败:', error);
    res.status(500).json({
      success: false,
      message: '发送好友申请失败',
      error: error.message,
    });
  }
});

// 获取用户好友列表
router.get('/list/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, search: _search = '' } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: '用户ID不能为空',
      });
    }

    // 简化的好友查询
    const query = {
      $or: [
        { requester: userId, status: 'accepted' },
        { recipient: userId, status: 'accepted' },
      ],
    };

    const total = await Friend.countDocuments(query);
    const friends = await Friend.find(query)
      .populate('requester', 'nickname avatar status lastLoginAt')
      .populate('recipient', 'nickname avatar status lastLoginAt')
      .sort({ lastInteractionAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // 格式化好友数据
    const formattedFriends = friends.map(friend => {
      const isRequester = friend.requester._id.toString() === userId;
      const friendInfo = isRequester ? friend.recipient : friend.requester;
      const remarkName = isRequester ? friend.requesterRemark : friend.recipientRemark;

      return {
        _id: friend._id,
        friendInfo,
        remarkName,
        acceptedAt: friend.acceptedAt,
        lastInteractionAt: friend.lastInteractionAt,
        status: friend.status,
      };
    });

    res.json({
      success: true,
      data: {
        friends: formattedFriends,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('获取好友列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取好友列表失败',
      error: error.message,
    });
  }
});

// 获取好友申请列表
router.get('/requests/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { type = 'received' } = req.query;

    const query =
      type === 'received' ? { recipient: userId, status: 'pending' } : { requester: userId, status: 'pending' };

    const requests = await Friend.find(query)
      .populate(type === 'received' ? 'requester' : 'recipient', 'nickname avatar status lastLoginAt')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        requests,
        total: requests.length,
      },
    });
  } catch (error) {
    console.error('获取好友申请失败:', error);
    res.status(500).json({
      success: false,
      message: '获取好友申请失败',
      error: error.message,
    });
  }
});

// 处理好友申请（接受/拒绝）
router.put('/request/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action, userId } = req.body; // action: 'accept' | 'reject'

    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: '无效的操作类型',
      });
    }

    const friendRequest = await Friend.findById(requestId);
    if (!friendRequest) {
      return res.status(404).json({
        success: false,
        message: '好友申请不存在',
      });
    }

    // 验证权限：只有接收者可以处理申请
    if (friendRequest.recipient.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: '无权限处理此申请',
      });
    }

    if (friendRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: '该申请已被处理',
      });
    }

    // 更新申请状态
    friendRequest.status = action === 'accept' ? 'accepted' : 'rejected';
    if (action === 'accept') {
      friendRequest.acceptedAt = new Date();
    }

    await friendRequest.save();

    const message = action === 'accept' ? '已接受好友申请' : '已拒绝好友申请';

    res.json({
      success: true,
      message,
      data: friendRequest,
    });
  } catch (error) {
    console.error('处理好友申请失败:', error);
    res.status(500).json({
      success: false,
      message: '处理好友申请失败',
      error: error.message,
    });
  }
});

module.exports = router;
