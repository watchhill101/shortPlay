# 移动端双Token集成指南

## 📖 概述

本指南详细介绍如何在移动端（uniapp/H5/原生App）集成双Token认证机制，包括Access Token和Refresh Token的使用、自动刷新、安全存储等。

## 🔐 双Token机制说明

### Token类型

- **Access Token**: 短期有效（15分钟），用于API请求认证
- **Refresh Token**: 长期有效（7天），用于刷新Access Token

### 优势

- ✅ 提高安全性：Access Token过期时间短，降低泄露风险
- ✅ 用户体验好：Refresh Token自动续期，用户无感知
- ✅ 可控性强：支持单设备/多设备登出
- ✅ 防御攻击：支持Token撤销和黑名单机制

## 🚀 API接口文档

### 1. 用户登录

#### 用户名密码登录

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "testuser",
  "password": "123456",
  "deviceId": "mobile-device-123" // 可选，如果不提供会自动生成
}
```

#### 手机验证码登录

```http
POST /api/auth/login-phone
Content-Type: application/json

{
  "phone": "13800138000",
  "code": "123456",
  "deviceId": "mobile-device-123"
}
```

#### 抖音第三方登录

```http
POST /api/auth/login-douyin
Content-Type: application/json

{
  "authCode": "douyin_auth_code_here",
  "deviceId": "mobile-device-123"
}
```

#### 响应格式

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "accessTokenExpiresIn": 900,
    "refreshTokenExpiresIn": 604800,
    "tokenType": "Bearer",
    "user": {
      "id": "user_id",
      "nickname": "用户昵称",
      "avatar": "头像URL"
    }
  }
}
```

### 2. Token刷新

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "deviceId": "mobile-device-123" // 可选
}
```

### 3. 用户登出

```http
POST /api/auth/logout
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "logoutAllDevices": false // true=退出所有设备
}
```

### 4. 验证Token状态

```http
GET /api/auth/verify
Authorization: Bearer ACCESS_TOKEN
```

### 5. 获取用户会话列表

```http
GET /api/auth/sessions
Authorization: Bearer ACCESS_TOKEN
```

## 📱 移动端实现示例

### UniApp实现

#### 1. Token管理工具类

```javascript
// utils/tokenManager.js
class TokenManager {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
    this.refreshPromise = null; // 防止并发刷新
    this.deviceId = this.getDeviceId();
  }

  // 获取设备ID
  getDeviceId() {
    let deviceId = uni.getStorageSync('deviceId');
    if (!deviceId) {
      // 生成设备ID
      const systemInfo = uni.getSystemInfoSync();
      deviceId = `${systemInfo.platform}-${systemInfo.model}-${Date.now()}`;
      uni.setStorageSync('deviceId', deviceId);
    }
    return deviceId;
  }

  // 保存Token
  saveTokens(tokenData) {
    this.accessToken = tokenData.accessToken;
    this.refreshToken = tokenData.refreshToken;

    // 安全存储到本地
    uni.setStorageSync('accessToken', tokenData.accessToken);
    uni.setStorageSync('refreshToken', tokenData.refreshToken);
    uni.setStorageSync('tokenExpiry', Date.now() + tokenData.accessTokenExpiresIn * 1000);
  }

  // 获取Access Token
  getAccessToken() {
    if (!this.accessToken) {
      this.accessToken = uni.getStorageSync('accessToken');
    }
    return this.accessToken;
  }

  // 获取Refresh Token
  getRefreshToken() {
    if (!this.refreshToken) {
      this.refreshToken = uni.getStorageSync('refreshToken');
    }
    return this.refreshToken;
  }

  // 检查Token是否即将过期（提前2分钟刷新）
  shouldRefreshToken() {
    const expiry = uni.getStorageSync('tokenExpiry');
    const now = Date.now();
    const bufferTime = 2 * 60 * 1000; // 2分钟缓冲
    return expiry && now + bufferTime >= expiry;
  }

  // 刷新Token
  async refreshAccessToken() {
    // 防止并发刷新
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    this.refreshPromise = this.performRefresh(refreshToken);

    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.refreshPromise = null;
    }
  }

  async performRefresh(refreshToken) {
    try {
      const response = await uni.request({
        url: 'http://your-api.com/api/auth/refresh',
        method: 'POST',
        data: {
          refreshToken,
          deviceId: this.deviceId,
        },
      });

      if (response.data.success) {
        this.saveTokens(response.data.data);
        return response.data.data;
      } else {
        throw new Error('Token refresh failed');
      }
    } catch (error) {
      // 刷新失败，清除所有token，跳转到登录页
      this.clearTokens();
      uni.reLaunch({
        url: '/pages/login/login',
      });
      throw error;
    }
  }

  // 清除Token
  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    uni.removeStorageSync('accessToken');
    uni.removeStorageSync('refreshToken');
    uni.removeStorageSync('tokenExpiry');
  }

  // 登出
  async logout(logoutAllDevices = false) {
    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();

    if (accessToken) {
      try {
        await uni.request({
          url: 'http://your-api.com/api/auth/logout',
          method: 'POST',
          header: {
            Authorization: `Bearer ${accessToken}`,
          },
          data: {
            refreshToken,
            logoutAllDevices,
          },
        });
      } catch (error) {
        console.error('Logout API failed:', error);
      }
    }

    this.clearTokens();
    uni.reLaunch({
      url: '/pages/login/login',
    });
  }
}

