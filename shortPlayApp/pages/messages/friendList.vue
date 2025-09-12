<template>
  <view class="friend-list-page">
    <!-- 顶部导航栏：左侧返回键 -->
    <u-navbar
      :title="'好友'"
      :fixed="true"
      :placeholder="true"
      :safeAreaInsetTop="true"
      bgColor="#ffffff"
      titleStyle="font-weight:700;color:#111827"
      :autoBack="true"
      leftIcon="arrow-left"
      leftText="返回"
    />

    <!-- 顶部功能区 -->
    <view class="top-functions">
      <view class="function-item" @click="goToFriendRequests">
        <view class="function-icon friend-request-icon">
          <view class="icon-bg">
            <image src="/static/tabbar/message-cur.png" class="function-big-icon" mode="aspectFit"></image>
            <view class="rect-icon">
              <view class="rect-bar rect-bar1"></view>
              <view class="rect-bar rect-bar2"></view>
            </view>
          </view>
          <view v-if="pendingRequestsCount > 0" class="badge">{{ pendingRequestsCount }}</view>
        </view>
        <text class="function-text">好友申请</text>
      </view>
      <view class="function-item" @click="goToAddFriend">
        <view class="function-icon add-friend-icon">
          <view class="icon-bg">
            <image src="/static/tabbar/index-cur.png" class="function-big-icon" mode="aspectFit"></image>
            <view class="rect-icon">
              <view class="rect-bar rect-bar3"></view>
              <view class="rect-bar rect-bar4"></view>
            </view>
          </view>
        </view>
        <text class="function-text">添加好友</text>
      </view>
    </view>

    <!-- 搜索框已移除 -->

    <!-- 虚拟列表容器 -->
    <scroll-view scroll-y class="virtual-list-container" @scroll="onScroll" :scroll-top="scrollTop">
      <view v-if="loading" class="loading-state">
        <view class="loading-spinner">
          <view class="spinner-ring"></view>
        </view>
        <text class="loading-text">加载中...</text>
      </view>

      <view v-else-if="friendList.length === 0" class="empty-state">
        <view class="empty-icon">
          <view class="empty-people">
            <view class="person person1">
              <view class="person-head"></view>
              <view class="person-body"></view>
            </view>
            <view class="person person2">
              <view class="person-head"></view>
              <view class="person-body"></view>
            </view>
          </view>
        </view>
        <view class="empty-text">暂无好友</view>
        <view class="empty-desc">快去添加一些好友吧</view>
        <view class="add-friend-btn" @click="goToAddFriend">
          <text class="btn-text">添加好友</text>
        </view>
      </view>

      <!-- 虚拟列表实现 -->
      <view v-else class="virtual-list">
        <!-- 占位容器，用于撑开滚动高度 -->
        <view class="virtual-placeholder" :style="{ height: totalHeight + 'rpx' }"></view>

        <!-- 可视区域容器 -->
        <view class="virtual-viewport" :style="{ transform: `translateY(${offsetY}rpx)` }">
          <view v-for="friend in visibleFriends" :key="friend._id" class="friend-item" @click="goToFriendChat(friend)">
            <view class="friend-avatar">
              <image :src="friend.friendInfo.avatar || '/static/img/default-avatar.png'" class="avatar-img"></image>
              <view v-if="friend.friendInfo.status === 'active'" class="online-indicator">
                <view class="online-dot"></view>
                <view class="online-pulse"></view>
              </view>
            </view>
            <view class="friend-info">
              <view class="friend-name">
                {{ friend.remarkName || friend.friendInfo.nickname }}
              </view>
              <view v-if="friend.remarkName && friend.remarkName !== friend.friendInfo.nickname" class="real-name">
                {{ friend.friendInfo.nickname }}
              </view>
              <view class="friend-status">
                <view class="status-dot" :class="getStatusClass(friend.friendInfo.lastLoginAt)"></view>
                <text>{{ formatLastSeen(friend.friendInfo.lastLoginAt) }}</text>
              </view>
            </view>
            <view class="friend-actions" @click.stop>
              <view class="more-btn" @click="showFriendMenu(friend)">
                <view class="dot"></view>
                <view class="dot"></view>
                <view class="dot"></view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 加载更多 -->
    <view v-if="hasMore && !loading" class="load-more" @click="loadMoreFriends">
      <view class="load-more-content">
        <view class="load-more-icon">
          <view class="arrow-down"></view>
        </view>
        <text class="load-more-text">加载更多</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { onLoad, onShow, onPullDownRefresh, onReachBottom, onBackPress } from '@dcloudio/uni-app';
