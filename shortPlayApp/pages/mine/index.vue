<template>
  <view class="mine-container">
    <!-- 用户信息区域 -->
    <view class="user-info-section">
      <view class="user-profile" @click="!isLoggedIn && goToLogin()">
        <image :src="userInfo.avatar" class="user-avatar" mode="aspectFill"></image>
        <view class="user-details">
          <text class="username">{{ userInfo.name }}</text>
          <view v-if="isLoggedIn" class="user-stats">
            <view class="stat-item">
              <text class="stat-number">{{ userInfo.following }}</text>
              <text class="stat-label">关注</text>
            </view>
            <view class="stat-item">
              <text class="stat-number">{{ userInfo.followers }}</text>
              <text class="stat-label">粉丝</text>
            </view>
            <view class="stat-item">
              <text class="stat-number">{{ userInfo.likes }}</text>
              <text class="stat-label">获赞</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 设置图标 -->
      <view class="settings-icon" @click="goToSettings">
        <u-icon name="setting" color="#ffffff" size="24"></u-icon>
      </view>
    </view>

    <!-- 功能菜单区域 -->
    <view class="function-menu">
      <view class="menu-grid">
        <view class="menu-item" v-for="item in menuItems" :key="item.type" @click="onMenuClick(item.type)">
          <view class="menu-icon" :class="item.iconClass">
            <text class="icon-text">{{ item.icon }}</text>
          </view>
          <text class="menu-label">{{ item.label }}</text>
        </view>
      </view>
    </view>

    <!-- 分类标签区域 -->
    <view class="category-tabs">
      <view class="tab-list">
        <view
          class="tab-item"
          v-for="(tab, index) in categoryTabs"
          :key="tab.type"
          :class="{ active: activeTab === index }"
          @click="switchTab(index)"
        >
          <text class="tab-text">{{ tab.name }}</text>
        </view>
      </view>
    </view>

    <!-- 内容展示区域 -->
    <view class="content-list">
      <view class="drama-grid">
        <view class="drama-card" v-for="drama in dramaList" :key="drama.id" @click="onDramaClick(drama)">
          <image :src="drama.poster" class="drama-poster" mode="aspectFill"></image>
          <view class="drama-info">
            <text class="drama-title">{{ drama.title }}</text>
            <text class="drama-progress">观看至{{ drama.progress }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import tokenManager from '../../utils/tokenManager.js';

// --- state ---
const isLoggedIn = ref(false);

const userInfo = reactive({
  avatar: '../../static/img/avatar.png',
  name: '坚强的南风',
  following: 0,
  followers: 0,
  likes: 0,
});

const menuItems = reactive([
  { type: 'coins', label: '金币', icon: '◯', iconClass: 'icon-coins' },
  { type: 'orders', label: '订单', icon: '🛍', iconClass: 'icon-orders' },
  { type: 'messages', label: '消息', icon: '✉', iconClass: 'icon-messages' },
  { type: 'withdraw', label: '提现', icon: '💰', iconClass: 'icon-withdraw' },
  { type: 'appointment', label: '预约', icon: '📅', iconClass: 'icon-appointment' },
]);

const categoryTabs = reactive([
  { name: '历史', type: 'history' },
  { name: '收藏', type: 'favorites' },
  { name: '点赞', type: 'likes' },
  { name: '动态', type: 'dynamics' },
]);

const activeTab = ref(0);

const dramaList = reactive([
  { id: 1, title: '鉴宝神眼', poster: '../../static/img/drama1.jpg', progress: '17%' },
  { id: 2, title: '言出法随后我无敌于天下', poster: '../../static/img/drama2.jpg', progress: '13%' },
  { id: 3, title: '抓娃娃之子承父业', poster: '../../static/img/drama3.jpg', progress: '2%' },
  { id: 4, title: '我婆妻子红颜如血', poster: '../../static/img/drama4.jpg', progress: '56%' },
  { id: 5, title: '家里来了奇葩岳母', poster: '../../static/img/drama5.jpg', progress: '23%' },
  { id: 6, title: '商宇', poster: '../../static/img/drama6.jpg', progress: '89%' },
]);

// --- methods ---
const handleLogoutState = () => {
  isLoggedIn.value = false;
  Object.assign(userInfo, {
    avatar: '../../static/img/avatar.png',
    name: '点击登录',
    following: 0,
    followers: 0,
    likes: 0,
  });
};

const checkLoginStatus = () => {
  if (tokenManager.isLoggedIn()) {
    const storedUserInfo = tokenManager.getUserInfo();
    if (storedUserInfo) {
      userInfo.name = storedUserInfo.nickname || '用户';
      userInfo.avatar = storedUserInfo.avatarUrl || '../../static/img/avatar.png';
      // TODO: 获取真实的 following, followers, likes 数据
      isLoggedIn.value = true;
    } else {
      handleLogoutState();
    }
  } else {
    handleLogoutState();
  }
};

const goToLogin = () => {
  uni.navigateTo({ url: '/pages/G-signUp/index' });
};

const goToSettings = () => {
  uni.navigateTo({ url: '/pages/G-Settings/index' });
};

const onMenuClick = type => {
  const actions = {
    coins: '金币功能开发中',
    orders: '订单功能开发中',
    messages: '消息功能开发中',
    withdraw: '提现功能开发中',
    appointment: '预约功能开发中',
  };
  const message = actions[type];
  if (message) {
    uni.showToast({ title: message, icon: 'none' });
  }
};

const switchTab = index => {
  activeTab.value = index;
  loadTabData(categoryTabs[index].type);
};

const loadTabData = type => {
  console.log('加载数据类型:', type);
  // 这里可以调用接口获取对应类型的数据
};

const onDramaClick = drama => {
  uni.navigateTo({ url: `/pages/playlet/detail?id=${drama.id}` });
};

// --- lifecycle hooks ---
onShow(() => {
  checkLoginStatus();
});
</script>

<style scoped lang="scss">
/* Styles remain the same */
.mine-container {
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(180deg, #2d5043 0%, #1a3228 50%, #0e1814 100%);
  padding-bottom: 100rpx;
}

// 用户信息区域
.user-info-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 80rpx 60rpx 60rpx;
  border-bottom: 1rpx solid rgba(255, 255, 255, 0.1);
}

.settings-icon {
  /* No specific styles needed for positioning anymore */
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 40rpx;
}

.user-avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  border: 3rpx solid rgba(255, 255, 255, 0.2);
}