export default new TokenManager();
```

#### 2. HTTP请求拦截器

```javascript
// utils/request.js
import tokenManager from './tokenManager.js';

class HttpClient {
  constructor() {
    this.baseURL = 'http://your-api.com';
    this.setupInterceptors();
  }

  setupInterceptors() {
    // 请求拦截
    uni.addInterceptor('request', {
      invoke: args => {
        // 添加基础URL
        if (!args.url.startsWith('http')) {
          args.url = this.baseURL + args.url;
        }

        // 添加Access Token
        const accessToken = tokenManager.getAccessToken();
        if (accessToken) {
          args.header = args.header || {};
          args.header['Authorization'] = `Bearer ${accessToken}`;
        }

        // 添加设备ID
        args.header = args.header || {};
        args.header['X-Device-ID'] = tokenManager.deviceId;

        return args;
      },
    });
  }

  async request(options) {
    // 检查是否需要刷新token
    if (tokenManager.shouldRefreshToken()) {
      try {
        await tokenManager.refreshAccessToken();
      } catch (error) {
        console.error('Token refresh failed:', error);
        // 刷新失败会自动跳转到登录页
        return Promise.reject(error);
      }
    }

    try {
      const response = await uni.request(options);

      // 检查响应状态
      if (response.statusCode === 401) {
        const errorCode = response.data?.code;

        if (errorCode === 'INVALID_ACCESS_TOKEN') {
          // Access Token无效，尝试刷新
          try {
            await tokenManager.refreshAccessToken();
            // 重新发送请求
            const retryResponse = await uni.request(options);
            return retryResponse;
          } catch (refreshError) {
            // 刷新失败，跳转登录
            return Promise.reject(refreshError);
          }
        } else {
          // 其他401错误，直接跳转登录
          tokenManager.clearTokens();
          uni.reLaunch({ url: '/pages/login/login' });
          return Promise.reject(new Error('Unauthorized'));
        }
      }

      return response;
    } catch (error) {
      console.error('Request failed:', error);
      return Promise.reject(error);
    }
  }

  // 便捷方法
  get(url, data = {}) {
    return this.request({
      url,
      method: 'GET',
      data,
    });
  }

  post(url, data = {}) {
    return this.request({
      url,
      method: 'POST',
      data,
    });
  }
}

export default new HttpClient();
```

#### 3. 登录页面示例

```vue
<!-- pages/login/login.vue -->
<template>
  <view class="login-container">
    <view class="login-form">
      <input v-model="username" placeholder="用户名" class="input-field" />
      <input v-model="password" placeholder="密码" type="password" class="input-field" />
      <button @click="handleLogin" class="login-btn">登录</button>
    </view>
  </view>
</template>

<script>
import tokenManager from '@/utils/tokenManager.js';
import httpClient from '@/utils/request.js';