import authService from '@/utils/authService';
import friendService from '@/utils/friendService';
import { getApiConfig } from '@/config/index.js';
import tokenManager from '@/utils/tokenManager.js';

const apiConfig = getApiConfig();

// 响应式数据
const friendList = ref([]);
const searchKeyword = ref(''); // 保留字段但不渲染搜索UI
const loading = ref(false);
const hasMore = ref(true);
const currentPage = ref(1);
const pageSize = ref(20);
const pendingRequestsCount = ref(0);
const currentUser = ref(null);

// 虚拟列表相关
const itemHeight = ref(160); // 每个好友项的高度(rpx)
const containerHeight = ref(0); // 容器高度
const scrollTop = ref(0); // 滚动位置
const visibleCount = ref(0); // 可视区域显示的项目数量
const bufferSize = ref(3); // 缓冲区大小

// 计算属性
const totalHeight = computed(() => {
  return friendList.value.length * itemHeight.value;
});

const startIndex = computed(() => {
  const index = Math.floor(scrollTop.value / itemHeight.value);
  return Math.max(0, index - bufferSize.value);
});

const endIndex = computed(() => {
  const index = startIndex.value + visibleCount.value + bufferSize.value * 2;
  return Math.min(friendList.value.length, index);
});

const visibleFriends = computed(() => {
  return friendList.value.slice(startIndex.value, endIndex.value);
});

const offsetY = computed(() => {
  return startIndex.value * itemHeight.value;
});

// 初始化虚拟列表
const initVirtualList = () => {
  // 获取系统信息计算容器高度
  const systemInfo = uni.getSystemInfoSync();
  // 减去导航栏、功能区、搜索框等高度，大约300rpx
  containerHeight.value = (systemInfo.windowHeight * 750) / systemInfo.windowWidth - 300;
  // 计算可视区域能显示的项目数量
  visibleCount.value = Math.ceil(containerHeight.value / itemHeight.value) + 1;
};

// 滚动事件处理
const onScroll = e => {
  scrollTop.value = e.detail.scrollTop;

  // 检查是否需要加载更多数据
  const scrollBottom = scrollTop.value + containerHeight.value;
  const totalHeightValue = totalHeight.value;

  if (scrollBottom >= totalHeightValue - 200 && hasMore.value && !loading.value) {
    loadMoreFriends();
  }
};

// 刷新数据
const refreshData = () => {
  currentPage.value = 1;
  hasMore.value = true;
  friendList.value = [];
  scrollTop.value = 0; // 重置滚动位置
  loadFriendList(true);
  loadPendingRequestsCount();
  uni.stopPullDownRefresh();
};

