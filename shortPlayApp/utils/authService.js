// utils/authService.js
// 轻量封装，兼容现有页面对 authService 的引入
import tokenManager from '../utils/tokenManager.js';

const authService = {
  // 获取当前已登录用户信息
  getCurrentUser() {
    return tokenManager.getUserInfo();
  },
};

export default authService;
