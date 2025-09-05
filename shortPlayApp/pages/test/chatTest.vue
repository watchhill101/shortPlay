<template>
  <view class="chat-test-page">
    <view class="nav-bar">
      <view class="nav-left" @click="goBack">
        <text class="back-icon">←</text>
      </view>
      <view class="nav-title">聊天测试</view>
      <view class="nav-right"></view>
    </view>

    <view class="test-content">
      <view class="test-section">
        <text class="section-title">💬 实时聊天测试</text>

        <view class="test-buttons">
          <button class="test-btn" @click="connectWebSocket">连接WebSocket</button>
          <button class="test-btn" @click="sendTestMessage">发送测试消息</button>
          <button class="test-btn" @click="loadChatHistory">加载聊天记录</button>
          <button class="test-btn" @click="clearMessages">清空消息</button>
        </view>
      </view>

      <view class="messages-section">
        <text class="section-title">📝 消息记录</text>
        <scroll-view class="messages-scroll" scroll-y>
          <view v-for="(msg, index) in messages" :key="index" class="message-item">
            <text class="message-time">{{ formatTime(msg.time) }}</text>
            <text class="message-content">{{ msg.content }}</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onUnmounted } from 'vue';
import io from 'socket.io-client';
import tokenManager from '@/utils/tokenManager';

const messages = ref([]);
const websocket = ref(null);
const isConnected = ref(false);

const goBack = () => {
  uni.navigateBack();
};

const connectWebSocket = () => {
  try {
    websocket.value = uni.connectSocket({
      url: 'ws://localhost:3000',
      header: {
        Authorization: `Bearer ${tokenManager.getAccessToken()}`,
      },
    });

    websocket.value.onOpen(() => {
      isConnected.value = true;
      addMessage('WebSocket连接成功');
    });

    websocket.value.onMessage(res => {
      addMessage(`收到消息: ${res.data}`);
    });

    websocket.value.onClose(() => {
      isConnected.value = false;
      addMessage('WebSocket连接已断开');
    });

    websocket.value.onError(error => {
      addMessage(`WebSocket错误: ${JSON.stringify(error)}`);
    });
  } catch (error) {
    addMessage(`连接失败: ${error.message}`);
  }
};

const sendTestMessage = () => {
  if (!isConnected.value) {
    addMessage('请先连接WebSocket');
    return;
  }

  const testMessage = `测试消息 ${new Date().toLocaleTimeString()}`;
  websocket.value.send({
    data: JSON.stringify({
      type: 'test',
      content: testMessage,
    }),
  });

  addMessage(`发送: ${testMessage}`);
};

const loadChatHistory = async () => {
  try {
    const userInfo = tokenManager.getUserInfo();
    if (!userInfo) {
      console.error('用户未登录');
      return;
    }
    const response = await uni.request({
      url: `http://localhost:3000/api/chat/history?userId=${userInfo.id}`,
      method: 'GET',
      header: {
        Authorization: `Bearer ${tokenManager.getAccessToken()}`,
      },
    });
    if (response.statusCode === 200) {
      addMessage(`加载聊天记录成功: ${response.data.length} 个会话`);
    } else {
      addMessage('加载聊天记录失败');
    }
  } catch (error) {
    addMessage(`加载失败: ${error.message}`);
  }
};

const clearMessages = () => {
  messages.value = [];
};

const addMessage = content => {
  messages.value.push({
    content,
    time: new Date(),
  });
};

const formatTime = time => {
  return time.toLocaleTimeString();
};

onUnmounted(() => {
  if (websocket.value) {
    websocket.value.close();
  }
});
</script>

<style scoped>
.chat-test-page {
  width: 100%;
  min-height: 100vh;
  background: #f8fafc;
}

.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
}

.nav-left {
  width: 80rpx;
}

.back-icon {
  font-size: 32rpx;
  color: #374151;
}

.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1f2937;
}

.nav-right {
  width: 80rpx;
}

.test-content {
  padding: 32rpx 20rpx;
}

.test-section,
.messages-section {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 24rpx;
}

.test-buttons {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.test-btn {
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 12rpx;
  padding: 24rpx;
  font-size: 28rpx;
  font-weight: 500;
}

.messages-scroll {
  height: 400rpx;
  border: 1px solid #e5e7eb;
  border-radius: 12rpx;
  padding: 16rpx;
}

.message-item {
  margin-bottom: 16rpx;
  padding: 16rpx;
  background: #f8fafc;
  border-radius: 8rpx;
}

.message-time {
  font-size: 20rpx;
  color: #6b7280;
  display: block;
  margin-bottom: 8rpx;
}

.message-content {
  font-size: 24rpx;
  color: #374151;
  line-height: 1.4;
}
</style>