// 加载好友列表 - 连接真实后端
const loadFriendList = async (allowCache = false) => {
  if (loading.value || !currentUser.value) return;
  loading.value = true;

  try {
    // 可选缓存：仅用于首屏占位，随后用最新数据覆盖
    if (allowCache && currentPage.value === 1 && !searchKeyword.value) {
      const cachedData = uni.getStorageSync('friendList_cache');
      if (cachedData && Date.now() - cachedData.timestamp < 300000) {
        friendList.value = cachedData.data;
      }
    }

    // 拉取最新数据
    const userId = currentUser.value.id || currentUser.value._id;
    const response = await friendService.getFriendList(userId, {
      page: currentPage.value,
      limit: pageSize.value,
      search: searchKeyword.value,
    });

    console.log('好友列表接口返回:', response);
    if (response.success) {
      const newFriends = response.data.friends;
      if (currentPage.value === 1) {
        friendList.value = newFriends;
        // 覆盖缓存
        if (!searchKeyword.value) {
          uni.setStorageSync('friendList_cache', {
            data: newFriends,
            timestamp: Date.now(),
          });
        }
      } else {
        friendList.value.push(...newFriends);
      }
      hasMore.value = newFriends.length === pageSize.value;
    } else {
      throw new Error(response.message || '获取好友列表失败');
    }
  } catch (error) {
    console.error('加载好友列表失败:', error);
    uni.showToast({
      title: '加载失败，请检查网络/登录状态',
      icon: 'none',
    });
  } finally {
    loading.value = false;
  }
};

// 加载更多好友
const loadMoreFriends = () => {
  currentPage.value++;
  loadFriendList();
};

// 加载待处理申请数量 - 连接真实数据库
const loadPendingRequestsCount = async () => {
  if (!currentUser.value) return;
  try {
    const userId = currentUser.value.id || currentUser.value._id;
    const response = await uni.request({
      url: `${apiConfig.baseURL}/friends/requests/${userId}`,
      method: 'GET',
      data: { type: 'received' },
      header: {
        Authorization: `Bearer ${tokenManager.getAccessToken() || ''}`,
      },
    });
    if (response.data && response.data.success) {
      pendingRequestsCount.value = response.data.data.requests.filter(req => req.status === 'pending').length;
    } else {
      pendingRequestsCount.value = 0;
    }
  } catch (error) {
    console.error('加载申请数量失败:', error);
    pendingRequestsCount.value = 0;
  }
};

// 显示好友菜单
const showFriendMenu = friend => {
  const itemList = ['发消息', '查看资料', '设置备注', '删除好友'];

  uni.showActionSheet({
    itemList,
    success: res => {
      switch (res.tapIndex) {
        case 0:
          goToFriendChat(friend);
          break;
        case 1:
          goToFriendProfile(friend);
          break;
        case 2:
          setRemark(friend);
          break;
        case 3:
          confirmDeleteFriend(friend);
          break;
      }
    },
  });
};

// 跳转到好友聊天页面
const goToFriendChat = friend => {
  const friendId = friend.friendInfo._id || friend.friendInfo.id;
  const friendName = friend.remarkName || friend.friendInfo.nickname || '好友';
  const friendAvatar = friend.friendInfo.avatar || '/static/img/default-avatar.png';

  if (!friendId) {
    uni.showToast({
      title: '好友信息异常',
      icon: 'none',
    });
    return;
  }

  uni.navigateTo({
    url: `/pages/chat/friendChatClean?friendId=${friendId}&friendName=${encodeURIComponent(friendName)}&friendAvatar=${encodeURIComponent(friendAvatar)}`,
  });
};

// 设置备注
const setRemark = friend => {
  const currentRemark = friend.remarkName || friend.friendInfo.nickname;

  uni.showModal({
    title: '设置备注',
    content: `当前备注：${currentRemark}`,
    editable: true,
    placeholderText: '请输入备注名称',
    success: async res => {
      if (res.confirm && res.content.trim()) {
        await updateFriendRemark(friend._id, res.content.trim());
      }
    },
  });
};

// 更新好友备注
const updateFriendRemark = async (friendId, remark) => {
  try {
    const response = await friendService.setFriendRemark(friendId, currentUser.value.id, remark);

    if (response.success) {
      uni.showToast({
        title: '备注设置成功',
        icon: 'success',
      });
      refreshData();
    } else {
      throw new Error(response.message);
    }
  } catch (error) {
    console.error('设置备注失败:', error);
    uni.showToast({
      title: '设置失败',
      icon: 'none',
    });
  }
};