export default {
  data() {
    return {
      username: '',
      password: '',
    };
  },

  methods: {
    async handleLogin() {
      if (!this.username || !this.password) {
        uni.showToast({
          title: '请输入用户名和密码',
          icon: 'none',
        });
        return;
      }

      uni.showLoading({ title: '登录中...' });

      try {
        const response = await httpClient.post('/api/auth/login', {
          username: this.username,
          password: this.password,
          deviceId: tokenManager.deviceId,
        });

        if (response.data.success) {
          // 保存token
          tokenManager.saveTokens(response.data.data);

          uni.showToast({
            title: '登录成功',
            icon: 'success',
          });

          // 跳转到主页
          uni.reLaunch({
            url: '/pages/home/home',
          });
        } else {
          uni.showToast({
            title: response.data.message || '登录失败',
            icon: 'none',
          });
        }
      } catch (error) {
        uni.showToast({
          title: '网络错误',
          icon: 'none',
        });
      } finally {
        uni.hideLoading();
      }
    },
  },
};
</script>
```

### Vue3实现

#### 1. Vue3登录页面组件

```vue
<!-- pages/login/Login.vue -->
<template>
  <div class="login-container">
    <div class="login-card">
      <!-- 标题区域 -->
      <div class="login-header">
        <h1 class="app-title">短剧播放</h1>
        <p class="app-subtitle">精彩短剧，随时观看</p>
      </div>

      <!-- 登录表单 -->
      <div class="login-form">
        <!-- Tab切换 -->
        <div class="login-tabs">
          <div :class="['tab-item', { active: loginType === 'password' }]" @click="switchLoginType('password')">
            密码登录
          </div>
          <div :class="['tab-item', { active: loginType === 'phone' }]" @click="switchLoginType('phone')">
            验证码登录
          </div>
        </div>

        <!-- 密码登录表单 -->
        <div v-show="loginType === 'password'" class="form-content">
          <div class="input-group">
            <input
              v-model="passwordForm.username"
              type="text"
              placeholder="请输入用户名"
              class="form-input"
              :class="{ error: errors.username }"
              @input="clearError('username')"
            />
            <span v-if="errors.username" class="error-text">{{ errors.username }}</span>
          </div>

          <div class="input-group">
            <div class="password-input">
              <input
                v-model="passwordForm.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="请输入密码"
                class="form-input"
                :class="{ error: errors.password }"
                @input="clearError('password')"
              />
              <span class="password-toggle" @click="showPassword = !showPassword">
                {{ showPassword ? '👁️' : '👁️‍🗨️' }}
              </span>
            </div>
            <span v-if="errors.password" class="error-text">{{ errors.password }}</span>
          </div>

          <button class="login-btn" :class="{ loading: loading }" :disabled="loading" @click="handlePasswordLogin">
            <span v-if="loading" class="loading-spinner"></span>
            {{ loading ? '登录中...' : '登录' }}
          </button>
        </div>

        <!-- 验证码登录表单 -->
        <div v-show="loginType === 'phone'" class="form-content">
          <div class="input-group">
            <input
              v-model="phoneForm.phone"
              type="tel"
              placeholder="请输入手机号"
              class="form-input"
              :class="{ error: errors.phone }"
              @input="clearError('phone')"
            />
            <span v-if="errors.phone" class="error-text">{{ errors.phone }}</span>
          </div>

          <div class="input-group">
            <div class="code-input">
              <input
                v-model="phoneForm.code"
                type="text"
                placeholder="请输入验证码"
                class="form-input"
                :class="{ error: errors.code }"
                @input="clearError('code')"
              />
              <button class="code-btn" :disabled="codeSending || countdown > 0" @click="sendSmsCode">
                {{ getCodeButtonText }}
              </button>
            </div>
            <span v-if="errors.code" class="error-text">{{ errors.code }}</span>
          </div>

          <button class="login-btn" :class="{ loading: loading }" :disabled="loading" @click="handlePhoneLogin">
            <span v-if="loading" class="loading-spinner"></span>
            {{ loading ? '登录中...' : '登录' }}
          </button>
        </div>

        <!-- 第三方登录 -->
        <div class="third-party-login">
          <div class="divider">
            <span>或</span>
          </div>

          <div class="third-party-buttons">
            <button class="third-party-btn douyin" @click="handleDouyinLogin">
              <img src="/icons/douyin.png" alt="抖音" class="icon" />
              抖音登录
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Toast提示 -->
    <div v-if="toast.show" :class="['toast', toast.type]">
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import tokenManager from '@/utils/tokenManager.js';
import httpClient from '@/utils/request.js';

const router = useRouter();

// 响应式数据
const loginType = ref('password');
const loading = ref(false);
const showPassword = ref(false);
const codeSending = ref(false);
const countdown = ref(0);
let countdownTimer = null;

// 表单数据
const passwordForm = reactive({
  username: '',
  password: '',
});

const phoneForm = reactive({
  phone: '',
  code: '',
});

// 错误信息
const errors = reactive({});

// Toast提示
const toast = reactive({
  show: false,
  message: '',
  type: 'info', // info, success, error
});

// 计算属性
const getCodeButtonText = computed(() => {
  if (codeSending.value) return '发送中...';
  if (countdown.value > 0) return `${countdown.value}s后重新发送`;
  return '获取验证码';
});

// 方法
const switchLoginType = type => {
  loginType.value = type;
  clearAllErrors();
};

const clearError = field => {
  if (errors[field]) {
    delete errors[field];
  }
};

const clearAllErrors = () => {
  Object.keys(errors).forEach(key => {
    delete errors[key];
  });
};

