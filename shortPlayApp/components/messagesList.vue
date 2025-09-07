<template>
  <view class="message-list-component">
    <!-- 消息列表 -->
    <view class="message-list">
      <view v-if="loading" class="loading-state">
        <u-loading-icon></u-loading-icon>
        <text>加载中...</text>
      </view>
      <view v-else-if="visibleMessages.length === 0" class="empty-state">
        <view class="empty-icon">📧</view>
        <view class="empty-text">暂无消息</view>
        <view class="empty-desc">与其他用户互动，开始新的对话</view>
      </view>
      <scroll-view v-else class="virtual-list-container" scroll-y @scroll="onScroll" :scroll-top="scrollTop">
        <view class="virtual-placeholder" :style="{ height: totalHeight + 'px' }"></view>
        <view class="virtual-viewport" :style="{ transform: `translateY(${offsetY}px)` }">
          <view v-for="message in visibleMessages" :key="message._id" class="message-item" @click="goToChat(message)">
            <view class="message-avatar">
              <image :src="getFriend(message).avatar || '/static/img/default-avatar.png'" class="avatar-img"></image>
              <view v-if="message.unreadCount > 0" class="unread-badge">{{ message.unreadCount }}</view>
            </view>
            <view class="message-content">
              <view class="message-header">
                <view class="friend-name">{{ getFriend(message).nickname }}</view>
                <view class="message-time">{{ formatTime(message.lastMessage.createdAt) }}</view>
              </view>
              <view class="message-body">
                <text class="last-message">{{ message.lastMessage.content }}</text>
              </view>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import io from 'socket.io-client';
import tokenManager from '@/utils/tokenManager';
import http from '@/utils/request.js';

let socket = null;
const messageList = ref([]);
const loading = ref(false);
const currentUser = ref(null);
const itemHeight = ref(150);
const containerHeight = ref(0);
const scrollTop = ref(0);
const visibleCount = ref(0);
const bufferSize = ref(3);

const totalHeight = computed(() => messageList.value.length * itemHeight.value);
const startIndex = computed(() => {
  const index = Math.floor(scrollTop.value / itemHeight.value);
  return Math.max(0, index - bufferSize.value);
});
const endIndex = computed(() => {
  const index = startIndex.value + visibleCount.value + bufferSize.value * 2;
  return Math.min(messageList.value.length, index);
});
const visibleMessages = computed(() => messageList.value.slice(startIndex.value, endIndex.value));
const offsetY = computed(() => startIndex.value * itemHeight.value);

onMounted(() => {
  currentUser.value = tokenManager.getUserInfo();
  initVirtualList();
  loadMessages();
});

const initVirtualList = () => {
  const systemInfo = uni.getSystemInfoSync();
  containerHeight.value = (systemInfo.windowHeight * 750) / systemInfo.windowWidth;
  visibleCount.value = Math.ceil(containerHeight.value / itemHeight.value) + 1;
};

const onScroll = e => {
  scrollTop.value = e.detail.scrollTop;
};

const loadMessages = async () => {
  if (loading.value || !currentUser.value) return;
  loading.value = true;
  try {
    const res = await http.get(`/chat/conversations`, {
      userId: currentUser.value.id,
    });
    if (res.statusCode === 200) {
      messageList.value = res.data.data.conversations;
    } else {
      throw new Error(res.data?.message || '获取消息列表失败');
    }
  } catch (error) {
    console.error('加载消息列表失败:', error);
    uni.showToast({
      title: '加载失败',
      icon: 'none',
    });
  } finally {
    loading.value = false;
  }
};

const getFriend = message => {
  if (!currentUser.value) return {};
  return message.participants.find(p => p._id !== currentUser.value.id) || {};
};

const goToChat = message => {
  const friend = getFriend(message);
  uni.navigateTo({
    url: `/pages/chat/friendChatClean?friendId=${friend._id}&friendName=${friend.nickname}&friendAvatar=${friend.avatar}`,
  });
};

const addNewChat = () => {
  uni.switchTab({
    url: '/pages/messages/index',
    success: () => {
      setTimeout(() => {
        uni.$emit('switch-to-friends-tab');
      }, 100);
    },
  });
};

const formatTime = timeStr => {
  if (!timeStr) return '';
  const date = new Date(timeStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  return date.toLocaleDateString();
};
</script>

<style scoped>
.message-list-component {
  height: 100%;
}
.message-list {
  height: 100%;
}
.virtual-list-container {
  height: 100%;
}
.message-item {
  display: flex;
  padding: 20rpx;
  border-bottom: 1rpx solid #f0f0f0;
}
.message-avatar {
  position: relative;
  margin-right: 20rpx;
}
.avatar-img {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
}
.unread-badge {
  position: absolute;
  top: 0;
  right: 0;
  background-color: #fa3534;
  color: #fff;
  border-radius: 50%;
  padding: 4rpx 8rpx;
  font-size: 20rpx;
}
.message-content {
  flex: 1;
}
.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.friend-name {
  font-size: 32rpx;
  font-weight: bold;
}
.message-time {
  font-size: 24rpx;
  color: #999;
}
.last-message {
  font-size: 28rpx;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.loading-state,
.empty-state {
  text-align: center;
  padding: 100rpx 0;
  color: #999;
}
.virtual-placeholder {
  width: 100%;
  pointer-events: none;
}
.virtual-viewport {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  will-change: transform;
}
</style>
