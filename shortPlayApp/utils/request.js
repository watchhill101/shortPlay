// utils/request.js - UniApp版本HTTP请求工具
import tokenManager from './tokenManager.js';
import { getApiConfig } from '@/config/index.js';

class HttpClient {
  constructor() {
    this.config = getApiConfig();
    this.setupInterceptors();
  }

  setupInterceptors() {
    // 请求拦截
    uni.addInterceptor('request', {
      invoke: args => {
        // 添加基础URL
        if (!args.url.startsWith('http')) {
          args.url = this.config.baseURL + args.url;
        }

        // 添加超时时间
        args.timeout = args.timeout || this.config.timeout;

        // 添加Access Token
        const accessToken = tokenManager.getAccessToken();
        if (accessToken) {
          args.header = args.header || {};
          args.header['Authorization'] = `Bearer ${accessToken}`;
        }

        // 添加设备ID
        args.header = args.header || {};
        args.header['X-Device-ID'] = tokenManager.deviceId;
        args.header['Content-Type'] = args.header['Content-Type'] || 'application/json';

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
            console.error('Token refresh failed during retry:', refreshError);
            // 刷新失败，跳转登录
            return Promise.reject(refreshError);
          }
        } else {
          // 其他401错误，直接跳转登录
          tokenManager.clearTokens();
          uni.reLaunch({ url: '/pages/G-signUp/index' });
          return Promise.reject(new Error('Unauthorized'));
        }
      }

      return response;
    } catch (error) {
      console.error('Request failed:', error);

      // 网络错误处理 - 避免页面卡死
      if (error.errMsg && error.errMsg.includes('request:fail')) {
        console.warn('网络请求失败，可能是后端服务未启动:', error.errMsg);
        // 不跳转登录页面，只是记录错误
        return Promise.reject({
          ...error,
          message: '网络连接失败，请检查后端服务是否启动',
          isNetworkError: true,
        });
      }

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

  put(url, data = {}) {
    return this.request({
      url,
      method: 'PUT',
      data,
    });
  }

  delete(url, data = {}) {
    return this.request({
      url,
      method: 'DELETE',
      data,
    });
  }
}

export default new HttpClient();