// 确认删除好友
const confirmDeleteFriend = friend => {
  const friendName = friend.remarkName || friend.friendInfo.nickname;

  uni.showModal({
    title: '删除好友',
    content: `确定要删除好友"${friendName}"吗？`,
    success: res => {
      if (res.confirm) {
        deleteFriend(friend._id);
      }
    },
  });
};

// 删除好友
const deleteFriend = async friendId => {
  try {
    const response = await friendService.deleteFriend(friendId, currentUser.value.id);

    if (response.success) {
      uni.showToast({
        title: '已删除好友',
        icon: 'success',
      });
      refreshData();
    } else {
      throw new Error(response.message);
    }
  } catch (error) {
    console.error('删除好友失败:', error);
    uni.showToast({
      title: '删除失败',
      icon: 'none',
    });
  }
};

// 跳转到好友资料页
const goToFriendProfile = friend => {
  uni.navigateTo({
    url: `/pages/mine/friendProfile?friendId=${friend.friendInfo._id}`,
  });
};

// 跳转到好友申请页面
const goToFriendRequests = () => {
  uni.navigateTo({
    url: '/pages/friends/friendRequests',
  });
};

// 跳转到添加好友页面
const goToAddFriend = () => {
  uni.navigateTo({
    url: '/pages/friends/addFriend',
  });
};

// 返回上一页
const goBack = () => {
  // 检查页面栈，如果只有一个页面则跳转到个人中心
  const pages = getCurrentPages();
  if (pages.length <= 1) {
    uni.reLaunch({
      url: '/pages/mine/index',
    });
  } else {
    uni.navigateBack({
      delta: 1,
    });
  }
};

// 格式化最后在线时间
const formatLastSeen = lastLoginAt => {
  if (!lastLoginAt) return '从未登录';

  try {
    const time = new Date(lastLoginAt);
    const now = new Date();
    const diff = now - time;

    if (diff < 300000) {
      // 5分钟内
      return '在线';
    } else if (diff < 3600000) {
      // 1小时内
      return `${Math.floor(diff / 60000)}分钟前在线`;
    } else if (diff < 86400000) {
      // 1天内
      return `${Math.floor(diff / 3600000)}小时前在线`;
    } else if (diff < 2592000000) {
      // 30天内
      return `${Math.floor(diff / 86400000)}天前在线`;
    } else {
      return '很久未登录';
    }
  } catch (error) {
    return '未知';
  }
};

// 新增方法：获取状态样式类
const getStatusClass = lastLoginAt => {
  if (!lastLoginAt) return 'offline';

  try {
    const time = new Date(lastLoginAt);
    const now = new Date();
    const diff = now - time;

    if (diff < 300000) {
      // 5分钟内
      return 'online';
    } else if (diff < 3600000) {
      // 1小时内
      return 'recent';
    } else {
      return 'offline';
    }
  } catch (error) {
    return 'offline';
  }
};

// UniApp 生命周期钩子
onLoad(() => {
  currentUser.value = authService.getCurrentUser();
  initVirtualList();
  loadFriendList();
  loadPendingRequestsCount();
});

onMounted(() => {
  // 作为子组件嵌入 messages/index.vue 时，onLoad 不会触发，这里兜底一次
  if (!currentUser.value) {
    currentUser.value = authService.getCurrentUser();
  }
  initVirtualList();
  refreshData();
});

onShow(() => {
  // 页面显示时刷新数据
  refreshData();
});

onPullDownRefresh(() => {
  refreshData();
});

onReachBottom(() => {
  if (hasMore.value && !loading.value) {
    loadMoreFriends();
  }
});

onBackPress(() => {
  // 处理物理返回键
  goBack();
  return true; // 阻止默认返回行为
});
</script>