const showToast = (message, type = 'info', duration = 3000) => {
  toast.message = message;
  toast.type = type;
  toast.show = true;

  setTimeout(() => {
    toast.show = false;
  }, duration);
};

const validatePasswordForm = () => {
  clearAllErrors();
  let isValid = true;

  if (!passwordForm.username.trim()) {
    errors.username = '请输入用户名';
    isValid = false;
  }

  if (!passwordForm.password.trim()) {
    errors.password = '请输入密码';
    isValid = false;
  } else if (passwordForm.password.length < 6) {
    errors.password = '密码至少6位';
    isValid = false;
  }

  return isValid;
};

const validatePhoneForm = () => {
  clearAllErrors();
  let isValid = true;

  const phoneRegex = /^1[3-9]\d{9}$/;
  if (!phoneForm.phone.trim()) {
    errors.phone = '请输入手机号';
    isValid = false;
  } else if (!phoneRegex.test(phoneForm.phone)) {
    errors.phone = '手机号格式不正确';
    isValid = false;
  }

  if (!phoneForm.code.trim()) {
    errors.code = '请输入验证码';
    isValid = false;
  } else if (phoneForm.code.length !== 6) {
    errors.code = '验证码应为6位数字';
    isValid = false;
  }

  return isValid;
};

// 密码登录
const handlePasswordLogin = async () => {
  if (!validatePasswordForm()) return;

  loading.value = true;

  try {
    const response = await httpClient.post('/api/auth/login', {
      username: passwordForm.username,
      password: passwordForm.password,
      deviceId: tokenManager.deviceId,
    });

    if (response.data.success) {
      // 保存token
      tokenManager.saveTokens(response.data.data);

      showToast('登录成功', 'success');

      // 跳转到主页
      setTimeout(() => {
        router.push('/home');
      }, 1000);
    } else {
      showToast(response.data.message || '登录失败', 'error');
    }
  } catch (error) {
    console.error('Login failed:', error);
    showToast('网络错误，请重试', 'error');
  } finally {
    loading.value = false;
  }
};

// 发送短信验证码
const sendSmsCode = async () => {
  const phoneRegex = /^1[3-9]\d{9}$/;
  if (!phoneRegex.test(phoneForm.phone)) {
    showToast('请输入正确的手机号', 'error');
    return;
  }

  codeSending.value = true;

  try {
    const response = await httpClient.post('/api/auth/send-sms', {
      phone: phoneForm.phone,
    });

    if (response.data.success) {
      showToast('验证码已发送', 'success');
      startCountdown();
    } else {
      showToast(response.data.message || '发送失败', 'error');
    }
  } catch (error) {
    console.error('Send SMS failed:', error);
    showToast('发送失败，请重试', 'error');
  } finally {
    codeSending.value = false;
  }
};

// 开始倒计时
const startCountdown = () => {
  countdown.value = 60;
  countdownTimer = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }, 1000);
};

// 手机验证码登录
const handlePhoneLogin = async () => {
  if (!validatePhoneForm()) return;

  loading.value = true;

  try {
    const response = await httpClient.post('/api/auth/login-phone', {
      phone: phoneForm.phone,
      code: phoneForm.code,
      deviceId: tokenManager.deviceId,
    });

    if (response.data.success) {
      // 保存token
      tokenManager.saveTokens(response.data.data);

      showToast('登录成功', 'success');

      // 跳转到主页
      setTimeout(() => {
        router.push('/home');
      }, 1000);
    } else {
      showToast(response.data.message || '登录失败', 'error');
    }
  } catch (error) {
    console.error('Phone login failed:', error);
    showToast('网络错误，请重试', 'error');
  } finally {
    loading.value = false;
  }
};

// 抖音登录
const handleDouyinLogin = async () => {
  showToast('抖音登录功能开发中...', 'info');

  // 抖音登录逻辑
  // 1. 调用抖音SDK获取授权码
  // 2. 发送到后端验证

  /*
  try {
    // 假设已获取到authCode
    const authCode = 'douyin_auth_code'
    
    const response = await httpClient.post('/api/auth/login-douyin', {
      authCode,
      deviceId: tokenManager.deviceId
    })

    if (response.data.success) {
      tokenManager.saveTokens(response.data.data)
      showToast('登录成功', 'success')
      setTimeout(() => {
        router.push('/home')
      }, 1000)
    }
  } catch (error) {
    showToast('抖音登录失败', 'error')
  }
  */
};

// 生命周期
onMounted(() => {
  // 检查是否已登录
  const accessToken = tokenManager.getAccessToken();
  if (accessToken) {
    router.push('/home');
  }
});

onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer);
  }
});
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;
}

.login-card {
  background: white;
  border-radius: 16px;
  padding: 40px 30px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
}

.login-header {
  text-align: center;
  margin-bottom: 40px;
}

.app-title {
  font-size: 28px;
  font-weight: bold;
  color: #333;
  margin: 0 0 8px 0;
}

.app-subtitle {
  font-size: 14px;
  color: #666;
  margin: 0;
}

.login-tabs {
  display: flex;
  margin-bottom: 30px;
  background: #f5f5f5;
  border-radius: 8px;
  padding: 4px;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
  color: #666;
}

.tab-item.active {
  background: white;
  color: #667eea;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.form-content {
  margin-bottom: 30px;
}

.input-group {
  margin-bottom: 20px;
}

.form-input {
  width: 100%;
  padding: 16px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s ease;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #667eea;
}

.form-input.error {
  border-color: #ff4757;
}

.password-input,
.code-input {
  position: relative;
  display: flex;
  align-items: center;
}

.password-toggle {
  position: absolute;
  right: 16px;
  cursor: pointer;
  font-size: 18px;
  user-select: none;
}

.code-btn {
  position: absolute;
  right: 8px;
  background: #667eea;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.code-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.code-btn:not(:disabled):hover {
  background: #5a6fd8;
}

.error-text {
  color: #ff4757;
  font-size: 12px;
  margin-top: 4px;
  display: block;
}

.login-btn {
  width: 100%;
  padding: 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-btn:not(:disabled):hover {
  background: #5a6fd8;
  transform: translateY(-2px);
}

.login-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none;
}

.login-btn.loading {
  pointer-events: none;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 8px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.third-party-login {
  margin-top: 40px;
}

.divider {
  text-align: center;
  position: relative;
  margin: 20px 0;
}

.divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: #e1e5e9;
}

.divider span {
  background: white;
  padding: 0 16px;
  color: #666;
  font-size: 14px;
}

.third-party-buttons {
  display: flex;
  gap: 12px;
}

.third-party-btn {
  flex: 1;
  padding: 14px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
}

.third-party-btn:hover {
  border-color: #667eea;
  color: #667eea;
}

.third-party-btn.douyin {
  color: #333;
}

.third-party-btn .icon {
  width: 20px;
  height: 20px;
}

.toast {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  padding: 16px 24px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  z-index: 9999;
  font-size: 14px;
  min-width: 200px;
  text-align: center;
}

.toast.success {
  color: #27ae60;
  border-left: 4px solid #27ae60;
}

.toast.error {
  color: #e74c3c;
  border-left: 4px solid #e74c3c;
}

.toast.info {
  color: #3498db;
  border-left: 4px solid #3498db;
}

/* 移动端适配 */
@media (max-width: 480px) {
  .login-container {
    padding: 16px;
  }

  .login-card {
    padding: 30px 20px;
  }

  .app-title {
    font-size: 24px;
  }

  .form-input,
  .login-btn {
    padding: 14px;
    font-size: 14px;
  }
}
</style>
```

#### 2. Vue3 TokenManager工具类

```javascript
// utils/tokenManager.js (Vue3版本)
import { ref, reactive } from 'vue';

class TokenManager {
  constructor() {
    this.storagePrefix = 'shortplay_';
    this.deviceId = this.getDeviceId();

    // 响应式状态
    this.isLoggedIn = ref(false);
    this.userInfo = reactive({
      id: null,
      nickname: '',
      avatar: '',
    });

    this.checkLoginStatus();
  }

  getDeviceId() {
    let deviceId = localStorage.getItem(this.storagePrefix + 'deviceId');
    if (!deviceId) {
      deviceId = this.generateDeviceId();
      localStorage.setItem(this.storagePrefix + 'deviceId', deviceId);
    }
    return deviceId;
  }

  generateDeviceId() {
    // H5环境生成设备ID
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 9);
    const userAgent = navigator.userAgent;
    const screen = `${screen.width}x${screen.height}`;

