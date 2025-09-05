<template>
  <view class="friend-chat-container">
    <!-- 聊天导航栏 -->
    <view class="chat-navbar">
      <view class="navbar-left" @click="goBack">
        <text class="back-icon">←</text>
      </view>
      <view class="navbar-center">
        <text class="friend-name">{{ friendInfo.nickname || '好友' }}</text>
      </view>
      <view class="navbar-right" @click="showFriendMenu">
        <text class="menu-icon">⋯</text>
      </view>
    </view>

    <!-- 聊天内容区域 -->
    <scroll-view
      scroll-y
      class="chat-content"
      :scroll-top="scrollTop"
      :scroll-into-view="scrollIntoView"
      @scrolltoupper="loadMoreMessages"
    >
      <!-- 消息列表 -->
      <view v-if="messageList.length > 0" class="message-list">
        <view
          v-for="(message, index) in messageList"
          :key="message.id || message._id || index"
          :id="index === messageList.length - 1 ? 'bottom-message' : ''"
          class="message-item"
        >
          <!-- 时间显示（居中） -->
          <view class="message-time-row">
            <text class="message-time">{{ formatTime(message.timestamp || message.createdAt) }}</text>
          </view>

          <!-- 对方消息：左对齐，带头像 -->
          <view v-if="!isOwnMessage(message)" class="message-row friend-row">
            <view class="avatar-container">
              <image
                :src="friendInfo.avatar || '/static/img/default-avatar.png'"
                class="message-avatar"
                mode="aspectFill"
              />
            </view>
            <view class="message-bubble friend-bubble">
              <text class="message-text">{{ message.content }}</text>
            </view>
          </view>

          <!-- 自己消息：右对齐，带头像 -->
          <view v-if="isOwnMessage(message)" class="message-row own-row">
            <view class="message-status" v-if="message.sending || message.failed">
              <text v-if="message.sending" class="status-sending">发送中</text>
              <text v-if="message.failed" class="status-failed">失败</text>
            </view>
            <view class="message-bubble own-bubble">
              <text class="message-text">{{ message.content }}</text>
            </view>
            <view class="avatar-container">
              <image
                :src="currentUser.avatar || '/static/img/default-avatar.png'"
                class="message-avatar"
                mode="aspectFill"
              />
            </view>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="messageList.length === 0" class="empty-state">
        <text class="empty-text">暂无聊天记录</text>
        <text class="empty-subtitle">发送第一条消息开始聊天吧</text>
      </view>

      <!-- 底部锚点，用于滚动定位 -->
      <view id="bottom-anchor" style="height: 1px"></view>
    </scroll-view>

    <!-- 底部输入区域 -->
    <view class="bottom-input-area">
      <view class="input-container">
        <view class="input-left">
          <view class="voice-btn" @click="toggleVoiceMode">
            <view class="voice-icon-bg">
              <view class="voice-waves">
                <view class="wave wave1"></view>
                <view class="wave wave2"></view>
                <view class="wave wave3"></view>
              </view>
            </view>
          </view>
        </view>
        <view class="input-center">
          <input
            v-model="inputMessage"
            placeholder="输入消息..."
            class="message-input"
            @confirm="sendMessage"
            confirm-type="send"
          />
        </view>
        <view class="input-right">
          <view class="emoji-btn" @click="toggleEmojiPanel">
            <view class="emoji-face">
              <view class="emoji-eyes">
                <view class="emoji-eye left"></view>
                <view class="emoji-eye right"></view>
              </view>
              <view class="emoji-mouth"></view>
            </view>
          </view>
          <view class="add-btn" @click="showAddMenu">
            <view class="add-horizontal"></view>
            <view class="add-vertical"></view>
          </view>
        </view>
      </view>
    </view>

    <!-- 表情面板 -->
    <view v-if="showEmojiPanel" class="emoji-panel">
      <view class="emoji-header">
        <text class="emoji-title">选择表情</text>
        <view class="emoji-close" @click="toggleEmojiPanel">
          <text class="close-icon">×</text>
        </view>
      </view>
      <scroll-view scroll-y class="emoji-content">
        <view class="emoji-grid">
          <view v-for="(emoji, index) in emojiList" :key="index" class="emoji-item" @click="selectEmoji(emoji)">
            <text class="emoji-char">{{ emoji.char }}</text>
          </view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import tokenManager from '@/utils/tokenManager';