.user-details {
  flex: 1;
}

.username {
  display: block;
  color: #ffffff;
  font-size: 36rpx;
  font-weight: bold;
  margin-bottom: 20rpx;
}

.user-stats {
  display: flex;
  gap: 60rpx;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-number {
  color: #ffffff;
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 8rpx;
}

.stat-label {
  color: rgba(255, 255, 255, 0.7);
  font-size: 24rpx;
}

// 功能菜单区域
.function-menu {
  padding: 40rpx 60rpx;
  border-bottom: 1rpx solid rgba(255, 255, 255, 0.1);
}

.menu-grid {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.menu-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
  flex: 1;
}

.menu-icon {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10rpx);

  &.icon-coins {
    background: linear-gradient(135deg, #ffd700, #ffb347);
  }

  &.icon-orders {
    background: linear-gradient(135deg, #ff6b6b, #ff8e8e);
  }

  &.icon-messages {
    background: linear-gradient(135deg, #4ecdc4, #44a08d);
  }

  &.icon-withdraw {
    background: linear-gradient(135deg, #a8e6cf, #88d8a3);
  }

  &.icon-appointment {
    background: linear-gradient(135deg, #ff9a9e, #fecfef);
  }
}

.icon-text {
  color: #ffffff;
  font-size: 40rpx;
}

.menu-label {
  color: rgba(255, 255, 255, 0.8);
  font-size: 24rpx;
}

// 分类标签区域
.category-tabs {
  padding: 40rpx 60rpx 20rpx;
}

.tab-list {
  display: flex;
  gap: 60rpx;
}

.tab-item {
  padding: 20rpx 0;
  position: relative;

  &.active {
    .tab-text {
      color: #ffffff;
      font-weight: bold;
    }

    &:after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 40rpx;
      height: 4rpx;
      background: linear-gradient(90deg, #ff6b47, #ff9529);
      border-radius: 2rpx;
    }
  }
}

.tab-text {
  color: rgba(255, 255, 255, 0.6);
  font-size: 32rpx;
  transition: all 0.3s ease;
}

// 内容展示区域
.content-list {
  padding: 20rpx 60rpx 0;
}

.drama-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 40rpx;
}

.drama-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20rpx;
  overflow: hidden;
  backdrop-filter: blur(10rpx);
}

.drama-poster {
  width: 100%;
  height: 300rpx;
  border-radius: 20rpx 20rpx 0 0;
}

.drama-info {
  padding: 20rpx;
}

.drama-title {
  display: block;
  color: #ffffff;
  font-size: 28rpx;
  font-weight: bold;
  margin-bottom: 12rpx;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drama-progress {
  color: rgba(255, 255, 255, 0.6);
  font-size: 24rpx;
}
</style>
