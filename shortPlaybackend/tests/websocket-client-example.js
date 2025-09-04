// tests/websocket-client-example.js
const io = require('socket.io-client');

/**
 * WebSocket客户端测试示例
 */
class WebSocketChatClient {
  constructor(serverUrl = 'http://localhost:3000', userId = 'test_user') {
    this.serverUrl = serverUrl;
    this.userId = userId;
    this.socket = null;
    this.sessionId = null;
    this.connected = false;
    this.messageQueue = [];
  }

  /**
   * 连接到服务器
   */
  async connect() {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(this.serverUrl, {
          auth: { userId: this.userId },
          transports: ['websocket']
        });

        this.socket.on('connect', () => {
          this.connected = true;
          console.log(`✅ WebSocket连接成功: ${this.socket.id}`);
          this.setupEventListeners();
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('❌ WebSocket连接失败:', error.message);
          reject(error);
        });

        this.socket.on('disconnect', (reason) => {
          this.connected = false;
          console.log(`🔌 WebSocket连接断开: ${reason}`);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // AI回复事件
    this.socket.on('aiResponse', (data) => {
      console.log('🤖 AI回复:', data.content);
      console.log('   会话ID:', data.sessionId);
      console.log('   时间戳:', new Date(data.timestamp).toLocaleString());
    });

    // 流式回复开始
    this.socket.on('aiStreamStart', (data) => {
      console.log('📡 流式回复开始:', data.messageId);
      process.stdout.write('🤖 AI: ');
    });

    // 流式回复片段
    this.socket.on('aiStreamChunk', (data) => {
      process.stdout.write(data.content);
    });

    // 流式回复结束
    this.socket.on('aiStreamEnd', (data) => {
      console.log('\n✅ 流式回复完成');
      console.log('   完整内容长度:', data.fullContent.length);
    });

    // AI思考状态
    this.socket.on('aiThinking', (data) => {
      console.log('🤔 AI正在思考...');
    });

    // 消息接收确认
    this.socket.on('messageReceived', (data) => {
      console.log('📨 消息已接收:', data.content);
    });

    // 错误处理
    this.socket.on('aiChatError', (error) => {
      console.error('❌ AI聊天错误:', error.error);
      console.error('   详细信息:', error.message);
    });
  }

  /**
   * 创建聊天会话
   */
  async createSession() {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('WebSocket未连接'));
        return;
      }

      this.socket.emit('createChatSession', {
        sessionData: {
          title: 'WebSocket测试会话',
          platform: 'websocket'
        }
      }, (response) => {
        if (response.success) {
          this.sessionId = response.sessionId;
          console.log('✅ 会话创建成功:', this.sessionId);
          resolve(this.sessionId);
        } else {
          console.error('❌ 会话创建失败:', response.error);
          reject(new Error(response.error));
        }
      });
    });
  }

  /**
   * 发送聊天消息
   */
  sendMessage(message) {
    if (!this.connected || !this.sessionId) {
      console.error('❌ 无法发送消息：WebSocket未连接或会话不存在');
      return;
    }

    console.log('📤 发送消息:', message);
    
    this.socket.emit('aiChatWithContext', {
      sessionId: this.sessionId,
      message: message,
      model: 'THUDM/GLM-4-9B-0414',
      contextSize: 10
    });
  }

  /**
   * 发送流式聊天消息
   */
  sendStreamMessage(message) {
    if (!this.connected || !this.sessionId) {
      console.error('❌ 无法发送流式消息：WebSocket未连接或会话不存在');
      return;
    }

    console.log('📡 发送流式消息:', message);
    
    this.socket.emit('aiChatStream', {
      sessionId: this.sessionId,
      message: message,
      model: 'THUDM/GLM-4-9B-0414',
      contextSize: 10
    });
  }

  /**
   * 加载历史消息
   */
  async loadHistory(page = 1, pageSize = 20) {
    return new Promise((resolve, reject) => {
      if (!this.connected || !this.sessionId) {
        reject(new Error('WebSocket未连接或会话不存在'));
        return;
      }

      this.socket.emit('loadSessionMessages', {
        sessionId: this.sessionId,
        page,
        pageSize
      }, (response) => {
        if (response.success) {
          console.log(`📜 加载历史消息成功: ${response.messages.length}条`);
          resolve(response);
        } else {
          console.error('❌ 加载历史消息失败:', response.error);
          reject(new Error(response.error));
        }
      });
    });
  }

  /**
   * 获取用户所有会话
   */
  async getUserSessions() {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('WebSocket未连接'));
        return;
      }

      this.socket.emit('getUserSessions', {}, (response) => {
        if (response.success) {
          console.log(`📋 获取用户会话成功: ${response.total}个会话`);
          resolve(response.sessions);
        } else {
          console.error('❌ 获取用户会话失败:', response.error);
          reject(new Error(response.error));
        }
      });
    });
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.connected = false;
      console.log('👋 WebSocket连接已断开');
    }
  }
}

