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
          <u-avatar :src="userInfo.avatarUrl" size="40"></u-avatar>
        </template>
      </u-cell>
      <u-cell title="昵称" :value="userInfo.nickname" isLink @click="showNicknameModal = true"></u-cell>
    </u-cell-group>

    <u-cell-group class="action-group">
      <u-cell title="抖音登录" isLink @click="handleDouyinLogin"></u-cell>
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

    <!-- 修改昵称弹窗 -->
    <u-modal
      :show="showNicknameModal"
      title="修改昵称"
      showCancelButton
      closeOnClickOverlay
      @confirm="handleUpdateNickname"
      @cancel="showNicknameModal = false"
      @close="showNicknameModal = false"
    >
      <view class="nickname-modal-content">
        <u-input placeholder="请输入新的昵称" border="surround" v-model="newNickname" clearable></u-input>
      </view>
    </u-modal>
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import tokenManager from '../../utils/tokenManager.js';
import { loginWithDouyin } from '../../api/auth.js';
import { updateUserInfo } from '../../api/user.js';
import { getApiConfig } from '../../config/index.js';

// --- state ---
const userInfo = reactive({
  avatarUrl: '', // 将 avatar 改为 avatarUrl 以匹配 template 和数据源
  nickname: '未登录',
  id: null,
});

const showLogoutSheet = ref(false);
const showAvatarSheet = ref(false);
const showNicknameModal = ref(false);
const newNickname = ref('');

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
const handleDouyinLogin = async () => {
  uni.showLoading({ title: '正在拉起抖音...' });
  try {
    const loginRes = await uni.login({ provider: 'douyin' });
    const authCode = loginRes.code;
    if (!authCode) throw new Error('未能获取到抖音授权码');

    uni.showLoading({ title: '登录中...' });
    const response = await loginWithDouyin(authCode, tokenManager.getDeviceId());

    if (response.success) {
      tokenManager.saveTokens(response.data);
      uni.showToast({ title: '登录成功', icon: 'success', duration: 1500 });
      checkLoginStatus(); // To update info on page
      setTimeout(() => uni.switchTab({ url: '/pages/index/index' }), 1500);
    } else {
      throw new Error(response.message || '抖音登录失败');
    }
  } catch (error) {
    console.error('抖音登录失败:', error);
    let errorMessage = '抖音登录失败，请重试';
    if (typeof error.errMsg === 'string' && error.errMsg.includes('login:fail')) {
      errorMessage = '您取消了抖音授权';
    } else if (error.isNetworkError || error.data?.message || error.message) {
      errorMessage = error.isNetworkError || error.data?.message || error.message;
    }
    uni.showToast({ title: errorMessage, icon: 'none', duration: 3000 });
  } finally {
    uni.hideLoading();
  }
};

const checkLoginStatus = () => {
  if (tokenManager.isLoggedIn()) {
    const storedUserInfo = tokenManager.getUserInfo();
    console.log('[DEBUG] G-Settings Page: Received user info:', JSON.stringify(storedUserInfo));
    if (storedUserInfo) {
      userInfo.nickname = storedUserInfo.nickname || '用户';
      userInfo.id = storedUserInfo.id;
      // 直接使用tokenManager提供的完整avatarUrl
      userInfo.avatarUrl = storedUserInfo.avatarUrl;
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
  newNickname.value = userInfo.nickname;
  showNicknameModal.value = true;
};

const handleUpdateNickname = async () => {
  if (!newNickname.value.trim()) {
    return uni.showToast({ title: '昵称不能为空', icon: 'none' });
  }
  if (newNickname.value.trim() === userInfo.nickname) {
    showNicknameModal.value = false;
    return;
  }

  uni.showLoading({ title: '正在保存...' });
  try {
    const response = await updateUserInfo(userInfo.id, { nickname: newNickname.value.trim() });
    if (response.data.success) {
      // 更新视图
      userInfo.nickname = response.data.data.nickname;
      // 更新本地存储
      tokenManager.updateUserInfo({ nickname: response.data.data.nickname });

      // 发出全局事件通知更新
      uni.$emit('userInfoUpdated');

      uni.showToast({ title: '昵称修改成功', icon: 'success' });
      showNicknameModal.value = false;
    } else {
      throw new Error(response.data.message || '更新失败');
    }
  } catch (error) {
    console.error('昵称更新失败:', error);
    uni.showToast({ title: error.message || '昵称更新失败', icon: 'none' });
  } finally {
    uni.hideLoading();
  }
};

const handleAvatarAction = async action => {
  let sourceType;
  if (action.name === '拍照') {
    sourceType = ['camera'];
  } else if (action.name === '从相册选择') {
    sourceType = ['album'];
  } else {
    return;
  }

  try {
    const chooseRes = await uni.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: sourceType,
    });

    const tempFilePath = chooseRes.tempFilePaths[0];
    uni.showLoading({ title: '上传中...' });

    const apiConfig = getApiConfig();
    const uploadUrl = `${apiConfig.baseURL}/users/upload/avatar`;
    const accessToken = tokenManager.getAccessToken();

    const uploadRes = await uni.uploadFile({
      url: uploadUrl,
      filePath: tempFilePath,
      name: 'avatar',
      header: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (uploadRes.statusCode !== 200) {
      throw new Error('上传失败，请重试');
    }

    const result = JSON.parse(uploadRes.data);
    if (result.success) {
      const newAvatarPath = result.data.url; // 这是相对路径 /uploads/avatars/...
      // 更新用户信息的头像字段
      const updateRes = await updateUserInfo(userInfo.id, { avatar: newAvatarPath });
      if (updateRes.data.success) {
        // 更新本地存储（存储的是相对路径）
        tokenManager.updateUserInfo({ avatar: newAvatarPath });

        // 发出全局事件通知更新
        uni.$emit('userInfoUpdated');

        // 重新检查登录状态以刷新整个页面的用户信息，包括拼接好的头像URL
        checkLoginStatus();

        uni.showToast({ title: '头像更新成功', icon: 'success' });
      } else {
        throw new Error(updateRes.data.message || '头像信息保存失败');
      }
    } else {
      throw new Error(result.message || '上传失败');
    }
  } catch (error) {
    console.error('头像更新流程失败:', error);
    // 检查是否是用户取消
    if (error.errMsg && (error.errMsg.includes('cancel') || error.errMsg.includes('fail to choose image'))) {
      // 不提示
    } else {
      uni.showToast({ title: error.message || '操作失败', icon: 'none' });
    }
  } finally {
    uni.hideLoading();
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

.nickname-modal-content {
  padding: 20rpx;
}
</style>
