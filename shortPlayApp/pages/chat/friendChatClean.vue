<template>
  <view class="friend-chat-container">
    <!-- 聊天导航栏 -->
    <view class="chat-navbar" :style="navbarStyle">
      <view class="navbar-left" @click="goBack">
        <text class="back-icon">←</text>
      </view>
      <view class="navbar-center">
        <text class="friend-name">{{ friendInfo.nickname || '好友' }}</text>
        <view class="connection-status" v-if="showConnectionStatus">
          <view class="status-dot" :class="connectionStatus"></view>
          <text class="status-text">{{ connectionText }}</text>
        </view>
      </view>
      <view class="navbar-right">
        <view class="video-call-btn" @click="initiateVideoCall">
          <text class="call-icon">📹</text>
        </view>
        <view class="audio-call-btn" @click="initiateAudioCall">
          <text class="call-icon">📞</text>
        </view>
        <view class="test-video-btn" @click="openVideoDemo">
          <text class="test-icon">🧪</text>
        </view>
        <view class="menu-icon" @click="showFriendMenu">
          <text>⋯</text>
        </view>
      </view>
    </view>

    <!-- 聊天内容区域 -->
    <scroll-view
      scroll-y
      class="chat-content"
      :style="contentStyle"
      :scroll-top="scrollTop"
      :scroll-into-view="scrollIntoView"
      :enable-back-to-top="false"
      :scroll-with-animation="true"
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
            <view
              class="message-bubble friend-bubble"
              :style="
                message.messageType === 'image' || isImageUrl(message.content)
                  ? 'background:transparent;border:none;padding:0'
                  : ''
              "
            >
              <block
                v-if="message.messageType === 'image' || isImageUrl(message.content)"
                @click="console.log('Image block clicked:', message)"
              >
                <image
                  :key="message.id + '_' + message.content"
                  :src="toAbsoluteUrl(message.content)"
                  class="message-image"
                  mode="widthFix"
                  @click="previewImage(toAbsoluteUrl(message.content))"
                  @error="onImageError(message)"
                />
              </block>
              <block v-else>
                <text class="message-text">{{ message.content }}</text>
              </block>
            </view>
          </view>

          <!-- 自己消息：右对齐，带头像 -->
          <view v-if="isOwnMessage(message)" class="message-row own-row">
            <view class="message-status" v-if="message.sending || message.failed || message.status === 'sent'">
              <text v-if="message.sending" class="status-sending">
                <view class="loading-spinner"></view>
                发送中
              </text>
              <text v-if="message.failed" class="status-failed" @click="resendMessage(message)">
                <text class="retry-icon">⟲</text>
                重试
              </text>
              <text v-if="message.status === 'sent' && !message.sending && !message.failed" class="status-sent">
                已送达
              </text>
            </view>
            <view
              class="message-bubble own-bubble"
              :style="
                message.messageType === 'image' || isImageUrl(message.content) ? 'background:transparent;padding:0' : ''
              "
            >
              <block
                v-if="message.messageType === 'image' || isImageUrl(message.content)"
                @click="console.log('Image block clicked:', message)"
              >
                <image
                  :key="message.id + '_' + message.content"
                  :src="toAbsoluteUrl(message.content)"
                  class="message-image"
                  mode="widthFix"
                  @click="previewImage(toAbsoluteUrl(message.content))"
                  @error="onImageError(message)"
                />
              </block>
              <block v-else>
                <text class="message-text">{{ message.content }}</text>
              </block>
            </view>
            <view class="avatar-container">
              <image
                :src="(currentUser && currentUser.avatar) || '/static/img/default-avatar.png'"
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

  <!-- 顶部状态栏占位（通过内联样式偏移导航条与内容） -->
</template>

<script setup>
import { ref, onMounted, nextTick, computed, onUnmounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import tokenManager from '@/utils/tokenManager';
import { getApiConfig } from '@/config/index.js';
import socketService from '@/utils/socketService';

const apiConfig = getApiConfig();

// 简单判定是否是图片链接（用于历史消息渲染）
const isImageUrl = url => {
  const result =
    typeof url === 'string' &&
    /(\.png|\.jpe?g|\.gif|\/uploads\/chat\/|^https?:\/\/.*\.(png|jpe?g|gif)(\?.*)?$|^data:image)/i.test(url || '');
  console.log('isImageUrl check:', url, '=>', result);
  return result;
};

// 将相对 /uploads 路径转换为绝对地址
const getBaseHost = () => {
  const base = apiConfig.baseURL || '';
  try {
    const u = new URL(base);
    return `${u.protocol}//${u.host}`;
  } catch {
    return base.replace(/\/api\/?$/, '');
  }
};
const toAbsoluteUrl = url => {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('data:')) return url; // base64 图片直接返回
  const result = url.startsWith('/') ? `${getBaseHost()}${url}` : `${getBaseHost()}/${url}`;
  console.log('toAbsoluteUrl:', url, '->', result);
  return result;
};

// 测试网络连接
const testNetworkConnection = async () => {
  try {
    const testUrl = `${apiConfig.baseURL}/health`;
    const response = await uni.request({
      url: testUrl,
      method: 'GET',
      timeout: 5000,
    });
    console.log('网络连接测试:', response.statusCode === 200 ? '成功' : '失败');
    return response.statusCode === 200;
  } catch (error) {
    console.error('网络连接测试失败:', error);
    return false;
  }
};