const friendInfo = ref(null);
const currentUser = ref(null);
const messageList = ref([]);
const inputMessage = ref('');
const scrollTop = ref(0);
const scrollIntoView = ref('');
const showEmojiPanel = ref(false);
const emojiList = ref([
  { char: '😊', name: '微笑' },
  { char: '😄', name: '开心' },
  { char: '🥰', name: '爱心' },
  { char: '😘', name: '飞吻' },
  { char: '🤔', name: '思考' },
  { char: '😅', name: '汗' },
  { char: '😂', name: '笑哭' },
  { char: '🥺', name: '可怜' },
  { char: '😭', name: '哭泣' },
  { char: '😤', name: '生气' },
  { char: '🤗', name: '拥抱' },
  { char: '👍', name: '赞' },
  { char: '👎', name: '踩' },
  { char: '👌', name: 'OK' },
  { char: '✌️', name: '胜利' },
  { char: '🤝', name: '握手' },
  { char: '👏', name: '鼓掌' },
  { char: '🙏', name: '祈祷' },
  { char: '❤️', name: '红心' },
  { char: '💔', name: '心碎' },
  { char: '💯', name: '100分' },
  { char: '🔥', name: '火' },
  { char: '⭐', name: '星星' },
  { char: '🌟', name: '闪亮' },
]);
const page = ref(1);
const hasMoreMessages = ref(true);

onMounted(() => {
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  const options = currentPage.options;

  console.log('聊天页面参数:', options);
  currentUser.value = tokenManager.getUserInfo();
  if (!currentUser.value) {
    try {
      const storedUserInfo = uni.getStorageSync('userInfo');
      const storedToken = uni.getStorageSync('token');
      if (storedUserInfo && storedToken) {
        currentUser.value = storedUserInfo;
      }
    } catch (e) {
      console.error('获取存储信息失败:', e);
    }
  }

  friendInfo.value = {
    id: options.friendId,
    nickname: options.friendName || options.nickname || '好友',
    avatar: options.friendAvatar || options.avatar || '/static/img/default-avatar.png',
  };

  if (friendInfo.value.nickname && friendInfo.value.nickname.includes('%')) {
    try {
      friendInfo.value.nickname = decodeURIComponent(friendInfo.value.nickname);
    } catch (e) {
      console.log('解码好友昵称失败:', e);
    }
  }

  if (friendInfo.value.avatar && friendInfo.value.avatar.includes('%')) {
    try {
      friendInfo.value.avatar = decodeURIComponent(friendInfo.value.avatar);
    } catch (e) {
      console.log('解码好友头像失败:', e);
    }
  }

  if (!currentUser.value || !currentUser.value.id) {
    uni.showModal({
      title: '用户未登录',
      content: '请先登录后再进行聊天',
      showCancel: false,
      success: () => uni.reLaunch({ url: '/pages/G-signUp/index' }),
    });
    return;
  }

  if (!friendInfo.value.id) {
    uni.showModal({
      title: '参数错误',
      content: '好友信息缺失，请重新选择好友',
      showCancel: false,
      success: () => uni.navigateBack(),
    });
    return;
  }

  loadChatHistory();

  nextTick(() => {
    if (messageList.value.length > 0) {
      setTimeout(() => scrollToBottom(), 200);
    }
  });
});

const isOwnMessage = message => {
  if (!message || !currentUser.value) return false;
  let messageFromId;
  if (message.fromUserId) {
    messageFromId = message.fromUserId;
  } else if (message.fromUser) {
    if (typeof message.fromUser === 'string') {
      messageFromId = message.fromUser;
    } else if (message.fromUser._id) {
      messageFromId = message.fromUser._id;
    } else {
      messageFromId = message.fromUser.toString();
    }
  }
  const currentUserId = currentUser.value.id;
  return messageFromId?.toString() === currentUserId?.toString();
};

