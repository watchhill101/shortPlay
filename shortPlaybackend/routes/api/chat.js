const express = require('express');
const ChatMessage = require('../../models/ChatMessage/index');
const Friend = require('../../models/Friend/index');
const User = require('../../models/User/index');
const router = express.Router();

// 发送聊天消息
// POST /api/chat/send
router.post('/send', async (req, res) => {
  try {
    const { fromUserId, toUserId, content, messageType = 'text' } = req.body;

    if (!fromUserId || !toUserId || !content) {
      return res.status(400).json({
        success: false,
        message: '发送者、接收者和消息内容都是必需的'
      });
    }

    // 验证好友关系
    const friendship = await Friend.findOne({
      $or: [
        { requester: fromUserId, recipient: toUserId, status: 'accepted' },
        { requester: toUserId, recipient: fromUserId, status: 'accepted' }
      ]
    });

    if (!friendship) {
      return res.status(403).json({
        success: false,
        message: '您与该用户不是好友关系'
      });
    }

    // 保存消息到数据库
    const conversationId = ChatMessage.generateConversationId(fromUserId, toUserId);
    
    const chatMessage = new ChatMessage({
      fromUser: fromUserId,
      toUser: toUserId,
      content,
      messageType,
      conversationId,
      status: 'sent'
    });

    await chatMessage.save();

    // 更新好友关系的最后互动时间
    friendship.lastInteractionAt = new Date();
    await friendship.save();

    res.json({
      success: true,
      message: '消息发送成功',
      data: {
        messageId: chatMessage._id,
        timestamp: chatMessage.createdAt,
        conversationId
      }
    });

    console.log(`消息已保存到数据库: ${fromUserId} → ${toUserId} (${chatMessage._id})`);

  } catch (error) {
    console.error('发送消息失败:', error);
    res.status(500).json({
      success: false,
      message: '发送消息失败',
      error: error.message
    });
  }
});

// 获取与指定好友的聊天记录
// GET /api/chat/history/:friendId?page=1&limit=20
router.get('/history/:friendId', async (req, res) => {
  try {
    const { friendId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const currentUserId = req.user?.id || req.query.userId; // 从认证中间件或查询参数获取

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    // 验证好友关系
    const friendship = await Friend.findOne({
      $or: [
        { requester: currentUserId, recipient: friendId, status: 'accepted' },
        { requester: friendId, recipient: currentUserId, status: 'accepted' }
      ]
    });

    if (!friendship) {
      return res.status(403).json({
        success: false,
        message: '您与该用户不是好友关系'
      });
    }

    // 获取聊天记录
    const conversationId = ChatMessage.generateConversationId(currentUserId, friendId);
    console.log('查询聊天记录参数:', {
      currentUserId,
      friendId,
      conversationId,
      page: parseInt(page),
      limit: parseInt(limit)
    });
    
    const messages = await ChatMessage.getConversationMessages(
      currentUserId, 
      friendId, 
      { page: parseInt(page), limit: parseInt(limit) }
    );
    
    console.log(`查询到 ${messages.length} 条消息`);

    // 标记消息为已读
    await ChatMessage.markAsRead(currentUserId, friendId, currentUserId);

    res.json({
      success: true,
      data: {
        messages: messages.reverse(), // 按时间正序返回
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: messages.length === parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('获取聊天记录失败:', error);
    res.status(500).json({
      success: false,
      message: '获取聊天记录失败',
      error: error.message
    });
  }
});

// 获取所有聊天会话列表
// GET /api/chat/conversations
router.get('/conversations', async (req, res) => {
  try {
    const currentUserId = req.user?.id || req.query.userId;

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    // 获取用户的所有好友
    const friends = await Friend.find({
      $or: [
        { requester: currentUserId, status: 'accepted' },
        { recipient: currentUserId, status: 'accepted' }
      ]
    })
    .populate('requester', 'nickname avatar lastLoginAt')
    .populate('recipient', 'nickname avatar lastLoginAt')
    .sort({ lastInteractionAt: -1 });

    // 为每个好友获取最后一条消息
    const conversations = await Promise.all(
      friends.map(async (friend) => {
        const isRequester = friend.requester._id.toString() === currentUserId;
        const friendInfo = isRequester ? friend.recipient : friend.requester;
        const remarkName = isRequester ? friend.requesterRemark : friend.recipientRemark;

        // 获取最后一条消息
        const conversationId = ChatMessage.generateConversationId(currentUserId, friendInfo._id);
        const lastMessage = await ChatMessage.findOne({ conversationId })
          .sort({ createdAt: -1 })
          .populate('fromUser', 'nickname');

        // 获取未读消息数
        const unreadCount = await ChatMessage.countDocuments({
          conversationId,
          toUser: currentUserId,
          isRead: false
        });

        return {
          friendId: friendInfo._id,
          friendInfo: {
            id: friendInfo._id,
            nickname: remarkName || friendInfo.nickname,
            avatar: friendInfo.avatar,
            lastLoginAt: friendInfo.lastLoginAt
          },
          lastMessage: lastMessage ? {
            content: lastMessage.content,
            timestamp: lastMessage.createdAt,
            fromSelf: lastMessage.fromUser._id.toString() === currentUserId
          } : null,
          unreadCount,
          lastInteractionAt: friend.lastInteractionAt
        };
      })
    );

    res.json({
      success: true,
      data: {
        conversations: conversations.filter(conv => conv.lastMessage), // 只返回有消息的会话
        total: conversations.length
      }
    });

  } catch (error) {
    console.error('获取会话列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取会话列表失败',
      error: error.message
    });
  }
});

// 获取未读消息总数
// GET /api/chat/unread-count
router.get('/unread-count', async (req, res) => {
  try {
    const currentUserId = req.user?.id || req.query.userId;

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    const unreadCount = await ChatMessage.getUnreadCount(currentUserId);

    res.json({
      success: true,
      data: {
        unreadCount
      }
    });

  } catch (error) {
    console.error('获取未读消息数失败:', error);
    res.status(500).json({
      success: false,
      message: '获取未读消息数失败',
      error: error.message
    });
  }
});

// 删除聊天记录
// DELETE /api/chat/conversation/:friendId
router.delete('/conversation/:friendId', async (req, res) => {
  try {
    const { friendId } = req.params;
    const currentUserId = req.user?.id || req.body.userId;

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    // 验证好友关系
    const friendship = await Friend.findOne({
      $or: [
        { requester: currentUserId, recipient: friendId, status: 'accepted' },
        { requester: friendId, recipient: currentUserId, status: 'accepted' }
      ]
    });

    if (!friendship) {
      return res.status(403).json({
        success: false,
        message: '您与该用户不是好友关系'
      });
    }

    // 删除聊天记录
    const conversationId = ChatMessage.generateConversationId(currentUserId, friendId);
    console.log('删除聊天记录参数:', {
      currentUserId,
      friendId,
      conversationId,
      deleteQuery: { conversationId }
    });
    
    // 先查询要删除的消息数量
    const messageCount = await ChatMessage.countDocuments({ conversationId });
    console.log(`准备删除 ${messageCount} 条消息`);
    
    const result = await ChatMessage.deleteMany({ conversationId });
    console.log('删除结果:', result);

    res.json({
      success: true,
      message: '聊天记录已删除',
      data: {
        deletedCount: result.deletedCount
      }
    });

  } catch (error) {
    console.error('删除聊天记录失败:', error);
    res.status(500).json({
      success: false,
      message: '删除聊天记录失败',
      error: error.message
    });
  }
});

module.exports = router;