<style scoped>
/* CSS变量定义 - 优化颜色方案 */
:root {
  --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --secondary-gradient: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  --accent-gradient: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
  --success-gradient: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);
  --success-color: #52c41a;
  --warning-color: #faad14;
  --error-color: #ff4757;
  --text-primary: #2c3e50;
  --text-secondary: #5a6c7d;
  --text-tertiary: #95afc0;
  --bg-primary: #ffffff;
  --bg-secondary: linear-gradient(135deg, #f8f9ff 0%, #f1f4ff 100%);
  --bg-card: rgba(255, 255, 255, 0.9);
  --border-color: rgba(102, 126, 234, 0.1);
  --shadow-light: 0 4rpx 20rpx rgba(102, 126, 234, 0.08);
  --shadow-medium: 0 8rpx 30rpx rgba(102, 126, 234, 0.15);
  --shadow-hover: 0 10rpx 40rpx rgba(102, 126, 234, 0.2);
  --border-radius: 24rpx;
  --border-radius-small: 16rpx;
  --border-radius-large: 32rpx;
}

.friend-list-page {
  min-height: 100vh;
  background: var(--bg-secondary);
  position: relative;
  overflow-x: hidden;
}

.friend-list-page::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--bg-secondary);
  z-index: -1;
}

/* 删除自定义导航栏样式，使用父级页面的导航与间距 */

/* 顶部功能区 - 优化设计 */
.top-functions {
  display: flex;
  background: var(--bg-card);
  backdrop-filter: blur(20rpx);
  margin: 20rpx;
  border-radius: var(--border-radius-large);
  padding: 50rpx 40rpx;
  gap: 100rpx;
  justify-content: center;
  box-shadow: var(--shadow-light);
  border: 2rpx solid var(--border-color);
  position: relative;
  overflow: hidden;
}

.top-functions::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 200%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  transition: left 1.5s ease;
}

.top-functions:hover::before {
  left: 100%;
}

.function-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  cursor: pointer;
}

.function-item:active {
  transform: translateY(4rpx) scale(0.95);
}

.function-item:hover {
  transform: translateY(-8rpx);
}

.function-icon {
  position: relative;
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  box-shadow: var(--shadow-light);
}

.function-icon:hover {
  box-shadow: var(--shadow-hover);
  transform: scale(1.1);
}

.friend-request-icon .icon-bg {
  background: var(--accent-gradient);
  width: 100%;
  height: 100%;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.friend-request-icon .icon-bg::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transform: rotate(45deg);
  animation: shimmer 3s infinite;
}

.add-friend-icon .icon-bg {
  background: var(--secondary-gradient);
  width: 100%;
  height: 100%;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.add-friend-icon .icon-bg::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transform: rotate(45deg);
  animation: shimmer 3s infinite 1.5s;
}

@keyframes shimmer {
  0% {
    transform: rotate(45deg) translateX(-200%);
  }

  100% {
    transform: rotate(45deg) translateX(200%);
  }
}

/* 长方形图标 */
.rect-icon {
  position: relative;
  width: 40rpx;
  height: 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
}

.rect-bar {
  background: white;
  border-radius: 2rpx;
}

/* 好友申请图标 - 两个水平长方形 */
.rect-bar1,
.rect-bar2 {
  width: 32rpx;
  height: 6rpx;
}

/* 添加好友图标 - 一个水平一个垂直长方形组成十字 */
.rect-bar3 {
  width: 32rpx;
  height: 6rpx;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.rect-bar4 {
  width: 6rpx;
  height: 32rpx;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.badge {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  background: var(--error-color);
  color: white;
  font-size: 20rpx;
  padding: 6rpx 10rpx;
  border-radius: 12rpx;
  min-width: 32rpx;
  text-align: center;
  border: 3rpx solid white;
  box-shadow: var(--shadow-light);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.1);
  }

  100% {
    transform: scale(1);
  }
}

.function-text {
  font-size: 28rpx;
  color: var(--text-primary);
  font-weight: 600;
  text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.1);
}

/* 搜索框已移除 */

/* 顶部功能区图标图片尺寸 */
.function-big-icon {
  width: 64rpx;
  height: 64rpx;
  opacity: 0.9;
}

.clear-icon {
  display: none;
}

.clear-x {
  display: none;
}

