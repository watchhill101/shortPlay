<template>
  <view class="friend-requests-page">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar">
      <view class="navbar-left" @click="goBack">
        <text class="back-icon">←</text>
      </view>
      <view class="navbar-title">好友申请</view>
      <view class="navbar-right"></view>
    </view>

    <!-- Tab切换 -->
    <view class="tab-section">
      <view class="tab-item" :class="{ active: activeTab === 'received' }" @click="switchTab('received')">
        <text class="tab-text">收到的申请</text>
        <view v-if="receivedCount > 0" class="tab-badge">{{ receivedCount }}</view>
      </view>
      <view class="tab-item" :class="{ active: activeTab === 'sent' }" @click="switchTab('sent')">
        <text class="tab-text">发出的申请</text>
        <view v-if="sentCount > 0" class="tab-badge">{{ sentCount }}</view>
      </view>
    </view>

    <!-- 申请列表 -->
    <view class="requests-container">
      <view v-if="loading" class="loading-state">
        <u-loading-icon></u-loading-icon>
        <text>加载中...</text>
      </view>

      <view v-else-if="requestList.length === 0" class="empty-state">
        <view class="empty-icon">
          {{ activeTab === 'received' ? '📬' : '📤' }}
        </view>
        <view class="empty-text">
          {{ activeTab === 'received' ? '暂无收到的申请' : '暂无发出的申请' }}
        </view>
        <view class="empty-desc">
          {{ activeTab === 'received' ? '等待其他用户添加你为好友' : '去搜索用户发送好友申请吧' }}
        </view>
        <u-button
          v-if="activeTab === 'sent'"
          text="添加好友"
          type="primary"
          @click="goToAddFriend"
          style="margin-top: 30rpx"
        ></u-button>
      </view>

      <view v-else class="request-list">
        <view v-for="request in requestList" :key="request._id" class="request-item">
          <view class="request-avatar">
            <image
              :src="getRequestUserInfo(request).avatar || '/static/img/default-avatar.png'"
              class="avatar-img"
            ></image>
            <view v-if="getRequestUserInfo(request).status === 'active'" class="online-dot"></view>
          </view>
          <view class="request-info">
            <view class="request-name">{{ getRequestUserInfo(request).nickname }}</view>
            <view class="request-message">{{ request.requestMessage }}</view>
            <view class="request-time">{{ formatTime(request.createdAt) }}</view>
          </view>
          <view class="request-actions">
            <!-- 收到的申请 -->
            <template v-if="activeTab === 'received' && request.status === 'pending'">
              <u-button
                text="拒绝"
                type="error"
                size="small"
                @click="handleRequest(request._id, 'reject')"
                style="margin-right: 10rpx"
              ></u-button>
              <u-button
                text="接受"
                type="success"
                size="small"
                @click="handleRequest(request._id, 'accept')"
              ></u-button>
            </template>

            <!-- 发出的申请或已处理的申请 -->
            <template v-else>
              <view class="status-badge" :class="getStatusClass(request.status)">
                {{ getStatusText(request.status) }}
              </view>
            </template>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部提示 -->
    <view v-if="requestList.length > 0" class="bottom-tip">
      <text class="tip-text">
        {{ activeTab === 'received' ? '及时处理好友申请，建立更多连接' : '耐心等待对方回应你的申请' }}
      </text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import tokenManager from '@/utils/tokenManager';
import friendService from '@/utils/friendService';
import { getApiConfig } from '@/config/index.js';

const apiConfig = getApiConfig();

const activeTab = ref('received');
const requestList = ref([]);
const loading = ref(false);
const receivedCount = ref(0);
const sentCount = ref(0);
const currentUser = ref(null);

const receivedRequests = computed(() => requestList.value.filter(req => req.status === 'pending'));
const sentRequests = computed(() => requestList.value.filter(req => req.status === 'pending'));

onMounted(async () => {
  currentUser.value = tokenManager.getUserInfo();
  if (currentUser.value) {
    loadRequests();
    uni.$on('friendRequestsChanged', loadRequests);
  }
  // 获取状态栏高度 - uni-app中直接使用固定值
  const systemInfo = uni.getSystemInfoSync();
  console.log('状态栏高度:', systemInfo.statusBarHeight);
});

const switchTab = tab => {
  if (activeTab.value !== tab) {
    activeTab.value = tab;
    loadRequests();
  }
};

const loadRequests = async () => {
  if (loading.value || !currentUser.value) return;
  loading.value = true;
  try {
    const response = await uni.request({
      url: `${apiConfig.baseURL}/friends/requests/${currentUser.value.id}`,
      method: 'GET',
      data: { type: activeTab.value },
      header: {
        Authorization: `Bearer ${tokenManager.getAccessToken()}`,
      },
    });
    if (response.data && response.data.success) {
      requestList.value = response.data.data.requests;
      if (activeTab.value === 'received') {
        receivedCount.value = requestList.value.filter(req => req.status === 'pending').length;
      } else {
        sentCount.value = requestList.value.filter(req => req.status === 'pending').length;
      }
    } else {
      throw new Error(response.data?.message || '获取申请列表失败');
    }
  } catch (error) {
    console.error('加载申请列表失败:', error);
    uni.showToast({ title: '加载失败，请检查网络连接', icon: 'none' });
  } finally {
    loading.value = false;
  }
};

const handleRequest = (requestId, action) => {
  const actionText = action === 'accept' ? '接受' : '拒绝';
  uni.showModal({
    title: `${actionText}申请`,
    content: `确定要${actionText}这个好友申请吗？`,
    success: async res => {
      if (res.confirm) {
        await doHandleRequest(requestId, action);
      }
    },
  });
};

