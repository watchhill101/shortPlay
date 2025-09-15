// socket服务工具类 - 用于实时消息通信
import io from 'socket.io-client';
import tokenManager from './tokenManager';
import { getApiConfig } from '@/config/index.js';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.listeners = new Map();
    this.messageQueue = [];
    this.apiConfig = getApiConfig();
  }

  // 连接Socket.IO
  connect() {
    if (this.socket && this.isConnected) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        const socketUrl = this.apiConfig.baseURL.replace('/api', '');
        console.log('🔗 连接Socket.IO:', socketUrl);

        // 带上 userId 以兼容开发环境的简单鉴权（server 需要 userId）
        const currentUser = tokenManager.getUserInfo() || {};
        const userId = currentUser.id || currentUser._id || undefined;

        this.socket = io(socketUrl, {
          transports: ['websocket'], // 强制使用 WebSocket，绕过 HTTP 轮询
          path: '/socket.io',
          auth: {
            token: tokenManager.getAccessToken(),
            userId,
          },
          query: userId ? { userId } : {},
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: 1000,
          timeout: 20000,
        });

        // 连接成功
        this.socket.on('connect', () => {
          console.log('✅ Socket.IO连接成功');
          this.isConnected = true;
          this.reconnectAttempts = 0;

          // 发送队列中的消息
          this.flushMessageQueue();

          // 通知业务侧：已连接（用于重入房间等）
          this.emit('connected', { socketId: this.socket.id });

          resolve();
        });

        // 连接错误
        this.socket.on('connect_error', error => {
          console.error('❌ Socket连接失败:', error.message);
          this.isConnected = false;

          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`⏳ 尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          } else {
            reject(new Error('Socket连接失败: ' + error.message));
          }
        });

        // 断开连接
        this.socket.on('disconnect', reason => {
          console.log('🔌 Socket连接断开:', reason);
          this.isConnected = false;

          // 通知业务侧：已断开
          this.emit('disconnected', { reason });

          if (reason === 'io server disconnect') {
            // 服务器主动断开，需要重连
            this.socket.connect();
          }
        });

        // 好友消息接收
        this.socket.on('receiveFriendMessage', data => {
          this.emit('receiveFriendMessage', data);
        });

        // 消息发送确认
        this.socket.on('friendMessageSent', data => {
          this.emit('friendMessageSent', data);
        });

        // 错误处理
        this.socket.on('friendChatError', error => {
          console.error('好友聊天错误:', error);
          this.emit('friendChatError', error);
        });
      } catch (error) {
        console.error('Socket初始化失败:', error);
        reject(error);
      }
    });
  }

  // 断开连接
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.listeners.clear();
      console.log('🔌 Socket.IO已断开');
    }
  }

  // 发送好友消息
  sendFriendMessage(friendId, message, messageType = 'text') {
    const messageData = {
      friendId,
      message,
      messageType,
    };

    if (this.isConnected && this.socket) {
      this.socket.emit('sendFriendMessage', messageData);
    } else {
      // 连接未建立时，加入队列
      this.messageQueue.push({
        event: 'sendFriendMessage',
        data: messageData,
      });

      // 尝试重新连接
      this.connect().catch(console.error);
    }
  }

  // 加入好友聊天房间
  joinFriendChat(friendId) {
    if (this.isConnected && this.socket) {
      this.socket.emit('joinFriendChat', { friendId });
    }
  }

  // 离开好友聊天房间
  leaveFriendChat(friendId) {
    if (this.isConnected && this.socket) {
      this.socket.emit('leaveFriendChat', { friendId });
    }
  }

  // 发送队列中的消息
  flushMessageQueue() {
    if (!this.isConnected || !this.socket) return;

    while (this.messageQueue.length > 0) {
      const { event, data } = this.messageQueue.shift();
      this.socket.emit(event, data);
    }
  }

  // 添加事件监听器
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  // 移除事件监听器
  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  // 触发事件
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('事件处理器执行失败:', error);
        }
      });
    }
  }

  // 获取连接状态
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      socketId: this.socket?.id || null,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  // 清理资源
  cleanup() {
    this.disconnect();
    this.messageQueue = [];
    this.listeners.clear();
  }
}

// 导出单例
const socketService = new SocketService();
export default socketService;
