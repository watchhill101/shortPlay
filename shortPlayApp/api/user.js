// api/user.js - 用户信息相关API接口
import http from '@/utils/request.js';

/**
 * 更新用户信息
 * @param {string} userId - 用户ID
 * @param {object} data - 需要更新的用户信息, e.g., { nickname: '新的昵称' }
 * @returns {Promise}
 */
export const updateUserInfo = (userId, data) => {
  return http.put(`/users/${userId}`, data);
};
