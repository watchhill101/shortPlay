<template>
  <view class="test-page">
    <view class="nav-bar">
      <view class="nav-left" @click="goBack">
        <text class="back-icon">←</text>
      </view>
      <view class="nav-title">API测试</view>
      <view class="nav-right"></view>
    </view>

    <view class="test-content">
      <view class="test-section">
        <text class="section-title">🔧 API快速测试</text>

        <view class="test-buttons">
          <button class="test-btn" @click="testHealthAPI">测试健康检查</button>
          <button class="test-btn" @click="testUserAPI">测试用户API</button>
          <button class="test-btn" @click="testFriendAPI">测试好友API</button>
          <button class="test-btn" @click="testChatAPI">测试聊天API</button>
        </view>
      </view>

      <view class="result-section" v-if="testResult">
        <text class="result-title">测试结果：</text>
        <view class="result-content">
          <text class="result-text">{{ testResult }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import request from '@/utils/request';
import tokenManager from '@/utils/tokenManager';

const testResult = ref('');

const goBack = () => {
  uni.navigateBack();
};

const testHealthAPI = async () => {
  try {
    const response = await uni.request({
      url: 'http://localhost:3000/api/health',
      method: 'GET',
    });
    testResult.value = `✅ 健康检查成功: ${JSON.stringify(response.data, null, 2)}`;
  } catch (error) {
    testResult.value = `❌ 健康检查失败: ${error.message}`;
  }
};

const testUserAPI = async () => {
  try {
    const response = await uni.request({
      url: 'http://localhost:3000/api/users/me',
      method: 'GET',
      header: {
        Authorization: `Bearer ${tokenManager.getAccessToken()}`,
      },
    });
    testResult.value = `✅ 用户API测试成功: ${JSON.stringify(response.data, null, 2)}`;
  } catch (error) {
    testResult.value = `❌ 用户API测试失败: ${error.message}`;
  }
};

const testFriendAPI = async () => {
  try {
    const userInfo = tokenManager.getUserInfo();
    const response = await uni.request({
      url: `http://localhost:3000/api/friends/list/${userInfo.id}`,
      method: 'GET',
      header: {
        Authorization: `Bearer ${tokenManager.getAccessToken()}`,
      },
    });
    testResult.value = `✅ 好友API测试成功: ${JSON.stringify(response.data, null, 2)}`;
  } catch (error) {
    testResult.value = `❌ 好友API测试失败: ${error.message}`;
  }
};

const testChatAPI = async () => {
  try {
    const response = await uni.request({
      url: 'http://localhost:3000/api/chat/conversations',
      method: 'GET',
      header: {
        Authorization: `Bearer ${tokenManager.getAccessToken()}`,
      },
    });
    testResult.value = `✅ 聊天API测试成功: ${JSON.stringify(response.data, null, 2)}`;
  } catch (error) {
    testResult.value = `❌ 聊天API测试失败: ${error.message}`;
  }
};

async function testEndpoints() {
  try {
    // 示例: 调用受保护的GET端点
    const getRes = await request.get('/api/users', {
      header: { Authorization: `Bearer ${tokenManager.getAccessToken()}` },
    });
    console.log('受保护的GET响应:', getRes.data);

    // 示例: 获取当前用户信息
    const userInfo = tokenManager.getUserInfo();
    console.log('当前用户信息:', userInfo);

    // 示例: 调用受保护的POST端点
    const postRes = await request.post(
      '/api/chat/conversations',
      {
        userId: userInfo.id,
        friendId: 'friend_id_example', // 替换为有效的测试好友ID
      },
      { header: { Authorization: `Bearer ${tokenManager.getAccessToken()}` } }
    );
    console.log('受保护的POST响应:', postRes.data);

    // 示例: 多次调用以测试Token刷新
    for (let i = 0; i < 3; i++) {
      const res = await request.get('/api/users/profile', {
        header: { Authorization: `Bearer ${tokenManager.getAccessToken()}` },
      });
      console.log(`第 ${i + 1} 次调用Profile:`, res.data);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } catch (error) {
    console.error('API调用测试失败:', error);
  }
}
</script>

<style scoped>
.test-page {
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

.test-section {
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

.result-section {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.result-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 16rpx;
}

.result-content {
  background: #f8fafc;
  border-radius: 8rpx;
  padding: 20rpx;
}

.result-text {
  font-size: 24rpx;
  color: #374151;
  line-height: 1.5;
  white-space: pre-wrap;
}
</style>
