<template>
  <view class="login-container">
    <!-- 关闭按钮 -->
    <view class="close-btn" @click="goBack">
      <text class="close-text">×</text>
    </view>

    <!-- 主内容 -->
    <view class="login-content">
      <text class="login-title">登录</text>
      <text class="login-subtitle">发现更多精彩短剧</text>

      <!-- 手机号输入区域 -->
      <view class="phone-input-section">
        <view class="phone-input-container">
          <text class="country-code">+86</text>
          <input
            class="phone-input"
            type="number"
            placeholder="请输入您的手机号"
            v-model="phoneNumber"
            maxlength="11"
          />
        </view>

        <!-- 验证码输入区域 -->
        <view class="code-input-container" v-if="showCodeInput">
          <input class="code-input" type="number" placeholder="请输入验证码" v-model="verificationCode" maxlength="6" />
        </view>

        <!-- 按钮组 -->
        <view class="button-group">
          <!-- 获取验证码按钮 -->
          <view class="get-code-btn" :class="{ disabled: countdown > 0 }" @click="getVerificationCode">
            <text class="get-code-text">
              {{ countdown > 0 ? `${countdown}s后重新获取` : '获取验证码' }}
            </text>
          </view>

          <!-- 登录按钮，仅在输入验证码时显示 -->
          <view class="login-action-btn" v-if="showCodeInput" @click="loginWithVerificationCode">
            <text class="login-action-text">登录</text>
          </view>
        </view>
      </view>

      <!-- 协议勾选 -->
      <view class="agreement-wrapper">
        <view class="agreement-row" @click="toggleAgreement">
          <view class="checkbox-container">
            <view class="checkbox" :class="agreedToTerms ? 'checked' : ''"></view>
          </view>
          <text class="agreement-text">
            已阅读并同意
            <text class="link-text" @click.stop="openUserAgreement">用户协议</text>
            和
            <text class="link-text" @click.stop="openPrivacyPolicy">隐私政策</text>
            以及运营商服务协议
          </text>
        </view>
      </view>

      <!-- 抖音图标 -->
      <view class="douyin-icon" @click="handleDouyinLogin">
        <text class="douyin-symbol">♪</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onUnmounted } from 'vue';
import tokenManager from '../../utils/tokenManager.js';
import { sendSmsCode, loginWithPhone, loginWithDouyin } from '../../api/auth.js';

// --- state ---
const agreedToTerms = ref(false);
const phoneNumber = ref('');
const verificationCode = ref('');
const countdown = ref(0);
const isGettingCode = ref(false);
const isLoggingIn = ref(false);
const showCodeInput = ref(false);
let countdownTimer = null;

// --- methods ---
const goBack = () => {
  uni.navigateBack();
};

const startCountdown = () => {
  countdown.value = 60;
  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }, 1000);
};

const getVerificationCode = async () => {
  if (!phoneNumber.value) {
    return uni.showToast({ title: '请输入手机号', icon: 'none' });
  }
  if (!/^1[3-9]\d{9}$/.test(phoneNumber.value)) {
    return uni.showToast({ title: '请输入正确的手机号', icon: 'none' });
  }
  if (!agreedToTerms.value) {
    return uni.showToast({ title: '请先同意用户协议', icon: 'none' });
  }
  if (isGettingCode.value || countdown.value > 0) {
    return;
  }

  try {
    isGettingCode.value = true;
    uni.showLoading({ title: '发送中...' });
    const response = await tokenManager.sendSmsCode(phoneNumber.value);

    if (response.success) {
      uni.showToast({ title: '验证码已发送', icon: 'success', duration: 1500 });
      startCountdown();
      showCodeInput.value = true;
      if (process.env.NODE_ENV === 'development') {
        setTimeout(() => {
          uni.showModal({
            title: '开发提示',
            content: '开发环境下，验证码将通过控制台输出',
            showCancel: false,
          });
        }, 2000);
      }
    } else {
      throw new Error(response.message || '发送失败');
    }
  } catch (error) {
    console.error('获取验证码失败:', error);
    const errorMessage = error.isNetworkError || error.data?.message || error.message || '获取验证码失败，请重试';
    uni.showToast({ title: errorMessage, icon: 'none', duration: 3000 });
  } finally {
    uni.hideLoading();
    isGettingCode.value = false;
  }
};

const loginWithVerificationCode = async () => {
  if (!verificationCode.value) {
    return uni.showToast({ title: '请输入验证码', icon: 'none' });
  }
  if (verificationCode.value.length !== 6) {
    return uni.showToast({ title: '请输入6位验证码', icon: 'none' });
  }

  try {
    isLoggingIn.value = true;
    uni.showLoading({ title: '登录中...' });
    const response = await tokenManager.loginWithPhone(phoneNumber.value, verificationCode.value);

    if (response.success) {
      tokenManager.saveTokens(response.data);
      uni.showToast({ title: '登录成功', icon: 'success', duration: 1500 });
      setTimeout(() => uni.switchTab({ url: '/pages/index/index' }), 1500);
    } else {
      throw new Error(response.message || '登录失败');
    }
  } catch (error) {
    console.error('登录失败:', error);
    const errorMessage = error.isNetworkError || error.data?.message || error.message || '登录失败，请重试';
    uni.showToast({ title: errorMessage, icon: 'none', duration: 3000 });
  } finally {
    uni.hideLoading();
    isLoggingIn.value = false;
  }
};