/* 虚拟列表容器 */
.virtual-list-container {
  height: calc(100vh - 300rpx);
  overflow-y: auto;
  padding: 0 20rpx;
}

.virtual-list {
  position: relative;
  width: 100%;
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

.friend-item {
  display: flex;
  align-items: center;
  padding: 36rpx;
  margin-bottom: 24rpx;
  background: var(--bg-card);
  backdrop-filter: blur(10rpx);
  border-radius: var(--border-radius-large);
  box-shadow: var(--shadow-light);
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
  overflow: hidden;
  border: 2rpx solid var(--border-color);
  cursor: pointer;
}

.friend-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 200%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(102, 126, 234, 0.1), transparent);
  transition: left 0.6s ease;
}

.friend-item:hover::before {
  left: 100%;
}

.friend-item::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.08), rgba(118, 75, 162, 0.08));
  opacity: 0;
  transition: opacity 0.3s ease;
}

.friend-item:active::after {
  opacity: 1;
}

.friend-item:active {
  transform: translateY(6rpx) scale(0.98);
  box-shadow: var(--shadow-medium);
}

.friend-item:hover {
  transform: translateY(-4rpx);
  box-shadow: var(--shadow-hover);
}

.friend-avatar {
  position: relative;
  margin-right: 36rpx;
}

.avatar-img {
  width: 110rpx;
  height: 110rpx;
  border-radius: 50%;
  object-fit: cover;
  border: 4rpx solid rgba(102, 126, 234, 0.2);
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  background: linear-gradient(135deg, #f5f7fa, #c3cfe2);
}

.friend-item:hover .avatar-img {
  border-color: rgba(102, 126, 234, 0.6);
  transform: scale(1.05);
  box-shadow: 0 8rpx 25rpx rgba(102, 126, 234, 0.2);
}

.online-indicator {
  position: absolute;
  bottom: 5rpx;
  right: 5rpx;
  width: 24rpx;
  height: 24rpx;
}

.online-dot {
  width: 100%;
  height: 100%;
  background: var(--success-color);
  border: 3rpx solid white;
  border-radius: 50%;
  position: relative;
  z-index: 2;
}

.online-pulse {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--success-color);
  border-radius: 50%;
  animation: pulse-ring 2s infinite;
}

@keyframes pulse-ring {
  0% {
    transform: scale(1);
    opacity: 1;
  }

  100% {
    transform: scale(2);
    opacity: 0;
  }
}

.friend-info {
  flex: 1;
}

.friend-name {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8rpx;
  line-height: 1.3;
}

.real-name {
  font-size: 24rpx;
  color: var(--text-tertiary);
  margin-bottom: 8rpx;
  line-height: 1.2;
}

.friend-status {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 24rpx;
  color: var(--text-secondary);
}

.status-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.status-dot.online {
  background: var(--success-color);
  box-shadow: 0 0 8rpx rgba(82, 196, 26, 0.5);
}

.status-dot.recent {
  background: var(--warning-color);
}

.status-dot.offline {
  background: var(--text-tertiary);
}

.friend-actions {
  padding: 20rpx;
}

.more-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  padding: 8rpx;
  border-radius: 8rpx;
  transition: all 0.3s ease;
}

.more-btn:active {
  background: rgba(102, 126, 234, 0.1);
}

.more-btn .dot {
  width: 6rpx;
  height: 6rpx;
  background: var(--text-secondary);
  border-radius: 50%;
}