const loadChatHistory = async () => {
  if (!currentUser.value || !friendInfo.value.id) return;
  try {
    const response = await uni.request({
      url: `http://localhost:3000/api/chat/history/${friendInfo.value.id}`,
      method: 'GET',
      data: { userId: currentUser.value.id, page: page.value, limit: 50 },
      header: { Authorization: `Bearer ${tokenManager.getAccessToken()}` },
    });

    if (response.data && response.data.success) {
      const messages = response.data.data.messages.map(msg => ({
        id: msg._id,
        content: msg.content,
        messageType: msg.messageType || 'text',
        timestamp: msg.createdAt,
        fromUserId: msg.fromUser?._id || msg.fromUser,
        toUserId: msg.toUser?._id || msg.toUser,
        originalFromUser: msg.fromUser,
        originalToUser: msg.toUser,
        status: msg.status,
        isRead: msg.isRead,
      }));
      messageList.value = messages;
      nextTick(() => {
        if (messageList.value.length > 0) {
          setTimeout(() => scrollToBottom(), 100);
        }
      });
    } else {
      messageList.value = [];
    }
  } catch (error) {
    console.error('加载聊天历史失败:', error);
    messageList.value = [];
    uni.showToast({ title: '加载聊天记录失败', icon: 'error' });
  }
};

const sendMessage = async () => {
  const message = inputMessage.value.trim();
  if (!message) return;

  const messageData = {
    id: `temp_${Date.now()}`,
    fromUserId: currentUser.value.id,
    toUserId: friendInfo.value.id,
    content: message,
    messageType: 'text',
    timestamp: new Date().toISOString(),
    sending: true,
    failed: false,
  };

  messageList.value.push(messageData);
  inputMessage.value = '';
  nextTick(() => scrollToBottom());

  try {
    const response = await uni.request({
      url: 'http://localhost:3000/api/chat/send',
      method: 'POST',
      data: {
        fromUserId: currentUser.value.id,
        toUserId: friendInfo.value.id,
        content: message,
        messageType: 'text',
      },
      header: {
        Authorization: `Bearer ${tokenManager.getAccessToken()}`,
        'Content-Type': 'application/json',
      },
    });

    const msgIndex = messageList.value.findIndex(msg => msg.id === messageData.id);
    if (msgIndex >= 0) {
      if (response.data && response.data.success) {
        messageList.value[msgIndex].sending = false;
        messageList.value[msgIndex].failed = false;
        messageList.value[msgIndex].id = response.data.data.messageId || messageData.id;
        messageList.value[msgIndex].status = 'sent';
      } else {
        messageList.value[msgIndex].sending = false;
        messageList.value[msgIndex].failed = true;
      }
    }
  } catch (error) {
    console.error('发送消息失败:', error);
    const msgIndex = messageList.value.findIndex(msg => msg.id === messageData.id);
    if (msgIndex >= 0) {
      messageList.value[msgIndex].sending = false;
      messageList.value[msgIndex].failed = true;
    }
    uni.showToast({ title: '发送失败', icon: 'error' });
  }
};

const loadMoreMessages = async () => {
  if (!hasMoreMessages.value) return;
  page.value++;
};

const scrollToBottom = () => {
  nextTick(() => {
    scrollTop.value = 999999;
    setTimeout(() => {
      scrollTop.value = 0;
    }, 50);
  });
};

const formatTime = timestamp => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  if (diff < 24 * 60 * 60 * 1000) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }
  if (diff < 48 * 60 * 60 * 1000) {
    return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }
  return (
    date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  );
};

const goBack = () => {
  uni.navigateBack();
};

const showFriendMenu = () => {
  uni.showActionSheet({
    itemList: ['查看好友信息', '清空聊天记录'],
    success: res => {
      if (res.tapIndex === 0) {
        uni.navigateTo({ url: `/pages/profile/info?friendId=${friendInfo.value.id}` });
      } else if (res.tapIndex === 1) {
        clearChatHistory();
      }
    },
  });
};

const clearChatHistory = () => {
  uni.showModal({
    title: '⚠️ 危险操作',
    content: '此操作将彻底删除您与该好友的所有聊天记录。此操作不可恢复，您确定要继续吗？',
    confirmText: '确认删除',
    confirmColor: '#ff4757',
    success: res => {
      if (res.confirm) {
        uni.showModal({
          title: '最终确认',
          content: '请再次确认：您真的要永久删除所有聊天记录吗？删除后无法恢复！',
          confirmText: '永久删除',
          confirmColor: '#ff4757',
          success: async secondRes => {
            if (secondRes.confirm) {
              await performClearChatHistory();
            }
          },
        });
      }
    },
  });
};