const handleDouyinLogin = async () => {
  if (!agreedToTerms.value) {
    return uni.showToast({ title: '请先同意用户协议', icon: 'none' });
  }

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

const toggleAgreement = () => {
  agreedToTerms.value = !agreedToTerms.value;
};

const openUserAgreement = () => {
  console.log('打开用户协议');
};

const openPrivacyPolicy = () => {
  console.log('打开隐私政策');
};

// --- lifecycle hooks ---
onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer);
  }
});
</script>

<style scoped lang="scss">
.login-container {
  width: 100%;
  height: 100vh;
  background: linear-gradient(180deg, #2d5043 0%, #1a3228 50%, #0e1814 100%);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn {
  position: absolute;
  top: 60rpx;
  left: 60rpx;
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.close-text {
  color: rgba(255, 255, 255, 0.9);
  font-size: 60rpx;
  font-weight: 300;
  line-height: 1;
}

.login-content {
  width: 100%;
  max-width: 600rpx;
  padding: 0 80rpx;
  text-align: center;
}

.login-title {
  display: block;
  font-size: 64rpx;
  font-weight: bold;
  color: #ffffff;
  margin-bottom: 30rpx;
  letter-spacing: 4rpx;
}

.login-subtitle {
  display: block;
  font-size: 32rpx;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 120rpx;
}

.phone-input-section {
  margin-bottom: 120rpx;
}

.phone-input-container {
  display: flex;
  align-items: center;
  background: transparent;
  border-bottom: 2rpx solid rgba(255, 255, 255, 0.3);
  padding: 20rpx 0;
  margin-bottom: 60rpx;
}

.code-input-container {
  background: transparent;
  border-bottom: 2rpx solid rgba(255, 255, 255, 0.3);
  padding: 20rpx 0;
  margin-bottom: 60rpx;
}

.country-code {
  color: rgba(255, 255, 255, 0.8);
  font-size: 32rpx;
  margin-right: 40rpx;
  font-weight: 500;
}

.phone-input {
  flex: 1;
  color: rgba(255, 255, 255, 0.8);
  font-size: 32rpx;
  background: transparent;
  border: none;
  outline: none;

  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
}

.code-input {
  width: 100%;
  color: rgba(255, 255, 255, 0.8);
  font-size: 32rpx;
  background: transparent;
  border: none;
  outline: none;
  text-align: center;
  letter-spacing: 8rpx;

  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
    letter-spacing: normal;
  }
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: 40rpx;
}

.get-code-btn,
.login-action-btn {
  width: 100%;
  padding: 35rpx 0;
  border-radius: 60rpx;
  text-align: center;
  transition: background 0.3s ease;
}

.get-code-btn {
  background: linear-gradient(90deg, #3a7c6a, #4a9a88);
  box-shadow: 0 8rpx 24rpx rgba(74, 154, 136, 0.2);

  &.disabled {
    background: rgba(255, 255, 255, 0.3);
    box-shadow: none;
  }
}

.login-action-btn {
  background: linear-gradient(90deg, #ff6b47, #ff9529);
  box-shadow: 0 8rpx 24rpx rgba(255, 107, 71, 0.3);
}

.get-code-text,
.login-action-text {
  color: #ffffff;
  font-size: 36rpx;
  font-weight: bold;
  letter-spacing: 2rpx;
}

.agreement-wrapper {
  margin-bottom: 100rpx;
}

.agreement-row {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
  text-align: left;
}

.checkbox-container {
  margin-top: 6rpx;
}

.checkbox {
  width: 32rpx;
  height: 32rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.6);
  border-radius: 50%;
  position: relative;

  &.checked {
    background: #ff9529;
    border-color: #ff9529;

    &:after {
      content: '✓';
      position: absolute;
      top: -2rpx;
      left: 6rpx;
      color: #ffffff;
      font-size: 20rpx;
      font-weight: bold;
    }
  }
}

.agreement-text {
  color: rgba(255, 255, 255, 0.8);
  font-size: 26rpx;
  line-height: 1.6;
  flex: 1;
}

.link-text {
  color: #ff9529;
  text-decoration: underline;
}

.douyin-icon {
  position: fixed;
  bottom: 100rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 120rpx;
  height: 120rpx;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.douyin-symbol {
  color: rgba(255, 255, 255, 0.6);
  font-size: 48rpx;
  font-weight: bold;
}
</style>