/* 加载状态 - 优化设计 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 40rpx;
  gap: 40rpx;
}

.loading-spinner {
  position: relative;
  width: 100rpx;
  height: 100rpx;
}

.spinner-ring {
  width: 100%;
  height: 100%;
  border: 8rpx solid var(--border-color);
  border-top: 8rpx solid transparent;
  border-right: 8rpx solid transparent;
  border-radius: 50%;
  background: conic-gradient(from 0deg, #667eea, #764ba2, #667eea);
  animation: spin 1.2s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;
  position: relative;
}

.spinner-ring::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 70%;
  height: 70%;
  background: var(--bg-primary);
  border-radius: 50%;
  transform: translate(-50%, -50%);
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.loading-text {
  font-size: 32rpx;
  color: var(--text-secondary);
  font-weight: 500;
  text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.1);
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 40rpx;
}

.empty-icon {
  margin-bottom: 40rpx;
}

.empty-people {
  position: relative;
  width: 120rpx;
  height: 80rpx;
}

.person {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.person1 {
  left: 0;
  top: 0;
  z-index: 1;
}

.person2 {
  right: 0;
  top: 10rpx;
  z-index: 0;
}

.person-head {
  width: 40rpx;
  height: 40rpx;
  background: var(--text-tertiary);
  border-radius: 50%;
  margin-bottom: 8rpx;
}

.person-body {
  width: 50rpx;
  height: 30rpx;
  background: var(--text-tertiary);
  border-radius: 15rpx 15rpx 0 0;
}

.empty-text {
  font-size: 32rpx;
  color: var(--text-secondary);
  margin-bottom: 15rpx;
  font-weight: 500;
}

.empty-desc {
  font-size: 26rpx;
  color: var(--text-tertiary);
  text-align: center;
  line-height: 1.5;
  margin-bottom: 40rpx;
}

.add-friend-btn {
  background: var(--secondary-gradient);
  color: white;
  padding: 24rpx 50rpx;
  border-radius: 40rpx;
  box-shadow: var(--shadow-light);
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
  overflow: hidden;
}

.add-friend-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 200%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.6s ease;
}

.add-friend-btn:hover::before {
  left: 100%;
}

.add-friend-btn:active {
  transform: translateY(4rpx) scale(0.95);
  box-shadow: var(--shadow-medium);
}

.add-friend-btn:hover {
  transform: translateY(-2rpx);
  box-shadow: var(--shadow-hover);
}

.btn-text {
  font-size: 30rpx;
  font-weight: 600;
  position: relative;
  z-index: 2;
}

/* 加载更多 - 优化设计 */
.load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 50rpx 40rpx;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.load-more:active {
  transform: translateY(4rpx);
}

.load-more-content {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx 40rpx;
  background: var(--bg-card);
  backdrop-filter: blur(10rpx);
  border-radius: 40rpx;
  box-shadow: var(--shadow-light);
  border: 2rpx solid var(--border-color);
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
  overflow: hidden;
}

.load-more-content:hover {
  transform: translateY(-2rpx);
  box-shadow: var(--shadow-hover);
}

.load-more-content::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 200%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(102, 126, 234, 0.1), transparent);
  transition: left 0.6s ease;
}

.load-more-content:hover::before {
  left: 100%;
}

.load-more-icon {
  width: 28rpx;
  height: 28rpx;
  position: relative;
}

.arrow-down {
  width: 0;
  height: 0;
  border-left: 10rpx solid transparent;
  border-right: 10rpx solid transparent;
  border-top: 14rpx solid var(--text-secondary);
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  transition: all 0.3s ease;
}

.load-more-content:hover .arrow-down {
  border-top-color: #667eea;
  animation: bounce 1s infinite;
}

@keyframes bounce {
  0%,
  100% {
    transform: translate(-50%, -50%);
  }

  50% {
    transform: translate(-50%, -30%);
  }
}

.load-more-text {
  font-size: 30rpx;
  color: var(--text-secondary);
  font-weight: 600;
  position: relative;
  z-index: 2;
}

.load-more-content:hover .load-more-text {
  color: #667eea;
}

/* 响应式设计 */
@media (max-width: 750rpx) {
  .top-functions {
    gap: 60rpx;
    padding: 30rpx 20rpx;
  }

  .function-icon {
    width: 80rpx;
    height: 80rpx;
  }

  .friend-item {
    padding: 25rpx;
  }

  .avatar-img {
    width: 80rpx;
    height: 80rpx;
  }
}
</style>