const friendInfo = ref({ id: '', nickname: '好友', avatar: '/static/img/default-avatar.png' });
const currentUser = ref(null);
const messageList = ref([]);
const inputMessage = ref('');
const scrollTop = ref(0);
const scrollIntoView = ref('');
const showEmojiPanel = ref(false);
const showConnectionStatus = ref(true);
const connectionStatus = ref('disconnected'); // connected, connecting, disconnected
const connectionText = ref('未连接');
// 简单判定是否是图片链接（用于历史消息渲染）
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

// 视频通话状态管理
const callState = ref({
  isInCall: false,
  callType: null, // 'video' | 'audio' | null
  callStatus: 'idle', // 'idle' | 'calling' | 'ringing' | 'connected'
  callId: null,
  startTime: null,
  duration: 0,
  showCallModal: false,
});

const mediaPermissions = ref({
  camera: false,
  microphone: false,
});

// 顶部安全区高度（避免与系统状态栏重叠）
const statusBarHeight = ref(0);
const safeTopPx = ref(0);

// 顶部导航与内容的动态样式
const navbarStyle = computed(() => ({
  paddingTop: safeTopPx.value + 'px',
  height: `calc(88rpx + ${safeTopPx.value}px)`,
}));
const contentStyle = computed(() => ({
  paddingTop: `calc(108rpx + ${safeTopPx.value}px)`,
}));

// 使用 onLoad 更稳地拿到路由参数
onLoad(options => {
  try {
    const info = uni.getSystemInfoSync();
    statusBarHeight.value = info.statusBarHeight || 0;
  } catch (e) {
    statusBarHeight.value = 0;
  }
  // 在状态栏基础上仅增加 2px 间距，更贴近顶部
  safeTopPx.value = (statusBarHeight.value || 0) + 2;
  try {
    currentUser.value = tokenManager.getUserInfo() || uni.getStorageSync('userInfo') || {};
  } catch (e) {
    currentUser.value = {};
  }

  const friendId = options?.friendId || options?.id || '';
  const nickname = options?.friendName || options?.nickname || '好友';
  const avatar = options?.friendAvatar || options?.avatar || '/static/img/default-avatar.png';

  friendInfo.value = {
    id: friendId,
    nickname: decodeURIComponentSafe(nickname),
    avatar: decodeURIComponentSafe(avatar),
  };

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
  initializeSocket();
});

// 兼容旧逻辑（保留）
onMounted(() => {
  // 若未通过 onLoad 成功赋值，这里兜底一次
  if (!friendInfo.value?.id) {
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    const options = currentPage?.options || {};
    const friendId = options?.friendId || options?.id || '';
    const nickname = options?.friendName || options?.nickname || '好友';
    const avatar = options?.friendAvatar || options?.avatar || '/static/img/default-avatar.png';

    friendInfo.value = {
      id: friendId,
      nickname: decodeURIComponentSafe(nickname),
      avatar: decodeURIComponentSafe(avatar),
    };

    // 如果这里获取到了好友信息，也需要初始化Socket
    if (friendInfo.value.id) {
      initializeSocket();
    }
  }
});

// 组件卸载时清理
onUnmounted(() => {
  if (friendInfo.value?.id) {
    socketService.leaveFriendChat(friendInfo.value.id);
  }

  // 如果有活跃通话，结束通话
  if (callState.value.isInCall && callState.value.callId) {
    socketService.emit('call:end', {
      callId: callState.value.callId,
      reason: 'USER_DISCONNECTED',
    });
  }

  // 移除事件监听
  socketService.off('receiveFriendMessage', handleReceiveMessage);
  socketService.off('friendMessageSent', handleMessageSent);
  socketService.off('friendChatError', handleChatError);
  // 连接生命周期事件
  socketService.off('connected', handleSocketConnected);
  socketService.off('disconnected', handleSocketDisconnected);

  // 清理通话事件监听
  socketService.off('call:invited');
  socketService.off('call:connected');
  socketService.off('call:rejected');
  socketService.off('call:ended');
  socketService.off('call:failed');
  socketService.off('call:timeout');
  socketService.off('call:incoming', handleIncomingCall);
});

