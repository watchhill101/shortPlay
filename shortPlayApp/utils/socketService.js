// 简化的聊天服务
class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.listeners = new Map();
  }

  // 连接WebSocket服务器
  connect(userId, token) {
    return new Promise((resolve, reject) => {
      try {
        const socketTask = uni.connectSocket({
          url: `ws://localhost:3000/ws?userId=${userId}&token=${token}`,
          success: () => {},
          fail: error => {
            reject(error);
          },
        });

        socketTask.onOpen(_res => {
          this.connected = true;
          this.socket = socketTask;
          resolve(true);
        });

        socketTask.onMessage(res => {
          try {
            const data = JSON.parse(res.data);
            this.handleMessage(data);
          } catch (_error) {}
        });

        socketTask.onError(error => {
          this.connected = false;
          reject(error);
        });

        socketTask.onClose(() => {
          this.connected = false;
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // 发送消息
  emit(event, data) {
    if (this.socket && this.connected) {
      this.socket.send({
        data: JSON.stringify({
          type: event,
          data: data,
        }),
      });
      return true;
    }
    return false;
  }

  // 监听事件
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  // 移除监听
  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // 处理接收到的消息
  handleMessage(data) {
    const event = data.type;
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (_error) {}
      });
    }
  }

  // 重连
  reconnect(userId, token) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;

      setTimeout(() => {
        this.connect(userId, token);
      }, 2000 * this.reconnectAttempts);
    } else {
    }
  }

  // 断开连接
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.connected = false;
    this.listeners.clear();
  }

  // 加入好友聊天房间
  joinFriendChat(friendId) {
    return this.emit('joinFriendChat', { friendId });
  }

  // 离开好友聊天房间
  leaveFriendChat(friendId) {
    return this.emit('leaveFriendChat', { friendId });
  }

  // 发送好友消息
  sendFriendMessage(friendId, message, messageType = 'text') {
    return this.emit('sendFriendMessage', {
      friendId,
      message,
      messageType,
    });
  }

  // 获取连接状态
  isConnected() {
    return this.connected;
  }
}

export default new SocketService();
