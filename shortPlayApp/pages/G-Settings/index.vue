<template>
  <view class="settings-container">
    <u-navbar
      title="设置"
      @leftClick="goBack"
      :safeAreaInsetTop="true"
      :placeholder="true"
      bgColor="#ffffff"
    ></u-navbar>
    <u-cell-group>
      <u-cell title="头像" isLink @click="showAvatarSheet = true">
        <template #value>
          <u-avatar :src="userInfo.avatar" size="40"></u-avatar>
        </template>
      </u-cell>
      <u-cell title="昵称" :value="userInfo.nickname" isLink @click="handleChangeNickname"></u-cell>
    </u-cell-group>

    <u-cell-group class="action-group">
      <u-cell title="退出登录" @click="showLogoutSheet = true" :title-style="{ textAlign: 'center' }"></u-cell>
    </u-cell-group>

    <!-- 登出操作菜单 -->
    <u-action-sheet
      :show="showLogoutSheet"
      :actions="logoutActions"
      title="确定要退出登录吗？"
      cancelText="取消"
      @select="handleLogout"
      @close="showLogoutSheet = false"
    ></u-action-sheet>

    <!-- 头像操作菜单 -->
    <u-action-sheet
      :show="showAvatarSheet"
      :actions="avatarActions"
      title="更换头像"
      cancelText="取消"
      @select="handleAvatarAction"
      @close="showAvatarSheet = false"
    ></u-action-sheet>
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import tokenManager from '../../utils/tokenManager.js';

// --- state ---
const userInfo = reactive({
  avatar: '',
  nickname: '未登录',
});

const showLogoutSheet = ref(false);
const showAvatarSheet = ref(false);

const logoutActions = reactive([
  {
    name: '退出登录',
    color: '#e45656',
    fontSize: '16',
  },
]);

const avatarActions = reactive([
  {
    name: '拍照',
  },
  {
    name: '从相册选择',
  },
]);

// --- methods ---
const checkLoginStatus = () => {
  if (tokenManager.isLoggedIn()) {
    const storedUserInfo = tokenManager.getUserInfo();
    if (storedUserInfo) {
      userInfo.nickname = storedUserInfo.nickname || '用户';
      userInfo.avatar = storedUserInfo.avatarUrl || '../../static/img/avatar.png';
    }
  } else {
    uni.showToast({
      title: '请先登录',
      icon: 'none',
      duration: 1500,
    });
    setTimeout(() => {
      uni.navigateTo({
        url: '/pages/G-signUp/index',
      });
    }, 1500);
  }
};

const handleChangeNickname = () => {
  uni.showToast({
    title: '修改昵称功能开发中',
    icon: 'none',
  });
};

const handleAvatarAction = action => {
  if (action.name === '拍照') {
    uni.showToast({ title: '拍照功能开发中', icon: 'none' });
  } else if (action.name === '从相册选择') {
    uni.showToast({ title: '从相册选择功能开发中', icon: 'none' });
  }
};

const handleLogout = async () => {
  uni.showLoading({ title: '正在退出...' });
  try {
    await tokenManager.logout();
  } catch (error) {
    console.error('登出失败:', error);
    uni.showToast({
      title: '登出失败，请重试',
      icon: 'none',
    });
  } finally {
    uni.hideLoading();
  }
};

const goBack = () => {
  uni.navigateBack();
};

// --- lifecycle hooks ---
onShow(() => {
  checkLoginStatus();
});
</script>

<style scoped lang="scss">
.settings-container {
  height: 100vh;
  background-color: #f4f4f5;
}

.action-group {
  margin-top: 20rpx;
}
</style>