const decodeURIComponentSafe = val => {
  if (!val) return val;
  try {
    return decodeURIComponent(val);
  } catch {
    return val;
  }
};

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
      url: `${apiConfig.baseURL}/chat/history/${friendInfo.value.id}`,
      method: 'GET',
      data: { userId: currentUser.value.id, page: page.value, limit: 50 },
      header: { Authorization: `Bearer ${tokenManager.getAccessToken()}` },
    });

    if (response.data && response.data.success) {
      const messages = response.data.data.messages.map(msg => ({
        id: msg._id,
        content: msg.content,
        messageType: msg.messageType || 'text',
        timestamp: parseToMs(msg.createdAt),
        fromUserId: msg.fromUser?._id || msg.fromUser,
        toUserId: msg.toUser?._id || msg.toUser,
        originalFromUser: msg.fromUser,
        originalToUser: msg.toUser,
        status: msg.status,
        isRead: msg.isRead,
      }));
      console.log('加载的消息:', messages);
      // 检查每个消息的类型和内容
      messages.forEach((msg, index) => {
        console.log(`消息${index}:`, {
          id: msg.id,
          content: msg.content,
          messageType: msg.messageType,
          isImage: msg.messageType === 'image',
          isImageUrl: isImageUrl(msg.content),
        });
      });
      messageList.value = messages;
      nextTick(() => {
        if (messageList.value.length > 0) {
          setTimeout(() => scrollToBottom(), 300);
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

  // 优先使用Socket.IO实时发送
  if (socketService.getConnectionStatus().isConnected) {
    const messageData = {
      id: `temp_${Date.now()}`,
      fromUserId: currentUser.value.id,
      toUserId: friendInfo.value.id,
      content: message,
      messageType: 'text',
      timestamp: Date.now(),
      sending: true,
      failed: false,
    };

    messageList.value.push(messageData);
    inputMessage.value = '';
    nextTick(() => scrollToBottom());

    // 通过Socket.IO发送
    socketService.sendFriendMessage(friendInfo.value.id, message, 'text');

    return;
  }

  // 回退到HTTP请求
  const messageData = {
    id: `temp_${Date.now()}`,
    fromUserId: currentUser.value.id,
    toUserId: friendInfo.value.id,
    content: message,
    messageType: 'text',
    timestamp: Date.now(),
    sending: true,
    failed: false,
  };

  messageList.value.push(messageData);
  inputMessage.value = '';
  nextTick(() => scrollToBottom());

  try {
    const response = await uni.request({
      url: `${apiConfig.baseURL}/chat/send`,
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
        nextTick(() => scrollToBottom());
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

// 通过Socket.IO发送图片（实时版本）
const sendImageViaSocket = async () => {
  try {
    const choose = await new Promise((resolve, reject) => {
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: resolve,
        fail: reject,
      });
    });

    const filePath = choose.tempFilePaths && choose.tempFilePaths[0];
    if (!filePath) return;

    // 显示上传进度
    uni.showLoading({ title: '正在发送图片...' });

    // 压缩图片以提高传输速度
    const compressedPath = await compressImage(filePath);

    // 上传前刷新token
    try {
      if (tokenManager.shouldRefreshToken && tokenManager.shouldRefreshToken()) {
        await tokenManager.refreshAccessToken();
      }
    } catch (_e) {
      uni.hideLoading();
      uni.showToast({ title: '登录已过期，请重新登录', icon: 'none' });
      return;
    }

    // 上传图片到服务器
    const uploadRes = await uploadImageFile(compressedPath || filePath);

    if (!uploadRes.success) {
      throw new Error(uploadRes.message || '图片上传失败');
    }

    const relativePath = uploadRes.data.relative;

    // 先添加到本地消息列表（显示发送中状态）
    const tempId = `temp_img_${Date.now()}`;
    const tempMessage = {
      id: tempId,
      fromUserId: currentUser.value.id,
      toUserId: friendInfo.value.id,
      content: relativePath,
      messageType: 'image',
      timestamp: Date.now(),
      sending: true,
      failed: false,
      _base64: uploadRes.data.base64, // 备用显示
    };

    messageList.value.push(tempMessage);
    nextTick(() => scrollToBottom());
    uni.hideLoading();

    // 通过Socket.IO发送图片消息
    if (socketService.getConnectionStatus().isConnected) {
      socketService.sendFriendMessage(friendInfo.value.id, relativePath, 'image');
    } else {
      // 回退到HTTP发送
      await sendImageHttp(tempId, relativePath);
    }
  } catch (error) {
    uni.hideLoading();
    const msg = error?.errMsg || error?.message || '发送图片失败';
    if (!String(msg).includes('cancel')) {
      uni.showToast({ title: msg, icon: 'error', duration: 3000 });
    }
  }
};

// 图片压缩工具
const compressImage = filePath => {
  return new Promise((resolve, reject) => {
    uni.compressImage({
      src: filePath,
      quality: 80, // 压缩质量 0-100
      success: res => {
        console.log('✅ 图片压缩成功:', res.tempFilePath);
        resolve(res.tempFilePath);
      },
      fail: error => {
        console.log('⚠️ 图片压缩失败，使用原图:', error);
        resolve(null); // 压缩失败时返回null，使用原图
      },
    });
  });
};

// 上传图片文件
const uploadImageFile = filePath => {
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: `${apiConfig.baseURL}/chat-media/image`,
      filePath,
      name: 'image',
      header: {
        Authorization: `Bearer ${tokenManager.getAccessToken()}`,
      },
      success: uploadRes => {
        try {
          const body = typeof uploadRes.data === 'string' ? JSON.parse(uploadRes.data) : uploadRes.data;

          if (uploadRes.statusCode === 200 && body.success) {
            resolve(body);
          } else {
            reject(new Error(body.message || '上传失败'));
          }
        } catch (e) {
          reject(new Error('上传响应解析失败'));
        }
      },
      fail: error => {
        reject(error);
      },
    });
  });
};

// HTTP方式发送图片（回退方案）
const sendImageHttp = async (tempId, imageUrl) => {
  try {
    const response = await uni.request({
      url: `${apiConfig.baseURL}/chat/send`,
      method: 'POST',
      data: {
        fromUserId: currentUser.value.id,
        toUserId: friendInfo.value.id,
        content: imageUrl,
        messageType: 'image',
      },
      header: {
        Authorization: `Bearer ${tokenManager.getAccessToken()}`,
        'Content-Type': 'application/json',
      },
    });

    const idx = messageList.value.findIndex(m => m.id === tempId);
    if (idx >= 0) {
      if (response.data && response.data.success) {
        messageList.value[idx].id = response.data.data.messageId || tempId;
        messageList.value[idx].sending = false;
        messageList.value[idx].failed = false;
        messageList.value[idx].status = 'sent';
        nextTick(() => scrollToBottom());
      } else {
        messageList.value[idx].sending = false;
        messageList.value[idx].failed = true;
      }
    }
  } catch (error) {
    console.error('HTTP图片发送失败:', error);
    const idx = messageList.value.findIndex(m => m.id === tempId);
    if (idx >= 0) {
      messageList.value[idx].sending = false;
      messageList.value[idx].failed = true;
    }
  }
};

// 选择并发送图片（最小增量：上传到 /chat-media/image，再用 /chat/send 保存）
const sendImage = async () => {
  try {
    const choose = await new Promise((resolve, reject) => {
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: resolve,
        fail: reject,
      });
    });
    const filePath = choose.tempFilePaths && choose.tempFilePaths[0];
    if (!filePath) return;

    // 上传前：如接近过期，先刷新一次
    try {
      if (tokenManager.shouldRefreshToken && tokenManager.shouldRefreshToken()) {
        await tokenManager.refreshAccessToken();
      }
    } catch (_e) {
      uni.showToast({ title: '登录已过期，请重新登录', icon: 'none' });
      return;
    }

    uni.showLoading({ title: '上传中...' });

    const uploadOnce = token =>
      new Promise((resolve, reject) => {
        uni.uploadFile({
          url: `${apiConfig.baseURL}/chat-media/image`,
          filePath,
          name: 'image',
          header: { Authorization: `Bearer ${token}` },
          success: resolve,
          fail: reject,
        });
      });

    let token = tokenManager.getAccessToken();
    let uploadRes = await uploadOnce(token);

    // 如果401 unauthorized，尝试刷新token后重试一次
    if (uploadRes && uploadRes.statusCode === 401) {
      try {
        await tokenManager.refreshAccessToken();
        token = tokenManager.getAccessToken();
        uploadRes = await uploadOnce(token);
      } catch (_e) {}
    }

    uni.hideLoading();

    let body = {};
    try {
      body = typeof uploadRes.data === 'string' ? JSON.parse(uploadRes.data) : uploadRes.data;
    } catch (e) {}
    if (!uploadRes || uploadRes.statusCode !== 200 || !body?.success || !body?.data?.url) {
      throw new Error(body?.message || `上传失败(${uploadRes?.statusCode || 'NA'})`);
    }
    // 统一以相对路径写入数据库，前端渲染时再转绝对，避免出现 localhost 在移动端无法访问的问题
    let relativePath = body.data?.relative;
    if (!relativePath) {
      try {
        relativePath = new URL(body.data.url).pathname;
      } catch {
        relativePath = body.data.url;
      }
    }
    const imageUrl = relativePath; // 存库用相对路径

    // 先本地插入临时消息，同时保存base64作为备用
    const tempId = `temp_img_${Date.now()}`;
    const tempMessage = {
      id: tempId,
      fromUserId: currentUser.value.id,
      toUserId: friendInfo.value.id,
      content: imageUrl,
      messageType: 'image',
      timestamp: Date.now(),
      sending: true,
      failed: false,
      _base64: body.data?.base64, // 临时保存base64备用
    };
    messageList.value.push(tempMessage);
    nextTick(() => scrollToBottom());

    // 保存到数据库
    const save = await uni.request({
      url: `${apiConfig.baseURL}/chat/send`,
      method: 'POST',
      data: {
        fromUserId: currentUser.value.id,
        toUserId: friendInfo.value.id,
        content: imageUrl,
        messageType: 'image',
      },
      header: { Authorization: `Bearer ${tokenManager.getAccessToken()}`, 'Content-Type': 'application/json' },
    });
    const idx = messageList.value.findIndex(m => m.id === tempId);
    if (idx >= 0) {
      if (save.data && save.data.success) {
        messageList.value[idx].id = save.data.data.messageId || tempId;
        messageList.value[idx].sending = false;
        messageList.value[idx].failed = false;
        messageList.value[idx].status = 'sent';
        // 图片发送成功后确保滚动到底部
        nextTick(() => scrollToBottom());
      } else {
        messageList.value[idx].sending = false;
        messageList.value[idx].failed = true;
      }
    }
  } catch (err) {
    uni.hideLoading();
    const msg = err?.errMsg || err?.message || '发送失败';
    if (String(msg).includes('cancel')) return;
    uni.showToast({ title: msg, icon: 'none' });
  }
};

