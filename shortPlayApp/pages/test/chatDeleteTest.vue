<template>
  <view class="container">
    <view class="header">
      <text class="title">聊天删除测试</text>
    </view>
    
    <view class="test-section">
      <view class="section-title">测试参数</view>
      <view class="input-group">
        <text>当前用户ID:</text>
        <input v-model="currentUserId" placeholder="输入当前用户ID" />
      </view>
      <view class="input-group">
        <text>好友ID:</text>
        <input v-model="friendId" placeholder="输入好友ID" />
      </view>
    </view>
    
    <view class="test-section">
      <view class="section-title">操作按钮</view>
      <button @click="testLoadMessages" class="test-btn">1. 加载聊天记录</button>
      <button @click="testDeleteMessages" class="test-btn delete-btn">2. 删除聊天记录</button>
      <button @click="testLoadAfterDelete" class="test-btn">3. 删除后重新加载</button>
      <button @click="clearLocalStorage" class="test-btn clear-btn">4. 清空本地存储</button>
    </view>
    
    <view class="test-section">
      <view class="section-title">测试结果</view>
      <view class="result-box">
        <text class="result-text">{{ testResult }}</text>
      </view>
    </view>
    
    <view class="test-section">
      <view class="section-title">消息列表 ({{ messageList.length }}条)</view>
      <scroll-view class="message-list" scroll-y>
        <view v-for="(msg, index) in messageList" :key="index" class="message-item">
          <text class="message-content">{{ msg.content }}</text>
          <text class="message-info">发送者: {{ msg.fromUserId }} | 时间: {{ formatTime(msg.timestamp) }}</text>
        </view>
        <view v-if="messageList.length === 0" class="no-messages">
          <text>暂无消息</text>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script>
import authService from '@/utils/authService.js';

export default {
  data() {
    return {
      currentUserId: '',
      friendId: '',
      messageList: [],
      testResult: '等待测试...'
    };
  },
  
  onLoad() {
    // 尝试从存储获取用户信息
    try {
      const userInfo = uni.getStorageSync('userInfo');
      if (userInfo && userInfo.id) {
        this.currentUserId = userInfo.id;
      }
    } catch (e) {
      console.error('获取用户信息失败:', e);
    }
  },
  
  methods: {
    async testLoadMessages() {
      if (!this.currentUserId || !this.friendId) {
        this.testResult = '请先输入用户ID和好友ID';
        return;
      }
      
      try {
        this.testResult = '正在加载聊天记录...';
        
        const response = await uni.request({
          url: `http://localhost:3000/api/chat/history/${this.friendId}`,
          method: 'GET',
          data: {
            userId: this.currentUserId,
            page: 1,
            limit: 50
          },
          header: {
            'Authorization': `Bearer ${authService.getToken()}`
          }
        });
        
        console.log('加载聊天记录响应:', response);
        
        if (response.data && response.data.success) {
          this.messageList = response.data.data.messages.map(msg => ({
            id: msg._id,
            content: msg.content,
            fromUserId: msg.fromUser?._id || msg.fromUser,
            toUserId: msg.toUser?._id || msg.toUser,
            timestamp: msg.createdAt
          }));
          
          this.testResult = `成功加载 ${this.messageList.length} 条聊天记录`;
        } else {
          this.messageList = [];
          this.testResult = `加载失败: ${response.data?.message || '未知错误'}`;
        }
      } catch (error) {
        console.error('加载聊天记录失败:', error);
        this.testResult = `加载失败: ${error.message}`;
      }
    },
    
    async testDeleteMessages() {
      if (!this.currentUserId || !this.friendId) {
        this.testResult = '请先输入用户ID和好友ID';
        return;
      }
      
      try {
        this.testResult = '正在删除聊天记录...';
        
        const response = await uni.request({
          url: `http://localhost:3000/api/chat/conversation/${this.friendId}`,
          method: 'DELETE',
          data: {
            userId: this.currentUserId
          },
          header: {
            'Authorization': `Bearer ${authService.getToken()}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('删除聊天记录响应:', response);
        
        if (response.data && response.data.success) {
          this.testResult = `删除成功: 删除了 ${response.data.data.deletedCount} 条记录`;
        } else {
          this.testResult = `删除失败: ${response.data?.message || '未知错误'}`;
        }
      } catch (error) {
        console.error('删除聊天记录失败:', error);
        this.testResult = `删除失败: ${error.message}`;
      }
    },
    
    async testLoadAfterDelete() {
      this.testResult = '删除后重新加载中...';
      await this.testLoadMessages();
      this.testResult += ' (删除后重新加载完成)';
    },
    
    clearLocalStorage() {
      try {
        const conversationId = [this.currentUserId, this.friendId].sort().join('_');
        const oldConversationId = `${this.currentUserId}_${this.friendId}`;
        
        // 清空各种可能的存储键
        uni.removeStorageSync(`chat_${conversationId}`);
        uni.removeStorageSync(`messages_${conversationId}`);
        uni.removeStorageSync(`conversation_${conversationId}`);
        uni.removeStorageSync(`chat_${oldConversationId}`);
        uni.removeStorageSync(`messages_${oldConversationId}`);
        uni.removeStorageSync(`conversation_${oldConversationId}`);
        
        // 清空通用消息存储
        const chatMessages = uni.getStorageSync('chatMessages') || {};
        delete chatMessages[conversationId];
        delete chatMessages[oldConversationId];
        uni.setStorageSync('chatMessages', chatMessages);
        
        // 清空对话列表
        const conversations = uni.getStorageSync('conversations') || [];
        const filteredConversations = conversations.filter(conv => 
          conv.id !== conversationId && conv.id !== oldConversationId
        );
        uni.setStorageSync('conversations', filteredConversations);
        
        this.testResult = '本地存储已清空';
      } catch (error) {
        this.testResult = `清空本地存储失败: ${error.message}`;
      }
    },
    
    formatTime(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return date.toLocaleString();
    }
  }
};
</script>

<style scoped>
.container {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.header {
  text-align: center;
  margin-bottom: 20px;
}

.title {
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

.test-section {
  background-color: white;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.section-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin-bottom: 10px;
}

.input-group {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.input-group text {
  width: 100px;
  color: #666;
}

.input-group input {
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-left: 10px;
}

.test-btn {
  width: 100%;
  padding: 12px;
  margin-bottom: 10px;
  background-color: #007aff;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
}

.delete-btn {
  background-color: #ff3b30;
}

.clear-btn {
  background-color: #ff9500;
}

.result-box {
  background-color: #f8f8f8;
  padding: 10px;
  border-radius: 4px;
  border-left: 4px solid #007aff;
}

.result-text {
  color: #333;
  font-size: 14px;
}

.message-list {
  max-height: 300px;
  background-color: #f8f8f8;
  border-radius: 4px;
  padding: 10px;
}

.message-item {
  background-color: white;
  padding: 10px;
  margin-bottom: 8px;
  border-radius: 4px;
  border-left: 3px solid #007aff;
}

.message-content {
  display: block;
  font-size: 14px;
  color: #333;
  margin-bottom: 5px;
}

.message-info {
  display: block;
  font-size: 12px;
  color: #999;
}

.no-messages {
  text-align: center;
  padding: 20px;
  color: #999;
}
</style>