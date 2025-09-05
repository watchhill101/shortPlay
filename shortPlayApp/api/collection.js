// api/collection.js - 合集相关API接口
import http from '@/utils/request.js';

/**
 * 获取合集列表（推荐）
 * @param {object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {number} params.pageSize - 每页数量
 * @param {string} params.sortBy - 排序字段 (e.g., 'totalPlayCount')
 * @returns {Promise}
 */
export const getCollections = params => {
  return http.get('/collection', params);
};

/**
 * 搜索合集
 * @param {object} params - 查询参数
 * @param {string} params.keyword - 搜索关键词
 * @param {number} params.page - 页码
 * @param {number} params.pageSize - 每页数量
 * @returns {Promise}
 */
export const searchCollections = params => {
  return http.get('/collection/search', params);
};