const performClearChatHistory = async () => {
  try {
    uni.showLoading({ title: '正在删除聊天记录...' });
    const response = await uni.request({
      url: `http://localhost:3000/api/chat/conversation/${friendInfo.value.id}`,
      method: 'DELETE',
      data: { userId: currentUser.value.id },
      header: {
        Authorization: `Bearer ${tokenManager.getAccessToken()}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.data && response.data.success) {
      messageList.value = [];
      const conversationId = [currentUser.value.id, friendInfo.value.id].sort().join('_');
      uni.removeStorageSync(`chat_${conversationId}`);
      uni.removeStorageSync(`messages_${conversationId}`);
      uni.removeStorageSync(`conversation_${conversationId}`);
      uni.hideLoading();
      uni.showToast({ title: `已删除 ${response.data.data.deletedCount} 条记录`, icon: 'success', duration: 2000 });
      page.value = 1;
      setTimeout(async () => {
        await loadChatHistory();
      }, 800);
    } else {
      throw new Error(response.data?.message || '删除失败');
    }
  } catch (error) {
    uni.hideLoading();
    let errorMessage = '删除聊天记录失败';
    if (error.data && error.data.message) {
      errorMessage = error.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    uni.showModal({
      title: '删除失败',
      content: errorMessage + '\n\n是否只清空本地显示的聊天记录？',
      confirmText: '仅清空本地',
      cancelText: '取消',
      success: res => {
        if (res.confirm) {
          messageList.value = [];
          uni.showToast({ title: '已清空本地记录', icon: 'success' });
        }
      },
    });
  }
};

const toggleVoiceMode = () => {
  uni.showToast({ title: '语音功能开发中', icon: 'none' });
};

const toggleEmojiPanel = () => {
  showEmojiPanel.value = !showEmojiPanel.value;
};

const selectEmoji = emoji => {
  inputMessage.value += emoji.char;
};

const showAddMenu = () => {
  uni.showActionSheet({
    itemList: ['图片', '文件', '位置'],
    success: res => {
      const actions = ['选择图片', '选择文件', '发送位置'];
      uni.showToast({ title: `${actions[res.tapIndex]}功能开发中`, icon: 'none' });
    },
  });
};
</script>

<style scoped>
.friend-chat-container {
  width: 100%;
  height: 100vh;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
}

/* 聊天导航栏 - 吸顶效果 */
.chat-navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  height: 88rpx;
  padding: 0 30rpx;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.05);
}

.navbar-left,
.navbar-right {
  width: 80rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon,
.menu-icon {
  font-size: 32rpx;
  font-weight: 600;
  color: #374151;
}

.navbar-center {
  flex: 1;
  text-align: center;
}

.friend-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #1f2937;
}

/* 聊天内容区域 */
.chat-content {
  flex: 1;
  padding: 20rpx;
  padding-top: 108rpx; /* 为固定导航栏留出空间 */
  padding-bottom: 150rpx;
  background: #f5f5f5;
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

/* 消息容器 */
.message-item {
  margin-bottom: 24rpx;
}

/* 消息行 */
.message-row {
  display: flex;
  margin-bottom: 8rpx;
  align-items: flex-end;
}

.friend-row {
  justify-content: flex-start;
  padding-left: 20rpx;
  gap: 12rpx;
}

.own-row {
  justify-content: flex-end;
  padding-right: 50rpx;
  align-items: flex-end;
  gap: 12rpx;
}

/* 头像容器 */
.avatar-container {
  flex-shrink: 0;
}

/* 头像样式 */
.message-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  border: 2rpx solid #e5e7eb;
}

/* 消息气泡 */
.message-bubble {
  padding: 16rpx 20rpx;
  border-radius: 8rpx;
  max-width: 50%;
  word-wrap: break-word;
  display: inline-block;
}

/* 好友消息气泡 - 白色 */
.friend-bubble {
  background: #ffffff;
  border: 1rpx solid #d0d0d0;
}

/* 自己消息气泡 - 绿色 */
.own-bubble {
  background: #95ec69;
}

/* 消息文本 */
.message-text {
  font-size: 32rpx;
  line-height: 1.3;
  color: #000000;
  word-wrap: break-word;
}

/* 时间显示行 - 居中 */
.message-time-row {
  display: flex;
  justify-content: center;
  margin-top: 8rpx;
  margin-bottom: 8rpx;
}

.message-time {
  font-size: 24rpx;
  color: #b0b0b0;
}

/* 消息状态 */
.message-status {
  display: flex;
  align-items: center;
}

.status-sending,
.status-failed {
  font-size: 20rpx;
  color: #b0b0b0;
}

.status-failed {
  color: #ff4d4f;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 100rpx 40rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #9ca3af;
  display: block;
  margin-bottom: 12rpx;
}

.empty-subtitle {
  font-size: 24rpx;
  color: #d1d5db;
}

/* 底部输入区域 */
.bottom-input-area {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #f5f5f5;
  border-top: 1rpx solid #d0d0d0;
  padding-bottom: env(safe-area-inset-bottom);
}

.input-container {
  display: flex;
  align-items: center;
  padding: 15rpx 20rpx;
  gap: 15rpx;
}

.input-left,
.input-right {
  display: flex;
  align-items: center;
  gap: 15rpx;
}

.voice-btn,
.emoji-btn,
.add-btn {
  width: 70rpx;
  height: 70rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  border-radius: 50%;
  border: 2rpx solid #000000;
  box-shadow: none;
  position: relative;
}

.voice-btn:active,
.emoji-btn:active,
.add-btn:active {
  background: #f0f0f0;
}

/* 语音图标 - 声波样式 */
.voice-icon-bg {
  width: 40rpx;
  height: 40rpx;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.voice-waves {
  display: flex;
  align-items: center;
  gap: 3rpx;
}

.wave {
  width: 4rpx;
  background: #000000;
  border-radius: 2rpx;
}

.wave1 {
  height: 16rpx;
}

.wave2 {
  height: 24rpx;
}

.wave3 {
  height: 20rpx;
}

/* 表情图标 - 笑脸样式 */
.emoji-face {
  width: 36rpx;
  height: 36rpx;
  position: relative;
}

.emoji-eyes {
  display: flex;
  justify-content: space-between;
  margin-top: 8rpx;
  margin-bottom: 6rpx;
  padding: 0 8rpx;
}

.emoji-eye {
  width: 6rpx;
  height: 6rpx;
  background: #000000;
  border-radius: 50%;
}

.emoji-mouth {
  width: 20rpx;
  height: 10rpx;
  border: 2rpx solid #000000;
  border-top: none;
  border-radius: 0 0 20rpx 20rpx;
  margin: 0 auto;
}

/* 加号图标 - 十字样式 */
.add-horizontal {
  position: absolute;
  width: 24rpx;
  height: 3rpx;
  background: #000000;
  border-radius: 2rpx;
}

.add-vertical {
  position: absolute;
  width: 3rpx;
  height: 24rpx;
  background: #000000;
  border-radius: 2rpx;
}

.input-center {
  flex: 1;
}

.message-input {
  width: 89%;
  height: 70rpx;
  padding: 0 25rpx;
  background: #ffffff;
  border: 2rpx solid #000000;
  border-radius: 35rpx;
  font-size: 28rpx;
  line-height: 70rpx;
}

.message-input::placeholder {
  color: #999999;
}

/* 表情面板样式 */
.emoji-panel {
  position: fixed;
  bottom: 120rpx; /* 在输入区域上方 */
  left: 0;
  right: 0;
  background: #ffffff;
  border-top: 1rpx solid #e0e0e0;
  height: 400rpx;
  z-index: 1000;
  animation: slideUpIn 0.3s ease-out;
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.1);
  padding-bottom: env(safe-area-inset-bottom);
}

@keyframes slideUpIn {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.emoji-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
  background: #fafafa;
}

.emoji-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333333;
}

.emoji-close {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #f5f5f5;
  border: 1rpx solid #e0e0e0;
}

.emoji-close:active {
  background: #e9e9e9;
  transform: scale(0.95);
}

.close-icon {
  font-size: 36rpx;
  color: #666666;
  line-height: 1;
}

.emoji-content {
  height: 320rpx;
  padding: 20rpx 30rpx;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 12rpx;
  padding: 10rpx 0;
}

.emoji-item {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 24rpx;
  transition: all 0.2s ease;
  cursor: pointer;
  background: #f8f9fa;
  border: 1rpx solid #e9ecef;
}

.emoji-item:hover {
  background: #e9ecef;
}

.emoji-item:active {
  background: #dee2e6;
  transform: scale(1.1);
}

.emoji-char {
  font-size: 44rpx;
  line-height: 1;
  user-select: none;
}
</style>