const previewImage = url => {
  if (!url) return;
  uni.previewImage({ urls: [url], current: url });
};

// 图片加载失败时显示占位并提示
const onImageError = message => {
  console.error('图片加载失败:', message.content, '转换后:', toAbsoluteUrl(message.content));

  // 如果有base64备用数据，尝试使用base64
  if (message._base64) {
    console.log('尝试使用base64备用数据');
    // 使用Vue的响应式更新
    const idx = messageList.value.findIndex(m => m.id === message.id);
    if (idx >= 0) {
      // 直接替换整个消息对象以触发响应式更新
      const updatedMessage = { ...messageList.value[idx] };
      updatedMessage.content = message._base64;
      updatedMessage._base64 = null;
      messageList.value.splice(idx, 1, updatedMessage);
      console.log('已切换到base64显示');
    }
    return;
  }

  uni.showToast({ title: '图片加载失败', icon: 'none' });
};

const loadMoreMessages = async () => {
  if (!hasMoreMessages.value) return;
  page.value++;
};

const scrollToBottom = () => {
  nextTick(() => {
    // 设置一个很大的滚动值，确保滚动到底部
    scrollTop.value = 999999;
    // 使用scrollIntoView滚动到底部锚点
    scrollIntoView.value = 'bottom-anchor';
    setTimeout(() => {
      scrollIntoView.value = '';
    }, 100);
  });
};

// 将多种时间格式解析为毫秒时间戳
const parseToMs = input => {
  if (!input) return 0;
  if (typeof input === 'number') return input;
  if (input instanceof Date) return input.getTime();
  // 处理 ISO、GMT 字符串等
  const ms = Date.parse(input);
  if (!Number.isNaN(ms)) return ms;
  try {
    return new Date(input).getTime() || 0;
  } catch (e) {
    return 0;
  }
};

