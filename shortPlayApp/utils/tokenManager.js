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

    // 多账户管理
    const prefix = this.tokenConfig.storagePrefix;
    this.accountsKey = prefix + 'savedAccounts'; // 存储多个用户账号
    this.currentAccountIdKey = prefix + 'currentAccountId'; // 当前用户标识
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

  // --- 多账户管理 ---

  // 保存用户到多账户列表
  saveAccount(tokenData) {
    try {
      if (!tokenData.user || !tokenData.user.id) {
        return false;
      }
      const savedAccounts = this.getSavedAccounts();
      const existingIndex = savedAccounts.findIndex(account => account.user.id === tokenData.user.id);

      const accountData = {
        ...tokenData,
        lastLoginTime: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        // 更新已存在的用户
        savedAccounts[existingIndex] = accountData;
      } else {
        // 添加新用户
        savedAccounts.push(accountData);
      }

      uni.setStorageSync(this.accountsKey, JSON.stringify(savedAccounts));
      uni.setStorageSync(this.currentAccountIdKey, tokenData.user.id);
      return true;
    } catch (_e) {
      return false;
    }
  }

  // 获取已保存的用户列表
  getSavedAccounts() {
    try {
      const accounts = uni.getStorageSync(this.accountsKey);
      return accounts ? JSON.parse(accounts) : [];
    } catch (_e) {
      return [];
    }
  }

  // 切换到指定用户
  switchToAccount(accountId) {
    try {
      const savedAccounts = this.getSavedAccounts();
      const targetAccount = savedAccounts.find(account => account.user.id === accountId);

      if (!targetAccount) {
        throw new Error('账户不存在');
      }

      // 设置为当前用户
      this.saveTokens(targetAccount);
      uni.setStorageSync(this.currentAccountIdKey, accountId);

      // 更新最后登录时间
      targetAccount.lastLoginTime = new Date().toISOString();
      this.saveAccount(targetAccount); // 这会重新保存整个列表

      return true;
    } catch (_e) {
      return false;
    }
  }

  // 获取当前用户ID
  getCurrentAccountId() {
    try {
      return uni.getStorageSync(this.currentAccountIdKey);
    } catch (_e) {
      return null;
    }
  }

  // 从用户列表中删除用户
  removeAccount(accountId) {
    try {
      const savedAccounts = this.getSavedAccounts();
      const filteredAccounts = savedAccounts.filter(account => account.user.id !== accountId);
      uni.setStorageSync(this.accountsKey, JSON.stringify(filteredAccounts));

      // 如果删除的是当前用户，需要处理
      const currentAccountId = this.getCurrentAccountId();
      if (currentAccountId === accountId) {
        if (filteredAccounts.length > 0) {
          // 切换到最近登录的用户
          const lastAccount = filteredAccounts.sort((a, b) => new Date(b.lastLoginTime) - new Date(a.lastLoginTime))[0];
          this.switchToAccount(lastAccount.user.id);
        } else {
          // 没有其他用户，清除当前用户信息并登出
          this.logout();
        }
      }

      return true;
    } catch (_e) {
      return false;
    }
  }

  // --- Token 管理 ---

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
    } catch (_error) {
      return null;
    }
  }

  // 更新本地存储的用户信息
  updateUserInfo(updatedFields) {
    try {
      const currentUserInfo = this.getUserInfo();
      if (currentUserInfo) {
        const newUserInfo = { ...currentUserInfo, ...updatedFields };
        const prefix = this.tokenConfig.storagePrefix;
        uni.setStorageSync(prefix + 'userInfo', JSON.stringify(newUserInfo));
        return true;
      }
      return false;
    } catch (_error) {
      return false;
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
        url: `${this.config.baseURL}/auth/refresh`,
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
    uni.removeStorageSync(this.currentAccountIdKey);
  }

  // 清除所有账户信息
  clearAllAccounts() {
    this.clearTokens();
    uni.removeStorageSync(this.accountsKey);
  }

  // 登出
  async logout(logoutAllDevices = false) {
    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();

    if (accessToken) {
      try {
        await uni.request({
          url: `${this.config.baseURL}/auth/logout`,
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
      } catch (_error) {}
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
        url: `${this.config.baseURL}/auth/send-sms`,
        method: 'POST',
        data: { phone },
        header: {
          'Content-Type': 'application/json',
        },
        timeout: this.config.timeout,
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // 手机验证码登录
  async loginWithPhone(phone, code) {
    try {
      const response = await uni.request({
        url: `${this.config.baseURL}/auth/login-phone`,
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
        this.saveAccount(response.data.data); // 添加到多账户列表
        return response.data;
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error) {
      throw error;
    }
  }

  // 抖音登录
  async loginWithDouyin(authCode) {
    try {
      const response = await uni.request({
        url: `${this.config.baseURL}/auth/login-douyin`,
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
        this.saveAccount(response.data.data); // 添加到多账户列表
        return response.data;
      } else {
        throw new Error(response.data.message || 'Douyin login failed');
      }
    } catch (error) {
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
        url: `${this.config.baseURL}/auth/verify`,
        method: 'GET',
        header: {
          Authorization: `Bearer ${accessToken}`,
        },
        timeout: this.config.timeout,
      });

      return response.statusCode === 200 && response.data.success;
    } catch (_error) {
      return false;
    }
  }
}

export default new TokenManager();
