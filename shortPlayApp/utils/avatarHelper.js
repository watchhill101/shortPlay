// utils/avatarHelper.js - 头像处理工具函数
import { getAssetBaseURL } from '@/config/index.js';

/**
 * 统一的头像URL解析函数
 * @param {string} avatarPath - 头像路径（可能是相对路径、绝对URL或空值）
 * @returns {string} - 可直接使用的头像URL
 */
export const resolveAvatarUrl = avatarPath => {
  // 如果没有头像路径，返回默认头像
  if (!avatarPath) {
    return '/static/img/avatar.png';
  }

  // 如果已经是完整的HTTP(S) URL，直接返回
  if (avatarPath.startsWith('http')) {
    return avatarPath;
  }

  // 如果是以/static开头的本地静态资源，直接返回
  if (avatarPath.startsWith('/static/')) {
    return avatarPath;
  }

  // 如果是相对路径，拼接资源基础URL
  const baseURL = getAssetBaseURL();
  return baseURL + avatarPath;
};

/**
 * 获取默认头像URL
 * @returns {string} - 默认头像的URL
 */
export const getDefaultAvatarUrl = () => {
  return '/static/img/avatar.png';
};

/**
 * 验证头像URL是否有效
 * @param {string} avatarUrl - 头像URL
 * @returns {Promise<boolean>} - 是否有效
 */
export const validateAvatarUrl = avatarUrl => {
  return new Promise(resolve => {
    if (!avatarUrl) {
      resolve(false);
      return;
    }

    // 对于本地静态资源，假设总是有效的
    if (avatarUrl.startsWith('/static/')) {
      resolve(true);
      return;
    }

    // 对于网络资源，可以尝试加载验证（这里简化处理）
    resolve(true);
  });
};

export default {
  resolveAvatarUrl,
  getDefaultAvatarUrl,
  validateAvatarUrl,
};