    // 创建设备指纹
    const fingerprint = `web-${timestamp}-${random}-${btoa(userAgent + screen).substr(0, 8)}`;
    return fingerprint;
  }

  saveTokens(tokenData) {
    localStorage.setItem(this.storagePrefix + 'accessToken', tokenData.accessToken);
    localStorage.setItem(this.storagePrefix + 'refreshToken', tokenData.refreshToken);
    localStorage.setItem(this.storagePrefix + 'tokenExpiry', Date.now() + tokenData.accessTokenExpiresIn * 1000);

    // 保存用户信息
    if (tokenData.user) {
      this.updateUserInfo(tokenData.user);
      localStorage.setItem(this.storagePrefix + 'userInfo', JSON.stringify(tokenData.user));
    }

    this.isLoggedIn.value = true;
  }

  updateUserInfo(user) {
    this.userInfo.id = user.id;
    this.userInfo.nickname = user.nickname;
    this.userInfo.avatar = user.avatar;
  }

  getAccessToken() {
    return localStorage.getItem(this.storagePrefix + 'accessToken');
  }

  getRefreshToken() {
    return localStorage.getItem(this.storagePrefix + 'refreshToken');
  }

  shouldRefreshToken() {
    const expiry = localStorage.getItem(this.storagePrefix + 'tokenExpiry');
    const now = Date.now();
    const bufferTime = 2 * 60 * 1000; // 2分钟缓冲
    return expiry && now + bufferTime >= parseInt(expiry);
  }

  async refreshAccessToken() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken,
          deviceId: this.deviceId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        this.saveTokens(data.data);
        return data.data;
      } else {
        throw new Error('Token refresh failed');
      }
    } catch (error) {
      this.clearTokens();
      window.location.href = '/login';
      throw error;
    }
  }

  clearTokens() {
    localStorage.removeItem(this.storagePrefix + 'accessToken');
    localStorage.removeItem(this.storagePrefix + 'refreshToken');
    localStorage.removeItem(this.storagePrefix + 'tokenExpiry');
    localStorage.removeItem(this.storagePrefix + 'userInfo');

    this.isLoggedIn.value = false;
    this.userInfo.id = null;
    this.userInfo.nickname = '';
    this.userInfo.avatar = '';
  }

  async logout(logoutAllDevices = false) {
    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();

    if (accessToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            refreshToken,
            logoutAllDevices,
          }),
        });
      } catch (error) {
        console.error('Logout API failed:', error);
      }
    }

    this.clearTokens();
    window.location.href = '/login';
  }

  checkLoginStatus() {
    const accessToken = this.getAccessToken();
    const userInfo = localStorage.getItem(this.storagePrefix + 'userInfo');

    if (accessToken && userInfo) {
      try {
        const user = JSON.parse(userInfo);
        this.updateUserInfo(user);
        this.isLoggedIn.value = true;
      } catch (error) {
        this.clearTokens();
      }
    }
  }

  // 获取响应式状态
  getLoginState() {
    return {
      isLoggedIn: this.isLoggedIn,
      userInfo: this.userInfo,
    };
  }
}

export default new TokenManager();
```

#### 3. Vue3请求工具类

```javascript
// utils/request.js (Vue3版本)
import axios from 'axios';
import tokenManager from './tokenManager.js';

