// socket/index.js
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config');
const chatSessionService = require('../services/redis.service');
const axios = require('axios');

// SiliconFlow API 配置
const SILICONFLOW_API_URL = 'https://api.siliconflow.cn/v1/chat/completions';
const API_KEY = process.env.SILICONFLOW_API_KEY || 'sk-qnprobguoovvanqhdjahwendqrfeacremxubyynhcoonxxjx';

// Socket.IO 认证中间件
const socketAuthMiddleware = (socket, next) => {
  // 从 handshake 的 auth 对象中获取 token
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication error: Token not provided'));
  }

  jwt.verify(token, config.jwt.secret, (err, decoded) => {
    if (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
    socket.user = decoded.user; // 将解码后的用户信息附加到 socket 对象
    next();
  });
};

// 简化的认证中间件（用于开发环境）
const simpleAuthMiddleware = (socket, next) => {
  // 从查询参数获取用户ID（开发环境）
  const userId = socket.handshake.query.userId || socket.handshake.auth.userId;

  if (!userId) {
    return next(new Error('Authentication error: userId not provided'));
  }

  socket.user = { id: userId };
  next();
};

function initializeSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: config.cors.origin,
      methods: ['GET', 'POST'],
    },
  });

  // 根据环境选择认证中间件
  if (process.env.NODE_ENV === 'development') {
    io.use(simpleAuthMiddleware);
  } else {
    io.use(socketAuthMiddleware);
  }

  io.on('connection', socket => {
    console.log(`✅ Socket connected: ${socket.id}, UserID: ${socket.user.id}`);

    // 加入以用户ID命名的房间，方便私聊或定向推送
    socket.join(socket.user.id);

    // 创建AI聊天会话
    socket.on('createChatSession', async (data, callback) => {
      try {
        const { sessionData = {} } = data;
        const sessionId = await chatSessionService.createSession(socket.user.id, sessionData);

        callback({
          success: true,
          sessionId,
          message: '会话创建成功',
        });
      } catch (error) {
        console.error('Socket创建会话失败:', error);
        callback({
          success: false,
          error: '创建会话失败',
          message: error.message,
        });
      }
    });

    // 获取用户会话列表
    socket.on('getUserSessions', async (data, callback) => {
      try {
        const sessions = await chatSessionService.cleanExpiredSessions(socket.user.id);

        callback({
          success: true,
          sessions,
          total: sessions.length,
        });
      } catch (error) {
        console.error('Socket获取用户会话失败:', error);
        callback({
          success: false,
          error: '获取会话失败',
          message: error.message,
        });
      }
    });

    // 加载会话历史消息
    socket.on('loadSessionMessages', async (data, callback) => {
      try {
        const { sessionId, page = 1, pageSize = 20 } = data;

        const result = await chatSessionService.getSessionMessages(sessionId, parseInt(page), parseInt(pageSize));

        callback({
          success: true,
          ...result,
        });
      } catch (error) {
        console.error('Socket加载会话消息失败:', error);
        callback({
          success: false,
          error: '加载消息失败',
          message: error.message,
        });
      }
    });

    // AI聊天（带上下文记忆）
    socket.on('aiChatWithContext', async data => {
      try {
        const { sessionId, message, model = 'THUDM/GLM-4-9B-0414', contextSize = 10 } = data;

        if (!sessionId || !message) {
          socket.emit('aiChatError', {
            error: 'sessionId和message都是必需的',
          });
          return;
        }

        // 验证会话存在
        let session = await chatSessionService.getSession(sessionId);
        if (!session) {
          socket.emit('aiChatError', {
            error: '会话不存在',
          });
          return;
        }

        // 发送用户消息确认
        socket.emit('messageReceived', {
          type: 'user',
          content: message,
          timestamp: new Date().toISOString(),
        });

        // 添加用户消息到会话
        await chatSessionService.addMessage(sessionId, {
          type: 'user',
          content: message,
        });

        // 发送AI正在思考的状态
        socket.emit('aiThinking', {
          sessionId,
          status: 'thinking',
        });

        // 获取上下文消息
        const contextMessages = await chatSessionService.getContextMessages(sessionId, contextSize);

        // 添加系统提示
        const systemPrompt = {
          role: 'system',
          content: `你是一个专业的短视频应用客服助手，名叫"小助手"。你的任务是帮助用户解决关于短视频应用的各种问题。

请遵循以下原则：
1. 友好、专业、耐心地回答用户问题
2. 回答要简洁明了，避免过长的文字
3. 针对短视频应用相关问题提供具体的解决方案
4. 如果不确定答案，建议用户联系人工客服
5. 保持积极正面的语调
6. 记住之前的对话内容，提供连贯的服务

常见问题领域：
- 账户登录注册问题
- 支付充值相关
- 视频播放卡顿
- 会员服务咨询
- 技术故障报告
- 其他使用问题`,
        };

        const allMessages = [systemPrompt, ...contextMessages];

        // 调用AI API
        const response = await axios({
          method: 'POST',
          url: SILICONFLOW_API_URL,
          headers: {
            Authorization: `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
          },
          data: {
            model,
            messages: allMessages,
            stream: false,
            top_p: 0.7,
            max_tokens: 1000,
          },
          timeout: 30000,
        });

        // 提取AI回复
        let aiContent = response.data?.choices?.[0]?.message?.content || '';
        aiContent = aiContent.trim();

        if (!aiContent) {
          aiContent = '抱歉，我现在无法回答您的问题，请稍后再试。';
        }

        // 添加AI回复到会话
        const aiMessage = await chatSessionService.addMessage(sessionId, {
          type: 'ai',
          content: aiContent,
        });

        // 发送AI回复
        socket.emit('aiResponse', {
          success: true,
          content: aiContent,
          message: aiMessage,
          sessionId,
          model,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error('Socket AI聊天失败:', error);
        socket.emit('aiChatError', {
          error: 'AI聊天失败',
          message: error.message,
        });
      }
    });

    // 流式AI聊天（实时显示）
    socket.on('aiChatStream', async data => {
      try {
        const { sessionId, message, model = 'THUDM/GLM-4-9B-0414', contextSize = 10 } = data;

        if (!sessionId || !message) {
          socket.emit('aiChatError', {
            error: 'sessionId和message都是必需的',
          });
          return;
        }

        // 验证会话存在
        let session = await chatSessionService.getSession(sessionId);
        if (!session) {
          socket.emit('aiChatError', {
            error: '会话不存在',
          });
          return;
        }

        // 添加用户消息到会话
        await chatSessionService.addMessage(sessionId, {
          type: 'user',
          content: message,
        });

        // 获取上下文消息
        const contextMessages = await chatSessionService.getContextMessages(sessionId, contextSize);

        const systemPrompt = {
          role: 'system',
          content: `你是一个专业的短视频应用客服助手，名叫"小助手"。记住之前的对话内容，提供连贯的服务。`,
        };

        const allMessages = [systemPrompt, ...contextMessages];

        // 流式请求
        const response = await axios({
          method: 'POST',
          url: SILICONFLOW_API_URL,
          headers: {
            Authorization: `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
          },
          data: {
            model,
            messages: allMessages,
            stream: true,
            top_p: 0.7,
            max_tokens: 1000,
          },
          responseType: 'stream',
          timeout: 60000,
        });

        let buffer = '';
        let fullContent = '';
        const messageId = Date.now().toString();

        // 发送开始事件
        socket.emit('aiStreamStart', {
          messageId,
          sessionId,
        });

        // 处理流数据
        response.data.on('data', chunk => {
          try {
            buffer += chunk.toString();
            const lines = buffer.split('\n');

            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.trim() === '') continue;

              if (line.startsWith('data: ')) {
                const data = line.substring(6).trim();

                if (data === '[DONE]') {
                  // 流结束，保存完整消息
                  chatSessionService
                    .addMessage(sessionId, {
                      type: 'ai',
                      content: fullContent,
                    })
                    .then(() => {
                      socket.emit('aiStreamEnd', {
                        messageId,
                        sessionId,
                        fullContent,
                      });
                    });
                  return;
                }

                try {
                  const jsonData = JSON.parse(data);

                  if (
                    jsonData.choices &&
                    jsonData.choices[0] &&
                    jsonData.choices[0].delta &&
                    jsonData.choices[0].delta.content
                  ) {
                    const content = jsonData.choices[0].delta.content;
                    fullContent += content;

                    // 发送流式内容
                    socket.emit('aiStreamChunk', {
                      content,
                      messageId,
                      sessionId,
                      timestamp: Date.now(),
                    });
                  }
                } catch (parseError) {
                  console.error('解析流数据失败:', parseError);
                }
              }
            }
          } catch (error) {
            console.error('处理流数据失败:', error);
          }
        });

        response.data.on('error', error => {
          console.error('流式AI响应错误:', error);
          socket.emit('aiChatError', {
            error: '流处理错误',
            message: error.message,
          });
        });
      } catch (error) {
        console.error('流式AI聊天失败:', error);
        socket.emit('aiChatError', {
          error: '流式聊天失败',
          message: error.message,
        });
      }
    });

    // 好友聊天消息发送
    socket.on('sendFriendMessage', async data => {
      try {
        const { friendId, message, messageType = 'text' } = data;

        if (!friendId || !message) {
          socket.emit('friendChatError', {
            error: '好友ID和消息内容都是必需的',
          });
          return;
        }

        // 验证好友关系
        const Friend = require('../models/Friend/index');
        const friendship = await Friend.findOne({
          $or: [
            { requester: socket.user.id, recipient: friendId, status: 'accepted' },
            { requester: friendId, recipient: socket.user.id, status: 'accepted' },
          ],
        });

        if (!friendship) {
          socket.emit('friendChatError', {
            error: '您与该用户不是好友关系',
          });
          return;
        }

        // 获取发送者信息
        const User = require('../models/User/index');
        const sender = await User.findById(socket.user.id).select('nickname avatar');

        // 保存消息到数据库
        const ChatMessage = require('../models/ChatMessage/index');
        const conversationId = ChatMessage.generateConversationId(socket.user.id, friendId);

        const chatMessage = new ChatMessage({
          fromUser: socket.user.id,
          toUser: friendId,
          content: message,
          messageType,
          conversationId,
          status: 'sent',
        });

        await chatMessage.save();

        const messageData = {
          id: chatMessage._id.toString(),
          fromUserId: socket.user.id,
          toUserId: friendId,
          content: message,
          messageType,
          timestamp: chatMessage.createdAt.toISOString(),
          sender: {
            id: socket.user.id,
            nickname: sender.nickname,
            avatar: sender.avatar,
          },
        };

        // 发送消息给接收者（如果在线）
        io.to(friendId).emit('receiveFriendMessage', messageData);

        // 确认消息发送成功给发送者
        socket.emit('friendMessageSent', {
          success: true,
          message: messageData,
        });

        // 更新好友关系的最后互动时间
        friendship.lastInteractionAt = new Date();
        await friendship.save();

        console.log(`好友消息已保存: ${sender.nickname} → ${friendId} (${chatMessage._id})`);
      } catch (error) {
        console.error('发送好友消息失败:', error);
        socket.emit('friendChatError', {
          error: '发送消息失败',
          message: error.message,
        });
      }
    });

    // 加入好友聊天房间
    socket.on('joinFriendChat', async data => {
      try {
        const { friendId } = data;

        // 验证好友关系
        const Friend = require('../models/Friend/index');
        const friendship = await Friend.findOne({
          $or: [
            { requester: socket.user.id, recipient: friendId, status: 'accepted' },
            { requester: friendId, recipient: socket.user.id, status: 'accepted' },
          ],
        });

        if (!friendship) {
          socket.emit('friendChatError', {
            error: '您与该用户不是好友关系',
          });
          return;
        }

        // 创建聊天房间ID（确保两个用户使用同一个房间）
        const roomId = [socket.user.id, friendId].sort().join('_');
        socket.join(roomId);

        socket.emit('joinedFriendChat', {
          success: true,
          roomId,
          friendId,
        });

        console.log(`用户 ${socket.user.id} 加入好友聊天房间: ${roomId}`);
      } catch (error) {
        console.error('加入好友聊天失败:', error);
        socket.emit('friendChatError', {
          error: '加入聊天失败',
          message: error.message,
        });
      }
    });

    // 离开好友聊天房间
    socket.on('leaveFriendChat', data => {
      const { friendId } = data;
      const roomId = [socket.user.id, friendId].sort().join('_');
      socket.leave(roomId);

      console.log(`用户 ${socket.user.id} 离开好友聊天房间: ${roomId}`);
    });

    // 加载好友聊天历史消息
    socket.on('loadFriendChatHistory', async (data, callback) => {
      try {
        const { friendId, page = 1, limit = 20 } = data;

        // 验证好友关系
        const Friend = require('../models/Friend/index');
        const friendship = await Friend.findOne({
          $or: [
            { requester: socket.user.id, recipient: friendId, status: 'accepted' },
            { requester: friendId, recipient: socket.user.id, status: 'accepted' },
          ],
        });

        if (!friendship) {
          return callback({
            success: false,
            error: '您与该用户不是好友关系',
          });
        }

        // 获取聊天历史
        const ChatMessage = require('../models/ChatMessage/index');
        const messages = await ChatMessage.getConversationMessages(socket.user.id, friendId, { page, limit });

        // 标记消息为已读
        await ChatMessage.markAsRead(socket.user.id, friendId, socket.user.id);

        // 格式化消息数据
        const formattedMessages = messages.reverse().map(msg => ({
          id: msg._id.toString(),
          fromUserId: msg.fromUser._id.toString(),
          toUserId: msg.toUser._id.toString(),
          content: msg.content,
          messageType: msg.messageType,
          timestamp: msg.createdAt.toISOString(),
          isRead: msg.isRead,
          status: msg.status,
          sender: {
            id: msg.fromUser._id.toString(),
            nickname: msg.fromUser.nickname,
            avatar: msg.fromUser.avatar,
          },
        }));

        callback({
          success: true,
          messages: formattedMessages,
          pagination: {
            page,
            limit,
            hasMore: messages.length === limit,
          },
        });

        console.log(`加载聊天历史: ${socket.user.id} ↔ ${friendId}, ${messages.length} 条消息`);
      } catch (error) {
        console.error('加载聊天历史失败:', error);
        callback({
          success: false,
          error: '加载聊天历史失败',
          message: error.message,
        });
      }
    });

    // 原有的消息发送功能（保留兼容性）
    socket.on('sendMessage', data => {
      // 示例：向另一个用户发送消息
      // data = { to: 'otherUserId', message: 'Hello!' }
      io.to(data.to).emit('receiveMessage', {
        from: socket.user.id,
        message: data.message,
      });
    });

    socket.on('disconnect', () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

module.exports = initializeSocket;