const doHandleRequest = async (requestId, action) => {
  try {
    uni.showLoading({ title: '处理中...' });
    const response = await uni.request({
      url: `${apiConfig.baseURL}/friends/request/${requestId}`,
      method: 'PUT',
      data: { action, userId: currentUser.value.id },
      header: {
        Authorization: `Bearer ${tokenManager.getAccessToken()}`,
        'Content-Type': 'application/json',
      },
    });
    uni.hideLoading();
    if (response.data && response.data.success) {
      const actionText = action === 'accept' ? '接受' : '拒绝';
      uni.showToast({ title: `已${actionText}申请`, icon: 'success' });
      loadRequests();
    } else {
      throw new Error(response.data?.message || '处理失败');
    }
  } catch (error) {
    uni.hideLoading();
    console.error('处理申请失败:', error);
    uni.showToast({ title: '处理失败，请检查网络连接', icon: 'none' });
  }
};

const getRequestUserInfo = request => {
  if (activeTab.value === 'received') {
    return request.requester || {};
  } else {
    return request.recipient || {};
  }
};

const getStatusClass = status => {
  const classMap = {
    pending: 'status-pending',
    accepted: 'status-accepted',
    rejected: 'status-rejected',
    blocked: 'status-blocked',
  };
  return classMap[status] || 'status-pending';
};

const getStatusText = status => {
  const textMap = {
    pending: '待处理',
    accepted: '已接受',
    rejected: '已拒绝',
    blocked: '已屏蔽',
  };
  return textMap[status] || '未知';
};

const goToAddFriend = () => {
  uni.navigateTo({ url: '/pages/friends/addFriend' });
};

const goBack = () => {
  // 检查页面栈，返回上一页
  const pages = getCurrentPages();
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 });
  } else {
    // 如果没有上一页，跳转到消息中心
    uni.reLaunch({ url: '/pages/messages/index' });
  }
};

const formatTime = timeStr => {
  if (!timeStr) return '未知时间';
  try {
    const time = new Date(timeStr);
    const now = new Date();
    const diff = now - time;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    if (diff < 2592000000) return `${Math.floor(diff / 86400000)}天前`;
    return time.toLocaleDateString();
  } catch (error) {
    return '未知时间';
  }
};
</script>

<style scoped>
.friend-requests-page {
  min-height: 100vh;
  background-color: #ffffff;
}

/* 自定义导航栏 */
.custom-navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 30rpx;
  padding-top: 108rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  position: sticky;
  top: 0;
  z-index: 100;
}

.navbar-left,
.navbar-right {
  width: 80rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  font-size: 36rpx;
  font-weight: bold;
}

.navbar-title {
  font-size: 32rpx;
  font-weight: bold;
}

/* Tab切换 */
.tab-section {
  display: flex;
  background: white;
  margin: 20rpx;
  border-radius: 20rpx;
  overflow: hidden;
}

.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 30rpx;
  position: relative;
  background: #f8f9fa;
  transition: all 0.3s ease;
}

.tab-item.active {
  background: linear-gradient(45deg, #667eea, #764ba2);
  color: white;
}

.tab-text {
  font-size: 28rpx;
  font-weight: bold;
}

.tab-badge {
  position: absolute;
  top: 15rpx;
  right: 20rpx;
  background: #ff4757;
  color: white;
  font-size: 20rpx;
  padding: 4rpx 8rpx;
  border-radius: 10rpx;
  min-width: 30rpx;
  text-align: center;
}

/* 申请列表容器 */
.requests-container {
  padding: 0 20rpx;
  min-height: 400rpx;
}

.request-list {
  padding-bottom: 100rpx;
}

.request-item {
  display: flex;
  align-items: center;
  padding: 30rpx;
  margin-bottom: 20rpx;
  background: white;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.1);
}

.request-avatar {
  position: relative;
  margin-right: 30rpx;
}

.avatar-img {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  object-fit: cover;
}

.online-dot {
  position: absolute;
  bottom: 5rpx;
  right: 5rpx;
  width: 20rpx;
  height: 20rpx;
  background: #52c41a;
  border: 3rpx solid white;
  border-radius: 50%;
}

.request-info {
  flex: 1;
}

.request-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
}

.request-message {
  font-size: 26rpx;
  color: #666;
  margin-bottom: 8rpx;
  line-height: 1.4;
}

.request-time {
  font-size: 22rpx;
  color: #999;
}

.request-actions {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.status-badge {
  padding: 8rpx 16rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
  text-align: center;
  min-width: 80rpx;
}

.status-pending {
  background: #ffeaa7;
  color: #d63031;
}

.status-accepted {
  background: #00b894;
  color: white;
}

.status-rejected {
  background: #ff7675;
  color: white;
}

.status-blocked {
  background: #636e72;
  color: white;
}

/* 加载状态 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 100rpx 40rpx;
  color: #999;
  gap: 20rpx;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 40rpx;
  color: #999;
}

.empty-icon {
  font-size: 120rpx;
  margin-bottom: 30rpx;
}

.empty-text {
  font-size: 32rpx;
  margin-bottom: 15rpx;
}

.empty-desc {
  font-size: 26rpx;
  text-align: center;
  line-height: 1.5;
}

/* 底部提示 */
.bottom-tip {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 20rpx;
  text-align: center;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
}

.tip-text {
  font-size: 24rpx;
  opacity: 0.8;
}
</style>
