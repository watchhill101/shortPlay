const Friend = require('./index');
const User = require('../User/index');

class FriendAPI {
  // 获取用户好友列表
  static async getFriendList(req, res) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 20, search = '' } = req.query;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: '用户ID不能为空',
        });
      }

      const friends = await Friend.getUserFriends(userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        search,
      });

      // 获取总数
      const totalQuery = {
        $or: [
          { requester: userId, status: 'accepted' },
          { recipient: userId, status: 'accepted' },
        ],
      };

      const total = await Friend.countDocuments(totalQuery);

      res.json({
        success: true,
        data: {
          friends,
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
  }

  // 搜索用户（用于添加好友）
  static async searchUsers(req, res) {
    try {
      const { keyword, currentUserId } = req.query;
      const { page = 1, limit = 20 } = req.query;

      if (!keyword || keyword.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: '搜索关键词至少2个字符',
        });
      }

      const skip = (page - 1) * limit;

      // 搜索用户（排除自己）
      const searchQuery = {
        _id: { $ne: currentUserId },
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
          const relation = await Friend.findRelationship(currentUserId, user._id);
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
  }

  // 发送好友申请
  static async sendFriendRequest(req, res) {
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
      const existingRelation = await Friend.findRelationship(requesterId, recipientId);
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
  }

  // 处理好友申请（接受/拒绝）
  static async handleFriendRequest(req, res) {
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
  }

  // 获取好友申请列表
  static async getFriendRequests(req, res) {
    try {
      const { userId } = req.params;
      const { type = 'received' } = req.query; // 'received' | 'sent'

      const requests = await Friend.getFriendRequests(userId, type);

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
  }

  // 删除好友
  static async deleteFriend(req, res) {
    try {
      const { friendId } = req.params;
      const { userId } = req.body;

      const friendship = await Friend.findById(friendId);
      if (!friendship) {
        return res.status(404).json({
          success: false,
          message: '好友关系不存在',
        });
      }

      // 验证权限：只有关系中的用户可以删除
      if (friendship.requester.toString() !== userId && friendship.recipient.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: '无权限删除此好友关系',
        });
      }

      await Friend.findByIdAndDelete(friendId);

      res.json({
        success: true,
        message: '已删除好友',
      });
    } catch (error) {
      console.error('删除好友失败:', error);
      res.status(500).json({
        success: false,
        message: '删除好友失败',
        error: error.message,
      });
    }
  }

  // 设置好友备注
  static async setFriendRemark(req, res) {
    try {
      const { friendId } = req.params;
      const { userId, remark } = req.body;

      const friendship = await Friend.findById(friendId);
      if (!friendship) {
        return res.status(404).json({
          success: false,
          message: '好友关系不存在',
        });
      }

      // 验证权限
      if (friendship.requester.toString() !== userId && friendship.recipient.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: '无权限修改备注',
        });
      }

      // 设置备注
      if (friendship.requester.toString() === userId) {
        friendship.requesterRemark = remark;
      } else {
        friendship.recipientRemark = remark;
      }

      await friendship.save();

      res.json({
        success: true,
        message: '备注设置成功',
        data: friendship,
      });
    } catch (error) {
      console.error('设置好友备注失败:', error);
      res.status(500).json({
        success: false,
        message: '设置好友备注失败',
        error: error.message,
      });
    }
  }
}

module.exports = FriendAPI;
