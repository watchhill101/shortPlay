const WebSocket = require('ws');
const url = require('url');
const jwt = require('jsonwebtoken');
const config = require('../config');
const ChatMessage = require('../models/ChatMessage/index');
const Friend = require('../models/Friend/index');
const User = require('../models/User/index');
const { _error } = require('console');

// 存储在线用户
const onlineUsers = new Map();

// 创建WebSocket服务器
function createWebSocketServer(server) {
  const wss = new WebSocket.Server({
    server,
    path: '/ws',
  });

  wss.on('connection', async (ws, req) => {
    try {
      // 解析URL参数获取用户信息
      const query = url.parse(req.url, true).query;
      const { userId, token } = query;

      if (!userId || !token) {
        ws.close(1008, 'Missing userId or token');
        return;
      }

      // 验证token（简化版）
      let user;
      try {
        const _decoded = jwt.verify(token, config.jwt.secret);
        user = await User.findById(userId);
        if (!user) {
          ws.close(1008, 'User not found');
          return;
        }
      } catch (_error) {
        ws.close(1008, 'Invalid token');
        return _error;
      }

      // 存储用户连接
      ws.userId = userId;
      ws.userInfo = user;
      onlineUsers.set(userId, ws);

      console.log(`✅ 用户连接: ${user.nickname} (${userId})`);

      // 发送连接成功消息
      ws.send(
        JSON.stringify({
          type: 'connected',
          message: '连接成功',
          userId: userId,
        })
      );

      // 处理消息
      ws.on('message', async data => {
        try {
          const message = JSON.parse(data.toString());
          await handleWebSocketMessage(ws, message);
        } catch (error) {
          console.error('处理WebSocket消息失败:', error);
          ws.send(
            JSON.stringify({
              type: 'error',
              message: '消息格式错误',
            })
          );
        }
      });

      // 连接关闭
      ws.on('close', () => {
        onlineUsers.delete(userId);
        console.log(`❌ 用户断开: ${user.nickname} (${userId})`);
      });

      // 连接错误
      ws.on('error', _error => {
        console.error('WebSocket错误:', _error);
        onlineUsers.delete(userId);
      });
    } catch (error) {
      console.error('WebSocket连接处理失败:', error);
      ws.close(1011, 'Server error');
    }
  });

  return wss;
}

// 处理WebSocket消息
async function handleWebSocketMessage(ws, message) {
  const { type, data } = message;

  switch (type) {
    case 'sendFriendMessage':
      await handleSendFriendMessage(ws, data);
      break;
    case 'joinFriendChat':
      await handleJoinFriendChat(ws, data);
      break;
    case 'leaveFriendChat':
      await handleLeaveFriendChat(ws, data);
      break;
    case 'ping':
      // 心跳检测
      ws.send(JSON.stringify({ type: 'pong' }));
      break;
    default:
      console.log('未知消息类型:', type);
  }
}

// 处理发送好友消息
async function handleSendFriendMessage(ws, data) {
  try {
    const { friendId, message, messageType = 'text' } = data;
    const fromUserId = ws.userId;

    // 验证好友关系
    const friendship = await Friend.findOne({
      $or: [
        { requester: fromUserId, recipient: friendId, status: 'accepted' },
        { requester: friendId, recipient: fromUserId, status: 'accepted' },
      ],
    });

    if (!friendship) {
      ws.send(
        JSON.stringify({
          type: 'error',
          message: '您与该用户不是好友关系',
        })
      );
      return;
    }

    // 保存消息到数据库
    const conversationId = ChatMessage.generateConversationId(fromUserId, friendId);

    const chatMessage = new ChatMessage({
      fromUser: fromUserId,
      toUser: friendId,
      content: message,
      messageType,
      conversationId,
      status: 'sent',
    });

    await chatMessage.save();

    const messageData = {
      id: chatMessage._id.toString(),
      fromUserId: fromUserId,
      toUserId: friendId,
      content: message,
      messageType,
      timestamp: chatMessage.createdAt.toISOString(),
      sender: {
        id: fromUserId,
        nickname: ws.userInfo.nickname,
        avatar: ws.userInfo.avatar,
      },
    };

    // 发送给接收者（如果在线）
    const targetWs = onlineUsers.get(friendId);
    if (targetWs && targetWs.readyState === WebSocket.OPEN) {
      targetWs.send(
        JSON.stringify({
          type: 'receiveFriendMessage',
          data: messageData,
        })
      );
      console.log(`消息已推送给在线用户: ${friendId}`);
    }

    // 确认发送成功
    ws.send(
      JSON.stringify({
        type: 'friendMessageSent',
        data: {
          success: true,
          message: messageData,
        },
      })
    );

    // 更新好友关系的最后互动时间
    friendship.lastInteractionAt = new Date();
    await friendship.save();

    console.log(`消息已保存: ${ws.userInfo.nickname} → ${friendId} (${chatMessage._id})`);
  } catch (error) {
    console.error('发送好友消息失败:', error);
    ws.send(
      JSON.stringify({
        type: 'error',
        message: '发送消息失败: ' + error.message,
      })
    );
  }
}

// 处理加入好友聊天
async function handleJoinFriendChat(ws, data) {
  const { friendId } = data;
  console.log(`用户 ${ws.userId} 加入与 ${friendId} 的聊天`);

  ws.send(
    JSON.stringify({
      type: 'joinedFriendChat',
      data: {
        success: true,
        friendId: friendId,
      },
    })
  );
}

// 处理离开好友聊天
async function handleLeaveFriendChat(ws, data) {
  const { friendId } = data;
  console.log(`用户 ${ws.userId} 离开与 ${friendId} 的聊天`);
}

// 获取在线用户列表
function getOnlineUsers() {
  return Array.from(onlineUsers.keys());
}

// 广播消息给所有在线用户
function broadcastToAll(message) {
  onlineUsers.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  });
}

module.exports = {
  createWebSocketServer,
  getOnlineUsers,
  broadcastToAll,
};