/**
 * 交互式聊天示例
 */
async function interactiveChatExample() {
  const client = new WebSocketChatClient('http://localhost:3000', 'interactive_user');
  
  try {
    console.log('🚀 启动交互式聊天示例');
    
    // 连接到服务器
    await client.connect();
    
    // 创建会话
    await client.createSession();
    
    // 模拟对话
    const messages = [
      '你好，我是新用户',
      '我想了解一下会员服务',
      '刚才我问的问题，你还记得吗？',
      '视频播放有点卡顿怎么办',
      '谢谢你的帮助'
    ];
    
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      
      // 等待用户输入间隔
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (i % 2 === 0) {
        // 普通消息
        client.sendMessage(message);
      } else {
        // 流式消息
        client.sendStreamMessage(message);
      }
      
      // 等待AI回复
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // 加载历史消息
    await client.loadHistory();
    
    // 获取用户会话列表
    await client.getUserSessions();
    
    // 等待一段时间后断开
    setTimeout(() => {
      client.disconnect();
      console.log('🎉 交互式聊天示例结束');
    }, 3000);
    
  } catch (error) {
    console.error('❌ 交互式聊天失败:', error);
    client.disconnect();
  }
}

/**
 * 并发连接测试
 */
async function concurrentConnectionTest(connectionCount = 5) {
  console.log(`🔗 并发连接测试: ${connectionCount}个连接`);
  
  const clients = [];
  const promises = [];
  
  for (let i = 0; i < connectionCount; i++) {
    const client = new WebSocketChatClient('http://localhost:3000', `concurrent_user_${i}`);
    clients.push(client);
    
    const promise = (async () => {
      try {
        await client.connect();
        await client.createSession();
        
        // 每个客户端发送几条消息
        for (let j = 0; j < 3; j++) {
          client.sendMessage(`来自用户${i}的第${j + 1}条消息`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        return { success: true, userId: client.userId };
      } catch (error) {
        return { success: false, userId: client.userId, error: error.message };
      }
    })();
    
    promises.push(promise);
  }
  
  const results = await Promise.allSettled(promises);
  const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  
  console.log(`✅ 并发连接测试完成: ${successful}/${connectionCount} 连接成功`);
  
  // 清理连接
  clients.forEach(client => client.disconnect());
  
  return results;
}

/**
 * WebSocket压力测试
 */
async function websocketStressTest() {
  console.log('⚡ WebSocket压力测试');
  console.log('=' .repeat(40));
  
  try {
    // 1. 交互式聊天测试
    console.log('\n1️⃣  交互式聊天测试');
    await interactiveChatExample();
    
    // 等待一段时间
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 2. 并发连接测试
    console.log('\n2️⃣  并发连接测试');
    await concurrentConnectionTest(5);
    
    console.log('\n✅ WebSocket压力测试完成');
    
  } catch (error) {
    console.error('❌ WebSocket压力测试失败:', error);
  }
}

module.exports = {
  WebSocketChatClient,
  interactiveChatExample,
  concurrentConnectionTest,
  websocketStressTest
};

// 如果直接运行此文件，执行压力测试
if (require.main === module) {
  websocketStressTest().then(() => {
    console.log('🎉 测试完成');
    process.exit(0);
  }).catch(error => {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  });
} 