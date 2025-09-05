// utils/tokenManager.js - UniApp版本双Token管理器
import { getApiConfig, getTokenConfig } from '@/config/index.js';

class TokenManager {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
    this.refreshPromise = null; // 防止并发刷新
    this.deviceId = this.getDeviceId();
    this.config = getApiConfig();
    this.tokenConfig = getTokenConfig();
  }

  // 获取或生成设备ID
  getDeviceId() {
    let deviceId = uni.getStorageSync('deviceId');
    if (!deviceId) {
      // 生成设备ID
      const systemInfo = uni.getSystemInfoSync();
      const timestamp = Date.now();
      const random = Math.random().toString(36).substr(2, 9);
      deviceId = `${systemInfo.platform}-${systemInfo.model}-${timestamp}-${random}`;
      uni.setStorageSync('deviceId', deviceId);
    }
    return deviceId;
  }

  // 保存Token
  saveTokens(tokenData) {
    this.accessToken = tokenData.accessToken;
    this.refreshToken = tokenData.refreshToken;

    const prefix = this.tokenConfig.storagePrefix;

    // 安全存储到本地
    uni.setStorageSync(prefix + 'accessToken', tokenData.accessToken);
    uni.setStorageSync(prefix + 'refreshToken', tokenData.refreshToken);
    uni.setStorageSync(prefix + 'tokenExpiry', Date.now() + tokenData.accessTokenExpiresIn * 1000);

    // 保存用户信息
    if (tokenData.user) {
      uni.setStorageSync(prefix + 'userInfo', JSON.stringify(tokenData.user));
    }
  }

  // 获取Access Token
  getAccessToken() {
    if (!this.accessToken) {
      const prefix = this.tokenConfig.storagePrefix;
      this.accessToken = uni.getStorageSync(prefix + 'accessToken');
    }
    return this.accessToken;
  }

  // 获取Refresh Token
  getRefreshToken() {
    if (!this.refreshToken) {
      const prefix = this.tokenConfig.storagePrefix;
      this.refreshToken = uni.getStorageSync(prefix + 'refreshToken');
    }
    return this.refreshToken;
  }

  // 获取用户信息
  getUserInfo() {
    try {
      const prefix = this.tokenConfig.storagePrefix;
      const userInfo = uni.getStorageSync(prefix + 'userInfo');
      return userInfo ? JSON.parse(userInfo) : null;
    } catch (error) {
      console.error('Failed to parse user info:', error);
      return null;
    }
  }

  // 检查Token是否即将过期
  shouldRefreshToken() {
    const prefix = this.tokenConfig.storagePrefix;
    const expiry = uni.getStorageSync(prefix + 'tokenExpiry');
    if (!expiry) return false;

    const now = Date.now();
    const bufferTime = this.tokenConfig.refreshBufferTime * 1000;
    return now + bufferTime >= expiry;
  }

  // 检查是否已登录
  isLoggedIn() {
    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();
    return !!(accessToken && refreshToken);
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
        url: `${this.config.baseURL}/api/auth/refresh`,
        method: 'POST',
        data: {
          refreshToken,
          deviceId: this.deviceId,
        },
        header: {
          'Content-Type': 'application/json',
        },
        timeout: this.config.timeout,
      });

      if (response.statusCode === 200 && response.data.success) {
        this.saveTokens(response.data.data);
        return response.data.data;
      } else {
        throw new Error('Token refresh failed');
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      // 刷新失败，清除所有token，跳转到登录页
      this.clearTokens();
      uni.reLaunch({
        url: '/pages/G-signUp/index',
      });
      throw error;
    }
  }

  // 清除Token
  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;

    const prefix = this.tokenConfig.storagePrefix;
    uni.removeStorageSync(prefix + 'accessToken');
    uni.removeStorageSync(prefix + 'refreshToken');
    uni.removeStorageSync(prefix + 'tokenExpiry');
    uni.removeStorageSync(prefix + 'userInfo');
  }

  // 登出
  async logout(logoutAllDevices = false) {
    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();

    if (accessToken) {
      try {
        await uni.request({
          url: `${this.config.baseURL}/api/auth/logout`,
          method: 'POST',
          header: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          data: {
            refreshToken,
            logoutAllDevices,
            deviceId: this.deviceId,
          },
          timeout: this.config.timeout,
        });
      } catch (error) {
        console.error('Logout API failed:', error);
      }
    }

    this.clearTokens();
    uni.reLaunch({
      url: '/pages/G-signUp/index',
    });
  }

  // 发送短信验证码
  async sendSmsCode(phone) {
    try {
      const response = await uni.request({
        url: `${this.config.baseURL}/api/auth/send-sms`,
        method: 'POST',
        data: { phone },
        header: {
          'Content-Type': 'application/json',
        },
        timeout: this.config.timeout,
      });

      return response.data;
    } catch (error) {
      console.error('Send SMS failed:', error);
      throw error;
    }
  }

  // 手机验证码登录
  async loginWithPhone(phone, code) {
    try {
      const response = await uni.request({
        url: `${this.config.baseURL}/api/auth/login-phone`,
        method: 'POST',
        data: {
          phone,
          code,
          deviceId: this.deviceId,
        },
        header: {
          'Content-Type': 'application/json',
        },
        timeout: this.config.timeout,
      });

      if (response.statusCode === 200 && response.data.success) {
        this.saveTokens(response.data.data);
        return response.data;
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Phone login failed:', error);
      throw error;
    }
  }

  // 抖音登录
  async loginWithDouyin(authCode) {
    try {
      const response = await uni.request({
        url: `${this.config.baseURL}/api/auth/login-douyin`,
        method: 'POST',
        data: {
          authCode,
          deviceId: this.deviceId,
        },
        header: {
          'Content-Type': 'application/json',
        },
        timeout: this.config.timeout,
      });

      if (response.statusCode === 200 && response.data.success) {
        this.saveTokens(response.data.data);
        return response.data;
      } else {
        throw new Error(response.data.message || 'Douyin login failed');
      }
    } catch (error) {
      console.error('Douyin login failed:', error);
      throw error;
    }
  }

  // 验证Token
  async verifyToken() {
    const accessToken = this.getAccessToken();
    if (!accessToken) {
      return false;
    }

    try {
      const response = await uni.request({
        url: `${this.config.baseURL}/api/auth/verify`,
        method: 'GET',
        header: {
          Authorization: `Bearer ${accessToken}`,
        },
        timeout: this.config.timeout,
      });

      return response.statusCode === 200 && response.data.success;
    } catch (error) {
      console.error('Token verification failed:', error);
      return false;
    }
  }
}

export default new TokenManager();
