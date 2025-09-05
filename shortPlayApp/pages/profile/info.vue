<template>
  <view class="info-page">
    <!-- 导航栏 -->
    <view class="nav-bar">
      <view class="nav-left" @click="goBack">
        <text class="back-icon">←</text>
      </view>
      <view class="nav-title">我的信息</view>
      <view class="nav-right">
        <text class="save-btn" @click="saveUserInfo" v-if="hasChanges">保存</text>
      </view>
    </view>

    <!-- 用户信息 -->
    <view class="user-info-section">
      <view class="avatar-section" @click="changeAvatar">
        <image
          :src="getAvatarUrl()"
          class="avatar"
          mode="aspectFill"
          @load="onAvatarLoad"
          @error="onAvatarError"
        ></image>
        <text class="change-avatar">更换头像</text>
      </view>

      <view class="info-list">
        <view class="info-item" @click="editField('nickname')">
          <text class="info-label">用户名</text>
          <text class="info-value" :class="{ placeholder: !userInfo.nickname }">
            {{ userInfo.nickname || '点击设置用户名' }}
          </text>
          <text class="arrow">></text>
        </view>

        <view class="info-item">
          <text class="info-label">UID</text>
          <text class="info-value">{{ userInfo.id || '加载中...' }}</text>
        </view>

        <view class="info-item" @click="editField('mobilePhoneNumber')">
          <text class="info-label">手机号</text>
          <text class="info-value" :class="{ placeholder: !userInfo.mobilePhoneNumber }">
            {{ formatPhone(userInfo.mobilePhoneNumber) || '点击绑定手机号' }}
          </text>
          <text class="arrow">></text>
        </view>

        <view class="info-item" @click="editField('gender')">
          <text class="info-label">性别</text>
          <text class="info-value" :class="{ placeholder: !userInfo.gender }">
            {{ userInfo.gender || '点击设置性别' }}
          </text>
          <text class="arrow">></text>
        </view>

        <view class="info-item" @click="editField('birthday')">
          <text class="info-label">生日</text>
          <text class="info-value" :class="{ placeholder: !userInfo.birthday }">
            {{ userInfo.birthday || '点击设置生日' }}
          </text>
          <text class="arrow">></text>
        </view>

        <view class="info-item" @click="editField('bio')">
          <text class="info-label">个人简介</text>
          <text class="info-value" :class="{ placeholder: !userInfo.bio }">
            {{ userInfo.bio || '点击添加个人简介' }}
          </text>
          <text class="arrow">></text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import tokenManager from '@/utils/tokenManager.js';

const userInfo = ref({
  avatar: '/static/img/avatar.png',
  nickname: '游客',
  bio: '这个人很懒，什么都没留下',
  gender: '保密',
  birthday: '未设置',
  region: '未知',
});
const isLoading = ref(true);

onMounted(() => {
  const currentUser = tokenManager.getUserInfo();
  if (currentUser) {
    userInfo.value = { ...userInfo.value, ...currentUser };
  }
});

const loadUserInfo = async () => {
  isLoading.value = true;
  try {
    const user = tokenManager.getUserInfo();
    if (user && user.id) {
      const response = await uni.request({
        url: `http://localhost:3000/api/users/profile/${user.id}`,
        method: 'GET',
        header: {
          Authorization: `Bearer ${tokenManager.getAccessToken()}`,
        },
      });
      if (response.data.success) {
        userInfo.value = { ...userInfo.value, ...response.data.data };
      } else {
        uni.showToast({ title: '加载用户信息失败', icon: 'error' });
      }
    } else {
      uni.showToast({ title: '用户未登录', icon: 'none' });
    }
  } catch (error) {
    console.error('加载用户信息异常:', error);
    uni.showToast({ title: '网络错误', icon: 'error' });
  } finally {
    isLoading.value = false;
  }
};

const goBack = () => {
  uni.navigateBack();
};

const changeAvatar = () => {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async res => {
      const tempFilePath = res.tempFilePaths[0];
      try {
        uni.showLoading({ title: '上传中...' });
        const uploadTask = uni.uploadFile({
          url: 'http://localhost:3000/api/users/upload-avatar',
          filePath: tempFilePath,
          name: 'avatar',
          header: {
            Authorization: `Bearer ${tokenManager.getAccessToken()}`,
          },
          success: uploadFileRes => {
            const data = JSON.parse(uploadFileRes.data);
            if (data.success) {
              userInfo.value.avatar = data.data.avatarUrl;
              tokenManager.updateUserInfo({ avatar: data.data.avatarUrl });
              uni.showToast({ title: '头像更新成功', icon: 'success' });
            } else {
              uni.showToast({ title: data.message || '上传失败', icon: 'error' });
            }
          },
          fail: err => {
            console.error('上传失败:', err);
            uni.showToast({ title: '上传失败', icon: 'error' });
          },
          complete: () => {
            uni.hideLoading();
          },
        });
      } catch (e) {
        uni.hideLoading();
        console.error('上传异常:', e);
        uni.showToast({ title: '上传异常', icon: 'error' });
      }
    },
  });
};
</script>

<style scoped>
.info-page {
  width: 100%;
  min-height: 100vh;
  background: #f8fafc;
}

/* 导航栏 */
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
  cursor: pointer;
}

.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1f2937;
}

.nav-right {
  width: 80rpx;
  display: flex;
  justify-content: flex-end;
}

.save-btn {
  font-size: 28rpx;
  color: #3b82f6;
  font-weight: 500;
  cursor: pointer;
}

/* 用户信息区域 */
.user-info-section {
  padding: 32rpx 20rpx;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 32rpx;
  cursor: pointer;
  padding: 24rpx;
  border-radius: 16rpx;
  transition: all 0.2s ease;
}

.avatar-section:active {
  background: #f3f4f6;
  transform: scale(0.98);
}

.avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 16rpx;
  border: 3px solid #e5e7eb;
  transition: all 0.2s ease;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.avatar-section:active .avatar {
  border-color: #3b82f6;
  transform: scale(1.05);
}

.change-avatar {
  font-size: 24rpx;
  color: #3b82f6;
  font-weight: 500;
  transition: color 0.2s ease;
}

.avatar-section:active .change-avatar {
  color: #2563eb;
}

/* 信息列表 */
.info-list {
  background: #ffffff;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  border: 1px solid #e5e7eb;
}

.info-item {
  display: flex;
  align-items: center;
  padding: 24rpx 32rpx;
  border-bottom: 1px solid #f3f4f6;
  cursor: pointer;
  transition: background 0.2s ease;
}

.info-item:last-child {
  border-bottom: none;
}

.info-item:active {
  background: #f9fafb;
}

.info-label {
  font-size: 28rpx;
  color: #374151;
  width: 120rpx;
  font-weight: 500;
}

.info-value {
  flex: 1;
  font-size: 28rpx;
  color: #1f2937;
  text-align: right;
  margin-right: 16rpx;
}

.info-value.placeholder {
  color: #9ca3af;
  font-style: italic;
}

.arrow {
  font-size: 24rpx;
  color: #d1d5db;
  font-weight: 400;
}

/* 不可编辑项样式 */
.info-item:nth-child(2) {
  cursor: default;
}

.info-item:nth-child(2):active {
  background: transparent;
}

.info-item:nth-child(2) .arrow {
  display: none;
}
</style>
