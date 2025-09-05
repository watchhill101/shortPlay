// api/auth.js - 认证相关API接口
import http from '@/utils/request.js';

/**
 * 发送手机验证码
 * @param {string} phone - 手机号
 * @returns {Promise}
 */
export const sendSmsCode = phone => {
  return http.post('/auth/send-sms', {
    phone,
  });
};

/**
 * 手机号验证码登录
 * @param {string} phone - 手机号
 * @param {string} code - 验证码
 * @param {string} deviceId - 设备ID
 * @returns {Promise}
 */
export const loginWithPhone = (phone, code, deviceId) => {
  return http.post('/auth/login-phone', {
    phone,
    code,
    deviceId,
  });
};

/**
 * 抖音授权登录
 * @param {string} authCode - 抖音授权码
 * @param {string} deviceId - 设备ID
 * @returns {Promise}
 */
export const loginWithDouyin = (authCode, deviceId) => {
  return http.post('/auth/login-douyin', {
    authCode,
    deviceId,
  });
};

/**
 * 刷新Token
 * @param {string} refreshToken - 刷新令牌
 * @param {string} deviceId - 设备ID
 * @returns {Promise}
 */
export const refreshToken = (refreshToken, deviceId) => {
  return http.post('/auth/refresh', {
    refreshToken,
    deviceId,
  });
};

/**
 * 用户登出
 * @param {string} refreshToken - 刷新令牌
 * @returns {Promise}
 */
export const logout = refreshToken => {
  return http.post('/auth/logout', {
    refreshToken,
  });
};

/**
 * 验证Token有效性
 * @returns {Promise}
 */
export const verifyToken = () => {
  return http.get('/auth/verify');
};

/**
 * 获取用户会话列表
 * @returns {Promise}
 */
export const getUserSessions = () => {
  return http.get('/auth/sessions');
};