const pad2 = n => String(n).padStart(2, '0');

const formatTime = timestamp => {
  const ms = parseToMs(timestamp);
  if (!ms) return '';
  const date = new Date(ms);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const hm = `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;

  if (startTarget >= startToday) {
    return hm; // 今天
  }
  if (startToday - startTarget < 24 * 60 * 60 * 1000) {
    return `昨天 ${hm}`;
  }
  const sameYear = date.getFullYear() === now.getFullYear();
  const md = `${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  return sameYear ? `${md} ${hm}` : `${date.getFullYear()}-${md} ${hm}`;
};

const goBack = () => {
  uni.navigateBack();
};

// 打开视频演示页面
const openVideoDemo = () => {
  console.log('🧪 点击了视频演示按钮');

  uni.showLoading({
    title: '正在打开演示页面...',
  });

  setTimeout(() => {
    uni.hideLoading();
    uni.navigateTo({
      url: '/pages/test/videoCallDemo',
      success: res => {
        console.log('✅ 页面跳转成功:', res);
      },
      fail: err => {
        console.error('❌ 页面跳转失败:', err);
        uni.showModal({
          title: '跳转失败',
          content: `错误信息: ${JSON.stringify(err)}`,
          showCancel: false,
          confirmText: '知道了',
        });
      },
    });
  }, 500);
};

const showFriendMenu = () => {
  uni.showActionSheet({
    itemList: ['查看好友信息', '清空聊天记录', '🧪 视频功能测试', '📱 快速测试摄像头'],
    success: res => {
      if (res.tapIndex === 0) {
        uni.navigateTo({ url: `/pages/profile/info?friendId=${friendInfo.value.id}` });
      } else if (res.tapIndex === 1) {
        clearChatHistory();
      } else if (res.tapIndex === 2) {
        openVideoDemo();
      } else if (res.tapIndex === 3) {
        quickCameraTest();
      }
    },
  });
};

// 快速摄像头测试
const quickCameraTest = () => {
  console.log('📱 快速摄像头测试');

  uni.showModal({
    title: '摄像头权限测试',
    content: '即将申请摄像头权限，测试设备是否正常工作',
    confirmText: '开始测试',
    cancelText: '取消',
    success: async res => {
      if (res.confirm) {
        try {
          // 检查摄像头权限
          const settings = await uni.getSetting();
          const hasCamera = settings.authSetting['scope.camera'];

          if (!hasCamera) {
            try {
              await uni.authorize({ scope: 'scope.camera' });
              uni.showToast({
                title: '✅ 摄像头权限获取成功！',
                icon: 'success',
              });
            } catch (error) {
              uni.showModal({
                title: '权限申请失败',
                content: '摄像头权限被拒绝，请在设置中手动开启',
                confirmText: '去设置',
                cancelText: '取消',
                success: settingRes => {
                  if (settingRes.confirm) {
                    uni.openSetting();
                  }
                },
              });
            }
          } else {
            uni.showToast({
              title: '✅ 摄像头权限已开启！',
              icon: 'success',
            });
          }
        } catch (error) {
          console.error('权限测试失败:', error);
          uni.showToast({
            title: '❌ 权限测试失败',
            icon: 'error',
          });
        }
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
      url: `${apiConfig.baseURL}/chat/conversation/${friendInfo.value.id}`,
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

// 初始化Socket连接
const initializeSocket = async () => {
  if (!friendInfo.value?.id) return;

  updateConnectionStatus('connecting', '连接中...');

  try {
    // 连接Socket.IO
    await socketService.connect();
    console.log('🚀 Socket.IO连接成功');

    // 加入好友聊天房间
    socketService.joinFriendChat(friendInfo.value.id);

    // 监听实时消息
    socketService.on('receiveFriendMessage', handleReceiveMessage);
    socketService.on('friendMessageSent', handleMessageSent);
    socketService.on('friendChatError', handleChatError);

    // 监听连接生命周期：重连后自动重入房间
    socketService.on('connected', handleSocketConnected);
    socketService.on('disconnected', handleSocketDisconnected);

    // 初始化通话事件监听
    handleCallEvents();

    updateConnectionStatus('connected', '实时聊天');

    // 3秒后隐藏连接状态
    setTimeout(() => {
      showConnectionStatus.value = false;
    }, 3000);

    console.log(`✅ 已加入与好友 ${friendInfo.value.id} 的聊天房间`);
  } catch (error) {
    console.error('❌ Socket初始化失败:', error);
    updateConnectionStatus('disconnected', '连接失败');

    uni.showToast({
      title: '实时功能初始化失败，使用普通模式',
      icon: 'none',
      duration: 3000,
    });

    // 5秒后隐藏错误状态
    setTimeout(() => {
      showConnectionStatus.value = false;
    }, 5000);
  }
};

// 更新连接状态
const updateConnectionStatus = (status, text) => {
  connectionStatus.value = status;
  connectionText.value = text;
  showConnectionStatus.value = true;
};

// 处理接收到的实时消息
const handleReceiveMessage = data => {
  console.log('📨 收到实时消息:', data);

  // 确保是当前聊天对象的消息
  if (data.fromUserId !== friendInfo.value.id) {
    return;
  }

  const newMessage = {
    id: data.id,
    content: data.content,
    messageType: data.messageType || 'text',
    timestamp: parseToMs(data.timestamp),
    fromUserId: data.fromUserId,
    toUserId: data.toUserId,
    status: 'received',
    isRead: false,
  };

  // 避免重复添加消息
  const existingIndex = messageList.value.findIndex(msg => msg.id === newMessage.id);
  if (existingIndex === -1) {
    messageList.value.push(newMessage);
    nextTick(() => {
      scrollToBottom();
      // 播放提示音（可选）
      // uni.playAudio({...})
    });
  }
};

// 处理消息发送确认
const handleMessageSent = data => {
  console.log('✅ 消息发送确认:', data);

  if (data.success && data.message) {
    // 更新本地临时消息状态
    const tempMsgIndex = messageList.value.findIndex(
      msg =>
        msg.content === data.message.content &&
        msg.timestamp &&
        Math.abs(msg.timestamp - parseToMs(data.message.timestamp)) < 5000
    );

    if (tempMsgIndex >= 0) {
      messageList.value[tempMsgIndex].id = data.message.id;
      messageList.value[tempMsgIndex].sending = false;
      messageList.value[tempMsgIndex].failed = false;
      messageList.value[tempMsgIndex].status = 'sent';
    }
  }
};

// 处理聊天错误
const handleChatError = error => {
  console.error('💬 聊天错误:', error);
  updateConnectionStatus('disconnected', '连接异常');

  uni.showToast({
    title: error.message || '聊天出现错误',
    icon: 'error',
    duration: 3000,
  });
};

// 重发失败的消息
const resendMessage = message => {
  if (!message.failed) return;

  // 重置消息状态
  message.failed = false;
  message.sending = true;

  // 根据消息类型重发
  if (message.messageType === 'image') {
    // 图片消息通过Socket.IO重发
    if (socketService.getConnectionStatus().isConnected) {
      socketService.sendFriendMessage(friendInfo.value.id, message.content, 'image');
    } else {
      sendImageHttp(message.id, message.content);
    }
  } else {
    // 文本消息重发
    if (socketService.getConnectionStatus().isConnected) {
      socketService.sendFriendMessage(friendInfo.value.id, message.content, 'text');
    } else {
      sendTextHttp(message);
    }
  }
};

// HTTP方式发送文本消息（重发用）
const sendTextHttp = async message => {
  try {
    const response = await uni.request({
      url: `${apiConfig.baseURL}/chat/send`,
      method: 'POST',
      data: {
        fromUserId: currentUser.value.id,
        toUserId: friendInfo.value.id,
        content: message.content,
        messageType: 'text',
      },
      header: {
        Authorization: `Bearer ${tokenManager.getAccessToken()}`,
        'Content-Type': 'application/json',
      },
    });

    const msgIndex = messageList.value.findIndex(msg => msg.id === message.id);
    if (msgIndex >= 0) {
      if (response.data && response.data.success) {
        messageList.value[msgIndex].sending = false;
        messageList.value[msgIndex].failed = false;
        messageList.value[msgIndex].status = 'sent';
      } else {
        messageList.value[msgIndex].sending = false;
        messageList.value[msgIndex].failed = true;
      }
    }
  } catch (error) {
    const msgIndex = messageList.value.findIndex(msg => msg.id === message.id);
    if (msgIndex >= 0) {
      messageList.value[msgIndex].sending = false;
      messageList.value[msgIndex].failed = true;
    }
  }
};

const showAddMenu = () => {
  uni.showActionSheet({
    itemList: ['图片', '文件', '位置'],
    success: res => {
      const actions = ['选择图片', '选择文件', '发送位置'];
      if (res.tapIndex === 0) {
        sendImageViaSocket();
      } else {
        uni.showToast({ title: `${actions[res.tapIndex]}功能开发中`, icon: 'none' });
      }
    },
  });
};

// ==================== 视频通话功能 ====================

// 生成通话ID
const generateCallId = () => {
  return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// 检查媒体权限
const checkMediaPermissions = async () => {
  try {
    const settings = await uni.getSetting();
    const hasCamera = settings.authSetting['scope.camera'];
    const hasMicrophone = settings.authSetting['scope.record'];

    mediaPermissions.value.camera = hasCamera;
    mediaPermissions.value.microphone = hasMicrophone;

    return hasCamera && hasMicrophone;
  } catch (error) {
    console.error('检查权限失败:', error);
    return false;
  }
};

// 申请媒体权限
const requestMediaPermissions = async () => {
  try {
    await uni.authorize({ scope: 'scope.camera' });
    await uni.authorize({ scope: 'scope.record' });

    mediaPermissions.value.camera = true;
    mediaPermissions.value.microphone = true;

    return true;
  } catch (error) {
    console.error('权限申请失败:', error);

    uni.showModal({
      title: '需要权限',
      content: '视频通话需要访问摄像头和麦克风，请在设置中开启',
      showCancel: false,
      confirmText: '去设置',
      success: () => {
        uni.openSetting();
      },
    });

    return false;
  }
};

// 发起音频通话
const initiateAudioCall = async () => {
  try {
    console.log('📞 发起音频通话给:', friendInfo.value.nickname);

    // 检查网络连接（不依赖Socket）
    try {
      const networkType = await uni.getNetworkType();
      if (networkType.networkType === 'none') {
        uni.showToast({
          title: '请检查网络连接',
          icon: 'error',
        });
        return;
      }
    } catch (error) {
      console.log('网络检查失败，继续尝试通话');
    }

    // 生成通话ID
    const callId = generateCallId();
    const roomId = Date.now() % 1000000;

    // 直接跳转到通话页面，权限在通话页面内处理
    const friendInfoStr = encodeURIComponent(
      JSON.stringify({
        id: friendInfo.value.id,
        nickname: friendInfo.value.nickname,
        avatar: friendInfo.value.avatar,
      })
    );

    uni.navigateTo({
      url: `/pages/video/call?callId=${callId}&callType=audio&roomId=${roomId}&friendInfo=${friendInfoStr}&isInitiator=true`,
    });

    // 发送通话邀请
    socketService.emit('call:invite', {
      targetUserId: friendInfo.value.id,
      callType: 'audio',
      callId: callId,
      roomId: roomId,
    });

    console.log('📤 音频通话邀请已发送:', { callId, roomId });
  } catch (error) {
    console.error('发起音频通话失败:', error);
    uni.showToast({
      title: '无法发起通话',
      icon: 'error',
    });
  }
};

// 发起视频通话
const initiateVideoCall = async () => {
  try {
    console.log('🎥 发起视频通话给:', friendInfo.value.nickname);

    // 检查网络连接（不依赖Socket）
    try {
      const networkType = await uni.getNetworkType();
      if (networkType.networkType === 'none') {
        uni.showToast({
          title: '请检查网络连接',
          icon: 'error',
        });
        return;
      }
    } catch (error) {
      console.log('网络检查失败，继续尝试通话');
    }

    // 生成通话ID
    const callId = generateCallId();
    const roomId = Date.now() % 1000000; // 简单的房间ID生成

    // 更新通话状态
    callState.value = {
      isInCall: true,
      callType: 'video',
      callStatus: 'calling',
      callId: callId,
      startTime: Date.now(),
      duration: 0,
      showCallModal: true,
    };

    // 直接跳转到通话页面，权限在通话页面内处理
    const friendInfoStr = encodeURIComponent(
      JSON.stringify({
        id: friendInfo.value.id,
        nickname: friendInfo.value.nickname,
        avatar: friendInfo.value.avatar,
      })
    );

    uni.navigateTo({
      url: `/pages/video/call?callId=${callId}&callType=video&roomId=${roomId}&friendInfo=${friendInfoStr}&isInitiator=true`,
    });

    // 发送通话邀请
    socketService.emit('call:invite', {
      targetUserId: friendInfo.value.id,
      callType: 'video',
      callId: callId,
      roomId: roomId,
    });

    console.log('📤 通话邀请已发送:', { callId, roomId });
  } catch (error) {
    console.error('发起通话失败:', error);
    uni.showToast({
      title: '无法发起通话',
      icon: 'error',
    });
    resetCallState();
  }
};

// 显示通话模态框
const showCallModal = () => {
  const statusText = getCallStatusText();

  uni.showModal({
    title: friendInfo.value.nickname,
    content: statusText,
    showCancel: true,
    confirmText: '挂断',
    cancelText: '最小化',
    success: res => {
      if (res.confirm) {
        endCall();
      } else {
        // 最小化通话（后续可以实现悬浮窗）
        callState.value.showCallModal = false;
      }
    },
  });
};

// 获取通话状态文本
const getCallStatusText = () => {
  const statusMap = {
    calling: '正在呼叫...',
    ringing: '对方响铃中...',
    connecting: '正在连接...',
    connected: '通话中',
    reconnecting: '重新连接...',
  };
  return statusMap[callState.value.callStatus] || '';
};

// 处理来电
const handleIncomingCall = data => {
  console.log('📞 收到来电:', data);

  const { callId, callType, from, caller, roomId } = data;

  // 如果已在通话中，自动拒绝
  if (callState.value.isInCall) {
    socketService.emit('call:reject', {
      callId,
      reason: 'BUSY',
    });
    return;
  }

  // 更新通话状态
  callState.value = {
    isInCall: true,
    callType: callType,
    callStatus: 'ringing',
    callId: callId,
    startTime: null,
    duration: 0,
    showCallModal: true,
  };

  // 显示来电界面
  uni.showModal({
    title: `${caller.nickname}`,
    content: callType === 'video' ? '邀请您进行视频通话' : '邀请您进行语音通话',
    showCancel: true,
    confirmText: '接听',
    cancelText: '拒绝',
    success: async res => {
      if (res.confirm) {
        // 接听通话，跳转到视频通话页面
        const friendInfoStr = encodeURIComponent(
          JSON.stringify({
            id: from,
            nickname: caller.nickname,
            avatar: caller.avatar,
          })
        );

        uni.navigateTo({
          url: `/pages/video/call?callId=${callId}&callType=${callType}&roomId=${roomId}&friendInfo=${friendInfoStr}&isInitiator=false`,
        });

        // 发送接听确认
        socketService.emit('call:accept', { callId });
      } else {
        rejectCall(callId);
      }
    },
  });
};

// 接听通话
const acceptCall = async callId => {
  try {
    console.log('✅ 接听通话:', callId);

    // 检查权限
    const hasPermissions = await checkMediaPermissions();
    if (!hasPermissions) {
      const granted = await requestMediaPermissions();
      if (!granted) {
        rejectCall(callId);
        return;
      }
    }

    // 发送接听信号
    socketService.emit('call:accept', { callId });

    // 更新状态
    callState.value.callStatus = 'connecting';
    callState.value.startTime = Date.now();

    uni.showToast({
      title: '通话已接通',
      icon: 'success',
    });
  } catch (error) {
    console.error('接听通话失败:', error);
    rejectCall(callId);
  }
};

// 拒绝通话
const rejectCall = callId => {
  console.log('❌ 拒绝通话:', callId);

  socketService.emit('call:reject', {
    callId,
    reason: 'REJECTED',
  });

  resetCallState();

  uni.showToast({
    title: '已拒绝通话',
    icon: 'none',
  });
};

// 结束通话
const endCall = () => {
  console.log('📞 结束通话:', callState.value.callId);

  if (callState.value.callId) {
    socketService.emit('call:end', {
      callId: callState.value.callId,
      reason: 'USER_ENDED',
    });
  }

  resetCallState();

  uni.showToast({
    title: '通话结束',
    icon: 'success',
  });
};

// 重置通话状态
const resetCallState = () => {
  callState.value = {
    isInCall: false,
    callType: null,
    callStatus: 'idle',
    callId: null,
    startTime: null,
    duration: 0,
    showCallModal: false,
  };
};

// 处理通话事件
const handleCallEvents = () => {
  // 通话邀请确认
  socketService.on('call:invited', data => {
    console.log('📤 通话邀请已发送:', data);
  });

  // 通话连接成功
  socketService.on('call:connected', data => {
    console.log('🎉 通话连接成功:', data);
    callState.value.callStatus = 'connected';
    callState.value.startTime = data.startTime;
  });

  // 通话被拒绝
  socketService.on('call:rejected', data => {
    console.log('❌ 通话被拒绝:', data);
    uni.showToast({
      title: '对方拒绝了通话',
      icon: 'none',
    });
    resetCallState();
  });

  // 通话结束
  socketService.on('call:ended', data => {
    console.log('📞 通话已结束:', data);
    const reason = data.reason === 'USER_DISCONNECTED' ? '对方已断开连接' : '通话结束';
    uni.showToast({
      title: reason,
      icon: 'none',
    });
    resetCallState();
  });

  // 通话失败
  socketService.on('call:failed', data => {
    console.log('❌ 通话失败:', data);
    uni.showToast({
      title: data.message || '通话失败',
      icon: 'error',
    });
    resetCallState();
  });

  // 通话超时
  socketService.on('call:timeout', data => {
    console.log('⏰ 通话超时:', data);
    uni.showToast({
      title: '对方未接听',
      icon: 'none',
    });
    resetCallState();
  });

  // 来电
  socketService.on('call:incoming', handleIncomingCall);
};

// 连接恢复/断开处理
const handleSocketConnected = () => {
  updateConnectionStatus('connected', '实时聊天');
  if (friendInfo.value?.id) {
    socketService.joinFriendChat(friendInfo.value.id);
  }
};
const handleSocketDisconnected = () => {
  updateConnectionStatus('connecting', '重连中...');
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

.navbar-left {
  width: 80rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.navbar-right {
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8rpx;
  min-width: 200rpx;
  padding-right: 10rpx;
}

.back-icon,
.menu-icon {
  font-size: 32rpx;
  font-weight: 600;
  color: #374151;
}

.video-call-btn,
.audio-call-btn,
.test-video-btn {
  width: 70rpx;
  height: 70rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(59, 130, 246, 0.2);
  border: 2rpx solid #3b82f6;
  transition: all 0.2s ease;
  margin-right: 8rpx;
}

.video-call-btn:active,
.audio-call-btn:active {
  background: rgba(59, 130, 246, 0.3);
  transform: scale(0.95);
}

.audio-call-btn {
  background: rgba(34, 197, 94, 0.2);
  border-color: #22c55e;
}

.audio-call-btn:active {
  background: rgba(34, 197, 94, 0.3);
}

.test-video-btn {
  background: rgba(168, 85, 247, 0.2);
  border-color: #a855f7;
}

.test-video-btn:active {
  background: rgba(168, 85, 247, 0.3);
}

.call-icon,
.test-icon {
  font-size: 32rpx;
  font-weight: bold;
}

.video-call-btn .call-icon {
  color: #3b82f6;
}

.audio-call-btn .call-icon {
  color: #22c55e;
}

.test-video-btn .test-icon {
  color: #a855f7;
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

/* 连接状态指示器 */
.connection-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  margin-top: 4rpx;
  animation: fadeInUp 0.3s ease-out;
}

.status-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.status-dot.connected {
  background-color: #10b981;
}

.status-dot.connecting {
  background-color: #f59e0b;
  animation: blink 1s infinite;
}

.status-dot.disconnected {
  background-color: #ef4444;
}

.status-text {
  font-size: 20rpx;
  color: #6b7280;
  font-weight: 400;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@keyframes blink {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0.3;
  }
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
.status-failed,
.status-sent {
  font-size: 20rpx;
  color: #b0b0b0;
  display: flex;
  align-items: center;
  gap: 4rpx;
  cursor: pointer;
  user-select: none;
}

.status-failed {
  color: #ff4d4f;
}

.status-failed:active {
  transform: scale(0.95);
}

.status-sent {
  color: #10b981;
}

/* 加载动画 */
.loading-spinner {
  width: 16rpx;
  height: 16rpx;
  border: 2rpx solid #b0b0b0;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.retry-icon {
  font-size: 18rpx;
  font-weight: bold;
  color: #ff4d4f;
  animation: rotate 2s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes rotate {
  0%,
  90% {
    transform: rotate(0deg);
  }
  95%,
  100% {
    transform: rotate(360deg);
  }
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
  z-index: 1001;
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

/* 删除自定义Tabbar样式 */
/* 图片消息样式（保持最小增量） */
.message-image {
  width: 100%;
  max-width: 420rpx;
  border-radius: 8rpx;
  min-height: 100rpx;
  background-color: #f0f0f0;
  display: block;
  object-fit: cover;
}
.message-image {
  display: block;
}
</style>