// 创建axios实例
const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
httpClient.interceptors.request.use(
  async config => {
    // 检查是否需要刷新token
    if (tokenManager.shouldRefreshToken()) {
      try {
        await tokenManager.refreshAccessToken();
      } catch (error) {
        console.error('Token refresh failed in request interceptor:', error);
        tokenManager.clearTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    // 添加token
    const accessToken = tokenManager.getAccessToken();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    // 添加设备ID
    config.headers['X-Device-ID'] = tokenManager.deviceId;

    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// 响应拦截器
httpClient.interceptors.response.use(
  response => {
    return response;
  },
  async error => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const errorCode = error.response.data?.code;

      if (errorCode === 'INVALID_ACCESS_TOKEN') {
        try {
          await tokenManager.refreshAccessToken();
          // 重新发送请求
          const accessToken = tokenManager.getAccessToken();
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return httpClient(originalRequest);
        } catch (refreshError) {
          console.error('Token refresh failed in response interceptor:', refreshError);
          tokenManager.clearTokens();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        // 其他401错误，直接清除token并跳转
        tokenManager.clearTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default httpClient;
```

#### 4. Vue3路由配置

```javascript
// router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import tokenManager from '@/utils/tokenManager.js';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/pages/login/Login.vue'),
    meta: {
      requiresAuth: false,
      title: '登录',
    },
  },
  {
    path: '/',
    redirect: '/home',
  },
  {
    path: '/home',
    name: 'Home',
    component: () => import('@/pages/home/Home.vue'),
    meta: {
      requiresAuth: true,
      title: '首页',
    },
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/pages/profile/Profile.vue'),
    meta: {
      requiresAuth: true,
      title: '个人中心',
    },
  },
  {
    path: '/video/:id',
    name: 'VideoDetail',
    component: () => import('@/pages/video/VideoDetail.vue'),
    meta: {
      requiresAuth: true,
      title: '视频详情',
    },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/pages/error/404.vue'),
    meta: {
      requiresAuth: false,
      title: '页面不存在',
    },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 全局路由守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  document.title = to.meta.title ? `${to.meta.title} - 短剧播放` : '短剧播放';

  // 检查是否需要认证
  if (to.meta.requiresAuth) {
    const accessToken = tokenManager.getAccessToken();

    if (!accessToken) {
      // 没有token，跳转到登录页
      next('/login');
      return;
    }

    // 检查token是否过期
    if (tokenManager.shouldRefreshToken()) {
      // Token即将过期，尝试刷新
      tokenManager
        .refreshAccessToken()
        .then(() => {
          next();
        })
        .catch(() => {
          // 刷新失败，跳转到登录页
          next('/login');
        });
      return;
    }
  } else if (to.path === '/login') {
    // 如果已登录且访问登录页，重定向到首页
    const accessToken = tokenManager.getAccessToken();
    if (accessToken) {
      next('/home');
      return;
    }
  }

  next();
});

export default router;
```

#### 5. Vue3主应用入口

```javascript
// main.js
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import tokenManager from './utils/tokenManager.js';

// 创建应用实例
const app = createApp(App);

// 全局属性
app.config.globalProperties.$tokenManager = tokenManager;

// 全局错误处理
app.config.errorHandler = (err, vm, info) => {
  console.error('Vue Global Error:', err, info);

  // 如果是认证相关错误，可以在这里统一处理
  if (err.message.includes('401') || err.message.includes('Unauthorized')) {
    tokenManager.clearTokens();
    router.push('/login');
  }
};

// 使用路由
app.use(router);

// 挂载应用
app.mount('#app');
```

#### 6. App.vue根组件

```vue
<!-- App.vue -->
<template>
  <div id="app">
    <!-- 全局加载状态 -->
    <div v-if="globalLoading" class="global-loading">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>

    <!-- 路由视图 -->
    <router-view v-else />

    <!-- 全局Toast组件 -->
    <Toast ref="toastRef" />
  </div>
</template>

<script setup>
import { ref, onMounted, provide } from 'vue';
import { useRouter } from 'vue-router';
import tokenManager from '@/utils/tokenManager.js';
import Toast from '@/components/Toast.vue';

const router = useRouter();
const globalLoading = ref(true);
const toastRef = ref(null);

// 提供全局toast方法
const showToast = (message, type = 'info', duration = 3000) => {
  if (toastRef.value) {
    toastRef.value.show(message, type, duration);
  }
};

// 向子组件提供toast方法
provide('showToast', showToast);

// 初始化应用
onMounted(async () => {
  try {
    // 检查登录状态
    const { isLoggedIn } = tokenManager.getLoginState();

    if (isLoggedIn.value) {
      // 验证当前token是否有效
      try {
        await fetch('/api/auth/verify', {
          headers: {
            Authorization: `Bearer ${tokenManager.getAccessToken()}`,
          },
        });
      } catch (error) {
        // Token无效，清除并跳转登录
        tokenManager.clearTokens();
        router.push('/login');
      }
    }
  } catch (error) {
    console.error('App initialization failed:', error);
  } finally {
    globalLoading.value = false;
  }
});
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans',
    'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #f5f5f5;
}

#app {
  min-height: 100vh;
}

.global-loading {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
```

#### 7. 环境配置文件

```javascript
// .env.development
VITE_API_BASE_URL=http://localhost:3000
VITE_APP_TITLE=短剧播放

// .env.production
VITE_API_BASE_URL=https://your-api-domain.com
VITE_APP_TITLE=短剧播放
```

#### 8. Vite配置文件

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 8080,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router'],
          axios: ['axios'],
        },
      },
    },
  },
});
```

### H5/Web实现

#### localStorage管理

```javascript
// utils/tokenManager.js (H5版本)
class TokenManager {
  constructor() {
    this.storagePrefix = 'shortplay_';
    this.deviceId = this.getDeviceId();
  }

  getDeviceId() {
    let deviceId = localStorage.getItem(this.storagePrefix + 'deviceId');
    if (!deviceId) {
      deviceId = 'web-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem(this.storagePrefix + 'deviceId', deviceId);
    }
    return deviceId;
  }

  saveTokens(tokenData) {
    localStorage.setItem(this.storagePrefix + 'accessToken', tokenData.accessToken);
    localStorage.setItem(this.storagePrefix + 'refreshToken', tokenData.refreshToken);
    localStorage.setItem(this.storagePrefix + 'tokenExpiry', Date.now() + tokenData.accessTokenExpiresIn * 1000);
  }

  getAccessToken() {
    return localStorage.getItem(this.storagePrefix + 'accessToken');
  }

  getRefreshToken() {
    return localStorage.getItem(this.storagePrefix + 'refreshToken');
  }

  shouldRefreshToken() {
    const expiry = localStorage.getItem(this.storagePrefix + 'tokenExpiry');
    const now = Date.now();
    const bufferTime = 2 * 60 * 1000;
    return expiry && now + bufferTime >= parseInt(expiry);
  }

  clearTokens() {
    localStorage.removeItem(this.storagePrefix + 'accessToken');
    localStorage.removeItem(this.storagePrefix + 'refreshToken');
    localStorage.removeItem(this.storagePrefix + 'tokenExpiry');
  }

  // ... 其他方法类似UniApp版本
}
```

#### Axios拦截器

```javascript
// utils/request.js (H5版本)
import axios from 'axios';
import tokenManager from './tokenManager.js';

const httpClient = axios.create({
  baseURL: 'http://your-api.com',
  timeout: 10000,
});

// 请求拦截器
httpClient.interceptors.request.use(
  async config => {
    // 检查是否需要刷新token
    if (tokenManager.shouldRefreshToken()) {
      try {
        await tokenManager.refreshAccessToken();
      } catch (error) {
        // 刷新失败，跳转登录
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    // 添加token
    const accessToken = tokenManager.getAccessToken();
    if (accessToken) {
      config.headers['Authorization'] = `Bearer ${accessToken}`;
    }

    // 添加设备ID
    config.headers['X-Device-ID'] = tokenManager.deviceId;

    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// 响应拦截器
httpClient.interceptors.response.use(
  response => {
    return response;
  },
  async error => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        await tokenManager.refreshAccessToken();
        // 重新发送请求
        const accessToken = tokenManager.getAccessToken();
        originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
        return httpClient(originalRequest);
      } catch (refreshError) {
        // 刷新失败，跳转登录
        tokenManager.clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default httpClient;
```

## 🔒 安全最佳实践

### 1. Token存储

- **移动端**: 使用安全存储（iOS Keychain, Android Keystore）
- **H5**: 使用localStorage，避免sessionStorage
- **小程序**: 使用wx.setStorageSync加密存储

### 2. 设备管理

```javascript
// 生成唯一设备ID
function generateDeviceId() {
  // 移动端
  const systemInfo = uni.getSystemInfoSync();
  return `${systemInfo.platform}-${systemInfo.model}-${systemInfo.deviceId}`;

  // H5端
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillText('Device fingerprint', 2, 2);
  return canvas.toDataURL().slice(-50);
}
```

### 3. 网络安全

```javascript
// 请求加密（可选）
function encryptRequest(data) {
  // 使用AES加密敏感数据
  return CryptoJS.AES.encrypt(JSON.stringify(data), secretKey).toString();
}
```

### 4. 错误处理

```javascript
// 统一错误处理
function handleAuthError(error) {
  const errorMap = {
    INVALID_ACCESS_TOKEN: '登录已过期，请重新登录',
    INVALID_REFRESH_TOKEN: '认证失效，请重新登录',
    USER_DISABLED: '账号已被禁用',
    DEVICE_MISMATCH: '设备不匹配，请重新登录',
  };

  const message = errorMap[error.code] || '认证失败';
  uni.showToast({ title: message, icon: 'none' });
}
```

## 🧪 测试指南

### 1. Token过期测试

```javascript
// 模拟token过期
localStorage.setItem('shortplay_tokenExpiry', Date.now() - 1000);
```

### 2. 网络断线重连测试

```javascript
// 监听网络状态
uni.onNetworkStatusChange(res => {
  if (res.isConnected) {
    // 网络恢复，重新验证token
    tokenManager.verifyToken();
  }
});
```

### 3. 多设备登录测试

```javascript
// 在不同设备上登录同一账号，测试token管理
```

## ❓ 常见问题

### Q1: Token刷新失败怎么办？

A: 自动清除本地token，跳转到登录页面，提示用户重新登录。

### Q2: 如何处理应用后台运行？

A: 应用恢复前台时检查token有效性，必要时静默刷新。

### Q3: 如何实现"记住我"功能？

A: 延长refresh token的有效期，比如30天。

### Q4: 如何防止token被盗用？

A: 绑定设备ID，添加IP白名单，使用HTTPS传输。

## 📚 相关文档

- [JWT官方文档](https://jwt.io/)
- [UniApp认证文档](https://uniapp.dcloud.io/)
- [移动端安全指南](https://owasp.org/www-project-mobile-security/)

---

如有问题，请联系开发团队或查看项目Wiki。
