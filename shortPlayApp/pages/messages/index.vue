<template>
  <view class="messages-page">
    <u-navbar
      :title="'消息'"
      :fixed="true"
      :placeholder="true"
      :safeAreaInsetTop="true"
      bgColor="#ffffff"
      titleStyle="font-weight:700;color:#111827"
      :autoBack="false"
      leftIcon=""
      leftText=""
    >
      <!-- 右侧按钮组 -->
      <template #right>
        <view class="navbar-right">
          <view class="nav-button" @click="openFriendsList">
            <u-icon name="account" size="20" color="#666666"></u-icon>
            <text class="nav-text">好友</text>
          </view>
          <view class="nav-button" @click="openAiChat">
            <u-icon name="chat" size="20" color="#666666"></u-icon>
            <text class="nav-text">AI客服</text>
          </view>
        </view>
      </template>
    </u-navbar>

    <!-- 消息列表容器 -->
    <view class="message-list-container" @scroll="onScroll" :scroll-top="scrollTop">
      <view v-if="loading" class="loading-state">
        <view class="loading-spinner">
          <view class="spinner-ring"></view>
        </view>
        <text class="loading-text">加载中...</text>
      </view>

      <view v-else-if="messageList.length === 0" class="empty-state">
        <view class="empty-icon">
          <view class="empty-message">
            <view class="message-bubble">
              <view class="bubble-dot"></view>
              <view class="bubble-dot"></view>
              <view class="bubble-dot"></view>
            </view>
          </view>
        </view>
        <view class="empty-text">暂无消息</view>
        <view class="empty-desc">快去和好友聊天吧</view>
      </view>

      <!-- 消息列表 -->
      <view v-else class="virtual-list">
        <!-- 占位容器，用于撑开滚动高度 -->
        <view class="virtual-placeholder" :style="{ height: totalHeight + 'rpx' }"></view>

        <!-- 可视区域容器 -->
        <view class="virtual-viewport" :style="{ transform: `translateY(${offsetY}rpx)` }">
          <view
            v-for="(item, index) in visibleMessages"
            :key="item.id"
            class="swipe-container"
            :class="{ removing: item.isRemoving, 'show-actions': (item.swipeX || 0) < 0 }"
            @touchstart="onTouchStart($event, item)"
            @touchmove="onTouchMove($event, item)"
            @touchend="onTouchEnd($event, item)"
          >
            <!-- 右滑操作按钮 -->
            <view class="swipe-actions">
              <view class="action-btn mark-unread" @click="markAsUnread(item)">
                <text class="action-text">标为未读</text>
              </view>
              <view class="action-btn hide-btn" @click="hideConversation(item)">
                <text class="action-text">不显示</text>
              </view>
              <view class="action-btn delete-btn" @click="deleteConversation(item)">
                <text class="action-text">删除</text>
              </view>
            </view>

            <!-- 消息内容 -->
            <view
              class="message-item"
              :class="{ unread: item.unreadCount > 0 || item.markedAsUnread }"
              :style="{ transform: `translateX(${item.swipeX || 0}px)` }"
              @click="openChat(item)"
            >
              <view class="message-content">
                <!-- 头像区域 -->
                <view class="avatar-container">
                  <image :src="item.avatar" class="avatar" mode="aspectFill" />
                  <!-- 未读消息提示 -->
                  <view v-if="item.unreadCount > 0" class="unread-badge">
                    <text class="unread-count">{{ item.unreadCount }}</text>
                  </view>
                  <!-- 标为未读的小红点 -->
                  <view v-if="item.markedAsUnread" class="mark-unread-dot">
                    <text class="mark-unread-count">{{ item.markUnreadCount || 1 }}</text>
                  </view>
                </view>

                <!-- 消息信息 -->
                <view class="message-info">
                  <view class="message-header">
                    <text class="nickname">{{ item.nickname }}</text>
                    <text class="time">{{ item.time }}</text>
                  </view>
                  <view class="message-preview">
                    <text class="preview-text">{{ item.lastMessage }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue';
import { onLoad, onShow, onPullDownRefresh } from '@dcloudio/uni-app';
import { io } from 'socket.io-client';
import authService from '@/utils/authService';
import { getApiConfig } from '@/config/index.js';
import tokenManager from '@/utils/tokenManager.js';

const apiConfig = getApiConfig();

// 响应式数据
const messageList = ref([]);
const loading = ref(false);
const currentUser = ref(null);
const socket = ref(null);
const socketConnected = ref(false);
const scrollTop = ref(0);

// 虚拟列表相关
const itemHeight = ref(150); // 每个消息项的高度(rpx)
const containerHeight = ref(0); // 容器高度
const visibleCount = ref(0); // 可视区域显示的项目数量
const bufferSize = ref(3); // 缓冲区大小

// 滑动相关
const swipeStartX = ref(0);
const swipeThreshold = ref(60); // 滑动触发阈值
const isSwiping = ref(false);
const currentSwipedItem = ref(null);

// 计算属性
const totalHeight = computed(() => {
  return messageList.value.length * itemHeight.value;
});

const startIndex = computed(() => {
  const index = Math.floor(scrollTop.value / itemHeight.value);
  return Math.max(0, index - bufferSize.value);
});

const endIndex = computed(() => {
  const index = startIndex.value + visibleCount.value + bufferSize.value * 2;
  return Math.min(messageList.value.length, index);
});

const visibleMessages = computed(() => {
  return messageList.value.slice(startIndex.value, endIndex.value);
});

const offsetY = computed(() => {
  return startIndex.value * itemHeight.value;
});

// 滚动事件处理
const onScroll = e => {
  scrollTop.value = e.detail.scrollTop;
};

// 刷新数据
const refreshData = () => {
  scrollTop.value = 0;
  loadConversations();
  uni.stopPullDownRefresh();
};

// 初始化虚拟列表
const initVirtualList = () => {
  // 获取系统信息计算容器高度
  const systemInfo = uni.getSystemInfoSync();
  // 减去导航栏高度，大约120rpx
  containerHeight.value = (systemInfo.windowHeight * 750) / systemInfo.windowWidth - 120;
  // 计算可视区域能显示的项目数量
  visibleCount.value = Math.ceil(containerHeight.value / itemHeight.value) + 1;
};

// 加载聊天会话列表
const loadConversations = async () => {
  const userIdGuard = currentUser.value && (currentUser.value.id || currentUser.value._id);
  if (!userIdGuard) {
    messageList.value = [];
    return;
  }

  loading.value = true;
  try {
    const response = await uni.request({
      url: `${apiConfig.baseURL}/chat/conversations`,
      method: 'GET',
      data: {
        userId: currentUser.value.id || currentUser.value._id,
      },
      header: {
        Authorization: `Bearer ${tokenManager.getAccessToken() || ''}`,
      },
    });

    console.log('[messages] conversations status=', response.statusCode, 'data=', response.data);

    if (response.data && response.data.success) {
      // 格式化会话数据为消息列表格式
      messageList.value = response.data.data.conversations.map(conv => ({
        id: conv.friendId,
        friendId: conv.friendId,
        nickname: conv.friendInfo?.nickname || '好友',
        avatar: conv.friendInfo?.avatar || '/static/img/default-avatar.png',
        lastMessage: conv.lastMessage
          ? conv.lastMessage.fromSelf
            ? `我: ${getPreviewText(conv.lastMessage?.messageType, conv.lastMessage?.content)}`
            : getPreviewText(conv.lastMessage?.messageType, conv.lastMessage?.content)
          : '暂无消息',
        time: formatTime(conv.lastMessage?.timestamp || conv.lastMessage?.createdAt),
        unreadCount: conv.unreadCount,
        lastInteractionAt: conv.lastInteractionAt,
      }));

      console.log(`加载了 ${messageList.value.length} 个聊天会话`);

      // 如果没有任何会话，回退到好友列表，展示为占位会话
      if (!messageList.value.length) {
        await loadFriendsAsConversations();
      }
    } else {
      const msg = response.data?.message || '加载失败';
      console.warn('[messages] conversations api failed:', msg);
      uni.showToast({ title: msg, icon: 'none' });
      // 健康检查，帮助定位网络/后端问题
      checkBackendHealth();
    }
  } catch (error) {
    console.error('加载聊天会话失败:', error);
    const errMsg = (error && (error.errMsg || error.message)) || '网络错误';
    uni.showToast({ title: `会话加载失败：${errMsg}`.slice(0, 18), icon: 'none' });
    // 如果后端连接失败，显示提示
    if (messageList.value.length === 0) {
      uni.showToast({
        title: '暂无聊天记录',
        icon: 'none',
      });
    }
    // 进一步检测后端健康状况
    checkBackendHealth();
  } finally {
    loading.value = false;
  }
};

// 回退：将好友列表作为会话展示（无最后消息时显示"暂无消息"）
const loadFriendsAsConversations = async () => {
  try {
    const userId = currentUser.value?.id || currentUser.value?._id;
    if (!userId) return;
    const res = await uni.request({
      url: `${apiConfig.baseURL}/friends/list/${userId}`,
      method: 'GET',
      header: { Authorization: `Bearer ${tokenManager.getAccessToken() || ''}` },
    });
    console.log('[messages] friends fallback status=', res.statusCode, 'data=', res.data);
    if (res.statusCode === 200 && res.data?.success) {
      const friends = res.data.data?.friends || [];
      messageList.value = friends.map(item => ({
        id: item.friendInfo?._id || item.friendInfo?.id,
        friendId: item.friendInfo?._id || item.friendInfo?.id,
        nickname: item.remarkName || item.friendInfo?.nickname || '好友',
        avatar: item.friendInfo?.avatar || '/static/img/default-avatar.png',
        lastMessage: '暂无消息',
        time: formatTime(item.lastInteractionAt),
        unreadCount: 0,
        lastInteractionAt: item.lastInteractionAt,
      }));
    }
  } catch (e) {
    console.warn('[messages] loadFriendsAsConversations failed:', e?.message || e);
  }
};

// 后端健康检查（调试用）
const checkBackendHealth = async () => {
  try {
    const health = await uni.request({ url: `${apiConfig.baseURL.replace(/\/$/, '')}/health`, method: 'GET' });
    console.log('[messages] health:', health.statusCode, health.data);
  } catch (e) {
    console.warn('[messages] health request failed:', e?.message || e);
  }
};

// 建立 Socket 连接并监听消息
const setupSocket = () => {
  if (!currentUser.value) return;
  const userId = currentUser.value.id || currentUser.value._id;
  if (!userId || !tokenManager.getAccessToken()) return;

  // 服务器根地址（去掉 /api）
  const socketURL = apiConfig.baseURL.replace(/\/api$/, '');

  try {
    if (socket.value) {
      socket.value.disconnect();
      socket.value = null;
    }

    socket.value = io(socketURL, {
      transports: ['websocket', 'polling'],
      query: { userId },
      auth: { userId, token: tokenManager.getAccessToken() || '' },
      timeout: 20000,
    });

    // 调试：连接错误与重连日志
    socket.value.on('connect_error', err => {
      console.error('[messages] socket connect_error:', err?.message || err);
      uni.showToast({ title: '聊天连接异常', icon: 'none' });
    });
    socket.value.on('error', err => {
      console.error('[messages] socket error:', err?.message || err);
    });
    if (socket.value.io) {
      socket.value.io.on('reconnect_attempt', n => {
        console.log('[messages] socket reconnect_attempt:', n);
      });
      socket.value.io.on('reconnect', n => {
        console.log('[messages] socket reconnect success after tries:', n);
      });
      socket.value.io.on('reconnect_error', err => {
        console.warn('[messages] socket reconnect_error:', err?.message || err);
      });
    }

    socket.value.on('connect', () => {
      socketConnected.value = true;
    });

    socket.value.on('disconnect', () => {
      socketConnected.value = false;
    });

    // 收到好友发来的消息
    socket.value.on('receiveFriendMessage', msg => {
      handleIncomingMessage(msg);
    });

    // 我方发送成功，也更新到列表顶端
    socket.value.on('friendMessageSent', ({ message }) => {
      handleIncomingMessage(message, true);
    });
  } catch (e) {
    console.error('Socket连接失败:', e);
  }
};

const teardownSocket = () => {
  try {
    if (socket.value) {
      socket.value.disconnect();
      socket.value = null;
    }
  } catch (e) {}
  socketConnected.value = false;
};

// 处理进入的消息，更新/插入会话到顶部
const handleIncomingMessage = (message, fromSelf = false) => {
  if (!message) return;
  const userId = currentUser.value?.id || currentUser.value?._id;
  const friendId = message.fromUserId?.toString() === userId?.toString() ? message.toUserId : message.fromUserId;

  const nickname = message.sender?.nickname || '好友';
  const avatar = message.sender?.avatar || '/static/img/default-avatar.png';
  const time = formatTime(message.timestamp);
  const preview = getPreviewText(message.messageType, message.content);

  const idx = messageList.value.findIndex(x => x.friendId?.toString() === friendId?.toString());
  if (idx >= 0) {
    const conv = messageList.value[idx];
    conv.lastMessage = fromSelf ? `我: ${preview}` : preview;
    conv.time = time;
    conv.unreadCount = fromSelf ? conv.unreadCount : (conv.unreadCount || 0) + 1;
    // 移到顶部
    messageList.value.splice(idx, 1);
    messageList.value.unshift(conv);
  } else {
    messageList.value.unshift({
      id: friendId,
      friendId: friendId,
      nickname,
      avatar,
      lastMessage: fromSelf ? `我: ${preview}` : preview,
      time,
      unreadCount: fromSelf ? 0 : 1,
      lastInteractionAt: Date.now(),
    });
  }
};

// 预览文案
const getPreviewText = (type, content) => {
  const text = (content || '').toString();
  const map = {
    image: '[图片]',
    video: '[视频]',
    audio: '[语音]',
    voice: '[语音]',
    file: '[文件]',
    location: '[位置]',
    system: '[系统消息]',
  };
  if (!type || type === 'text') {
    return truncateText(text, 36);
  }
  return map[type] || '[消息]';
};

const truncateText = (s, maxLen = 36) => {
  if (!s) return '';
  return s.length > maxLen ? s.slice(0, maxLen) + '…' : s;
};

// 打开聊天页面 - 跳转到真实聊天页面
const openChat = item => {
  // 先关闭所有滑动状态
  messageList.value.forEach(msg => {
    msg.swipeX = 0;
  });

  // 清除未读数和标记未读状态（本地显示）
  item.unreadCount = 0;
  item.markedAsUnread = false;
  item.markUnreadCount = 0;

  // 跳转到好友聊天页面
  uni.navigateTo({
    url: `/pages/chat/friendChatClean?friendId=${item.friendId}&friendName=${encodeURIComponent(item.nickname)}&friendAvatar=${encodeURIComponent(item.avatar)}`,
  });
};

// 返回上一页
const goBack = () => {
  uni.navigateBack({ delta: 1 });
};

// 打开 AI 客服聊天页面
const openAiChat = () => {
  uni.navigateTo({
    url: '/pages/chat/chatAi',
  });
};

// 打开好友列表页面
const openFriendsList = () => {
  uni.navigateTo({
    url: '/pages/messages/friendList',
  });
};

// 格式化时间显示
const formatTime = timestamp => {
  if (!timestamp) return '';
  try {
    let ms = 0;
    if (typeof timestamp === 'number') {
      ms = timestamp > 1e12 ? timestamp : timestamp * 1000;
    } else if (typeof timestamp === 'string') {
      // 先尝试按ISO解析
      const parsed = Date.parse(timestamp);
      if (!Number.isNaN(parsed)) {
        ms = parsed;
      } else if (/^\d+$/.test(timestamp)) {
        const num = Number(timestamp);
        ms = num > 1e12 ? num : num * 1000;
      }
    } else if (timestamp instanceof Date) {
      ms = timestamp.getTime();
    }
    if (!ms) return '';

    const time = new Date(ms);
    const now = new Date();

    const pad = n => n.toString().padStart(2, '0');
    const sameDay = time.toDateString() === now.toDateString();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTarget = new Date(time.getFullYear(), time.getMonth(), time.getDate());
    const dayDiff = Math.floor((startOfToday - startOfTarget) / 86400000);

    const diff = now - time;
    if (diff < 60 * 1000) return '刚刚';
    if (sameDay) return `${pad(time.getHours())}:${pad(time.getMinutes())}`;
    if (dayDiff === 1) return '昨天';
    if (now.getFullYear() === time.getFullYear()) {
      return `${pad(time.getMonth() + 1)}-${pad(time.getDate())}`;
    }
    return `${time.getFullYear()}-${pad(time.getMonth() + 1)}-${pad(time.getDate())}`;
  } catch (_e) {
    return '';
  }
};

// 标记为未读
const markAsUnread = async item => {
  // 先关闭滑动状态
  item.swipeX = 0;

  // 立即显示标记未读的小红点
  item.markedAsUnread = true;
  item.markUnreadCount = (item.markUnreadCount || 0) + 1;
  uni.showToast({ title: '已标记为未读', icon: 'none' });

  try {
    const userId = currentUser.value?.id || currentUser.value?._id;
    if (!userId) return;

    const response = await uni.request({
      url: `${apiConfig.baseURL}/chat/conversations/${item.friendId}/mark-unread`,
      method: 'PUT',
      data: { userId },
      header: {
        Authorization: `Bearer ${tokenManager.getAccessToken() || ''}`,
      },
    });

    console.log('[messages] mark as unread status=', response.statusCode, 'data=', response.data);

    if (response.statusCode !== 200 || !response.data?.success) {
      // 如果API失败，恢复原状态
      item.markedAsUnread = false;
      item.markUnreadCount = Math.max(0, (item.markUnreadCount || 1) - 1);
      const msg = response.data?.message || '标记失败';
      console.warn('[messages] mark as unread api failed:', msg);
      uni.showToast({ title: msg, icon: 'none' });
    }
  } catch (error) {
    // 如果网络错误，恢复原状态
    item.markedAsUnread = false;
    item.markUnreadCount = Math.max(0, (item.markUnreadCount || 1) - 1);
    console.error('标记为未读失败:', error);
    const errMsg = (error && (error.errMsg || error.message)) || '网络错误';
    uni.showToast({ title: `标记未读失败：${errMsg}`.slice(0, 18), icon: 'none' });
  }
};

// 隐藏会话
const hideConversation = async item => {
  // 先关闭滑动状态
  item.swipeX = 0;

  // 添加移除动画类
  item.isRemoving = true;

  // 等待动画完成后再从列表中移除
  setTimeout(() => {
    const index = messageList.value.findIndex(msg => msg.id === item.id);
    if (index !== -1) {
      messageList.value.splice(index, 1);
      uni.showToast({ title: '已隐藏', icon: 'none' });
    }
  }, 300); // 与CSS动画时间一致

  try {
    const userId = currentUser.value?.id || currentUser.value?._id;
    if (!userId) return;

    const response = await uni.request({
      url: `${apiConfig.baseURL}/chat/conversations/${item.friendId}/hide`,
      method: 'PUT',
      data: { userId },
      header: {
        Authorization: `Bearer ${tokenManager.getAccessToken() || ''}`,
      },
    });

    console.log('[messages] hide conversation status=', response.statusCode, 'data=', response.data);

    if (response.statusCode !== 200 || !response.data?.success) {
      // 如果API失败，取消动画并恢复状态
      item.isRemoving = false;
      const msg = response.data?.message || '隐藏失败';
      console.warn('[messages] hide conversation api failed:', msg);
      uni.showToast({ title: msg, icon: 'none' });
    }
  } catch (error) {
    // 如果网络错误，取消动画并恢复状态
    item.isRemoving = false;
    console.error('隐藏会话失败:', error);
    const errMsg = (error && (error.errMsg || error.message)) || '网络错误';
    uni.showToast({ title: `隐藏失败：${errMsg}`.slice(0, 18), icon: 'none' });
  }
};

// 删除会话
const deleteConversation = item => {
  // 先关闭滑动状态
  item.swipeX = 0;

  uni.showActionSheet({
    itemList: ['删除并清空记录', '取消'],
    itemColor: '#FF4757',
    success: res => {
      if (res.tapIndex === 0) {
        confirmDeleteConversation(item);
      }
    },
  });
};

// 确认删除并清空聊天记录
const confirmDeleteConversation = async item => {
  try {
    const userId = currentUser.value?.id || currentUser.value?._id;
    if (!userId) return;

    // 显示加载提示
    uni.showLoading({ title: '删除中...' });

    const response = await uni.request({
      url: `${apiConfig.baseURL}/chat/conversations/${item.friendId}/clear`,
      method: 'DELETE',
      data: {
        userId: userId,
      },
      header: {
        Authorization: `Bearer ${tokenManager.getAccessToken() || ''}`,
      },
    });

    uni.hideLoading();
    console.log('[messages] clear conversation status=', response.statusCode, 'data=', response.data);

    if (response.statusCode === 200 && response.data?.success) {
      // 添加移除动画类
      item.isRemoving = true;

      // 等待动画完成后再从列表中移除
      setTimeout(() => {
        const index = messageList.value.findIndex(msg => msg.id === item.id);
        if (index !== -1) {
          messageList.value.splice(index, 1);
        }
      }, 300); // 与CSS动画时间一致

      uni.showToast({ title: '删除并清空记录成功', icon: 'success' });
    } else {
      const msg = response.data?.message || '删除失败';
      console.warn('[messages] clear conversation api failed:', msg);
      uni.showToast({ title: msg, icon: 'none' });
    }
  } catch (error) {
    uni.hideLoading();
    console.error('删除并清空聊天记录失败:', error);
    const errMsg = (error && (error.errMsg || error.message)) || '网络错误';
    uni.showToast({ title: `删除失败：${errMsg}`.slice(0, 18), icon: 'none' });
  }
};

// 滑动开始
const onTouchStart = (e, item) => {
  swipeStartX.value = e.touches[0].clientX;
  isSwiping.value = true;
  currentSwipedItem.value = item;
  // 重置其他项目的滑动状态
  messageList.value.forEach(msg => {
    if (msg.id !== item.id) {
      msg.swipeX = 0;
    }
  });
};

// 滑动中
const onTouchMove = (e, item) => {
  if (!isSwiping.value) return;

  const currentX = e.touches[0].clientX;
  const deltaX = swipeStartX.value - currentX; // 左滑为正值

  // 只允许左滑（显示右侧操作按钮）
  if (deltaX > 0) {
    const maxSwipe = 240; // 最大滑动距离（三个按钮的总宽度）
    const swipeDistance = Math.min(deltaX, maxSwipe);
    item.swipeX = -swipeDistance;
  } else {
    item.swipeX = 0;
  }
};

// 滑动结束
const onTouchEnd = (e, item) => {
  if (!isSwiping.value) return;

  const currentX = e.changedTouches[0].clientX;
  const deltaX = swipeStartX.value - currentX;

  if (deltaX > 60) {
    // 左滑超过阈值，显示操作按钮
    item.swipeX = -240;
  } else {
    // 回弹到原位
    item.swipeX = 0;
  }

  isSwiping.value = false;
  currentSwipedItem.value = null;
};

// UniApp 生命周期钩子
onLoad(() => {
  currentUser.value = authService.getCurrentUser();
  initVirtualList();
  loadConversations();
  setupSocket();
});

onShow(() => {
  // 页面显示时刷新消息列表
  currentUser.value = authService.getCurrentUser();
  loadConversations();
  if (!socketConnected.value) setupSocket();
});

onPullDownRefresh(() => {
  refreshData();
});

onUnmounted(() => {
  teardownSocket();
});
</script>

<style lang="scss" scoped>
.messages-page {
  height: 100vh;
  background-color: #ffffff;
  display: flex;
  flex-direction: column;
}

// 消息列表容器
.message-list-container {
  flex: 1;
  overflow-y: auto;
  background-color: #ffffff;
}

// 加载状态
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;

  .loading-spinner {
    width: 60rpx;
    height: 60rpx;
    margin-bottom: 20rpx;

    .spinner-ring {
      width: 100%;
      height: 100%;
      border: 4rpx solid #f3f3f3;
      border-top: 4rpx solid #007aff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
  }

  .loading-text {
    color: #666666;
    font-size: 28rpx;
  }
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

// 空状态
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 60rpx;

  .empty-icon {
    margin-bottom: 40rpx;

    .empty-message {
      width: 120rpx;
      height: 120rpx;
      display: flex;
      align-items: center;
      justify-content: center;

      .message-bubble {
        width: 80rpx;
        height: 50rpx;
        background-color: #f0f0f0;
        border-radius: 20rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8rpx;

        .bubble-dot {
          width: 8rpx;
          height: 8rpx;
          background-color: #cccccc;
          border-radius: 50%;
          animation: bubble-pulse 1.5s ease-in-out infinite;

          &:nth-child(2) {
            animation-delay: 0.3s;
          }

          &:nth-child(3) {
            animation-delay: 0.6s;
          }
        }
      }
    }
  }

  .empty-text {
    font-size: 32rpx;
    color: #333333;
    margin-bottom: 16rpx;
    font-weight: 500;
  }

  .empty-desc {
    font-size: 28rpx;
    color: #999999;
    margin-bottom: 60rpx;
  }
}

@keyframes bubble-pulse {
  0%,
  60%,
  100% {
    opacity: 0.3;
    transform: scale(1);
  }
  30% {
    opacity: 1;
    transform: scale(1.2);
  }
}

// 虚拟列表
.virtual-list {
  position: relative;
  width: 100%;
  height: 100%;
}

.virtual-placeholder {
  width: 100%;
  height: 100%;
  transition: height 0.3s ease-out; // 平滑高度过渡
}

.virtual-viewport {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  will-change: transform;
  transform: translateZ(0); /* 强制GPU加速 */
  transition: transform 0.3s ease-out; // 平滑位置过渡
}

.swipe-container {
  position: relative;
  width: 100%;
  height: 75px; // 固定高度，对应itemHeight: 150rpx
  border-bottom: 1px solid #f5f5f5;
  overflow: hidden; // 隐藏超出容器的滑动内容
  transition: all 0.3s ease-out; // 添加过渡动画

  &.removing {
    height: 0;
    opacity: 0;
    transform: translateX(-100%);
  }
}

.swipe-actions {
  position: absolute;
  top: 0;
  right: 0;
  width: 240px; // 三个按钮的总宽度
  height: 100%;
  display: flex;
  z-index: 1;
  opacity: 0; // 默认完全隐藏，避免颜色外露
  visibility: hidden;
  transition: opacity 0.2s ease;
}

.swipe-container.show-actions .swipe-actions {
  opacity: 1;
  visibility: visible;
}

.action-btn {
  width: 80px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 24rpx;
  font-weight: 500;

  &.mark-unread {
    background-color: #007aff;
  }

  &.hide-btn {
    background-color: #ff9500;
  }

  &.delete-btn {
    background-color: #ff4757;
  }

  &:active {
    opacity: 0.8;
  }
}

.action-text {
  color: #ffffff;
  font-size: 24rpx;
  font-weight: 500;
}

.message-item {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: #ffffff;
  z-index: 2;
  transition: transform 0.2s ease-out;

  &:active {
    background-color: #f8f8f8;
  }
}

.message-content {
  display: flex;
  align-items: center;
  padding: 8px 20px 18px 15px; // 再增加右侧留白，让时间更靠左
  height: 100%;
  width: 100%;
}

// 头像容器
.avatar-container {
  margin-right: 12px;
  position: relative;

  .avatar {
    width: 50px;
    height: 50px;
    border-radius: 25px;
    background-color: #f0f0f0;
  }
}

// 消息信息
.message-info {
  flex: 1;
  min-width: 0;

  .message-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
    padding-right: 18px; // 进一步收左时间位置
    gap: 6px;

    .nickname {
      font-size: 16px;
      font-weight: 500;
      color: #333333;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .time {
      font-size: 12px;
      color: #999999;
      margin-left: 4px;
      flex-shrink: 0;
      width: 52px; // 再缩小宽度，使时间更靠左
      text-align: right;
      overflow: hidden;
      white-space: nowrap;
    }
  }

  .message-preview {
    .preview-text {
      font-size: 14px;
      color: #666666;
      line-height: 1.4;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

// 未读消息提示
.unread-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background-color: #ff4757;
  border-radius: 10px;
  min-width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  border: 2px solid #ffffff;

  .unread-count {
    color: #ffffff;
    font-size: 12px;
    font-weight: 500;
    padding: 0 6px;
  }
}

// 标为未读的小红点
.mark-unread-dot {
  position: absolute;
  top: -8px;
  right: -8px;
  background-color: #ff4757;
  border-radius: 12px;
  min-width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 15; // 比普通未读徽章层级更高
  border: 2px solid #ffffff;
  box-shadow: 0 2px 4px rgba(255, 71, 87, 0.3); // 添加阴影效果

  .mark-unread-count {
    color: #ffffff;
    font-size: 10px;
    font-weight: 600;
    padding: 0 4px;
  }
}

// 导航栏右侧按钮样式
.navbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* 导航栏左侧按钮容器样式 */
.navbar-left {
  display: flex;
  align-items: center;
}

.nav-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background-color 0.2s;

  &:active {
    background-color: #f5f5f5;
  }
}

.nav-text {
  font-size: 10px;
  color: #666666;
  margin-top: 2px;
  line-height: 1;
}

/* --- Visual polish overrides --- */
.messages-page {
  background-color: #f7f9fc; // 更柔和的背景
}

.navbar-right .nav-button {
  border-radius: 8px;
  padding: 4px 10px;
  &:active {
    background-color: #eef2f7;
  }
}

.avatar-container .avatar {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  border: 1px solid #eef2f7;
  background-color: #fafafa;
}

.message-info .message-header .nickname {
  color: #111827;
  letter-spacing: 0.2px;
}

.message-info .message-header .time {
  color: #9aa4b2;
}

.message-info .message-preview .preview-text {
  color: #6b7280;
}

// 未读徽章细化
.unread-badge {
  background: linear-gradient(135deg, #ff5a5f 0%, #ff2d55 100%);
  box-shadow: 0 2px 6px rgba(255, 45, 85, 0.25);
}

// 标为未读的小红点细化（与上面保持一致风格）
.mark-unread-dot {
  background: linear-gradient(135deg, #ff5a5f 0%, #ff2d55 100%);
  box-shadow: 0 2px 6px rgba(255, 45, 85, 0.25);
}

// 行分隔更柔和
.swipe-container {
  border-bottom: 1px solid #f0f3f7;
}

// 空状态优化
.empty-state .empty-text {
  color: #1f2937;
}
.empty-state .empty-desc {
  color: #6b7280;
}

// Loading ring颜色更亮
.loading-state .spinner-ring {
  border: 4rpx solid #edf2f7;
  border-top: 4rpx solid #4f46e5;
}

/* 行卡片质感与按压反馈（不改变高度） */
.message-item {
  border-radius: 12px;
  background-color: #ffffff;
  box-shadow: 0 1px 3px rgba(16, 24, 40, 0.04);
  transition:
    transform 0.06s ease,
    box-shadow 0.2s ease;
}
.message-item:active {
  transform: scale(0.996);
  box-shadow: 0 2px 8px rgba(16, 24, 40, 0.08);
}

/* 头像高光描边与轻微阴影 */
.avatar-container .avatar {
  box-shadow:
    0 1px 2px rgba(16, 24, 40, 0.06),
    0 0 0 2px #ffffff,
    0 0 0 4px rgba(79, 70, 229, 0.06);
}

/* 文案观感微调 */
.message-info .message-header .nickname {
  color: #0f172a; /* 更沉稳 */
}
.message-info .message-header .time {
  color: #9aa4b2; /* 柔和时间色 */
}
.message-info .message-preview .preview-text {
  color: #6b7280;
}

/* 滑动按钮圆角与阴影 */
.action-btn {
  border-radius: 10px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
}

/* 未读行高亮（不改变高度） */
.message-item.unread {
  background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.06);
}
.message-item.unread::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 3px;
  border-radius: 2px;
  background: linear-gradient(180deg, #4f46e5 0%, #06b6d4 100%);
}
.message-item.unread .message-info .message-header .nickname {
  font-weight: 600;
  color: #0b1a37;
}

/* 徽章动画，轻微弹入 */
@keyframes badge-pop {
  0% {
    transform: scale(0.8);
    opacity: 0.6;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
.unread-badge,
.mark-unread-dot {
  animation: badge-pop 180ms ease-out;
}

/* --- End visual polish overrides --- */

/* 顶部轻阴影过渡，增强层次感 */
.messages-page::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 12px;
  pointer-events: none;
  background: linear-gradient(to bottom, rgba(15, 23, 42, 0.08), rgba(15, 23, 42, 0));
  z-index: 1;
}

/* iOS/Android 隐藏滚动条，提高观感 */
.virtual-list-container {
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
}
.virtual-list-container::-webkit-scrollbar {
  display: none;
}

/* 未读时头像强调环颜色更明显 */
.message-item.unread .avatar-container .avatar {
  box-shadow:
    0 1px 2px rgba(16, 24, 40, 0.06),
    0 0 0 2px #ffffff,
    0 0 0 4px rgba(79, 70, 229, 0.16);
}

/* 页面底部适配安全区 */
.messages-page {
  padding-bottom: env(safe-area-inset-bottom);
}

/* 细化昵称与预览的排版，让文本更易读 */
.message-info .message-header .nickname {
  letter-spacing: 0.1px;
}
.message-info .message-preview .preview-text {
  letter-spacing: 0.1px;
  opacity: 0.96;
}

/* Spacing tuning: remove row divider and rebalance vertical padding */
.swipe-container {
  border-bottom: none;
}
.message-content {
  padding: 8px 20px 18px 15px;
}
</style>
