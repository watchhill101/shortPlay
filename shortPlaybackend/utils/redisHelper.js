// utils/redisHelper.js
const { safeRedisExecute } = require('../config/redis');

/**
 * Redis操作工具类 - 带错误处理和降级机制
 */
class RedisHelper {
  /**
   * 设置键值对
   * @param {string} key 键
   * @param {string|object} value 值
   * @param {number} expireTime 过期时间(秒)
   */
  static async set(key, value, expireTime = null) {
    return safeRedisExecute(async client => {
      const keyStr = String(key);
      const val = typeof value === 'object' ? JSON.stringify(value) : String(value);

      if (expireTime) {
        const expireSeconds = parseInt(expireTime, 10);
        if (isNaN(expireSeconds) || expireSeconds <= 0) {
          throw new Error('过期时间必须是正整数');
        }
        await client.setEx(keyStr, expireSeconds, val);
      } else {
        await client.set(keyStr, val);
      }
      return true;
    }, false); // 失败时返回false
  }

  /**
   * 获取值
   * @param {string} key 键
   * @param {boolean} parseJson 是否解析为JSON对象
   */
  static async get(key, parseJson = false) {
    return safeRedisExecute(async client => {
      const keyStr = String(key);
      const value = await client.get(keyStr);

      if (value && parseJson) {
        try {
          return JSON.parse(value);
        } catch (error) {
          console.warn('⚠️  Failed to parse JSON from Redis:', error.message);
          return value; // 返回原始值
        }
      }
      return value;
    }, null); // 失败时返回null
  }

  /**
   * 删除键
   * @param {string|string[]} key 键或键数组
   */
  static async del(key) {
    return safeRedisExecute(async client => {
      const keys = Array.isArray(key) ? key.map(k => String(k)) : [String(key)];
      return await client.del(keys);
    }, 0); // 失败时返回0
  }

  /**
   * 检查键是否存在
   * @param {string} key 键
   */
  static async exists(key) {
    return safeRedisExecute(async client => {
      const keyStr = String(key);
      return await client.exists(keyStr);
    }, false); // 失败时返回false
  }

  /**
   * 设置过期时间
   * @param {string} key 键
   * @param {number} seconds 秒数
   */
  static async expire(key, seconds) {
    return safeRedisExecute(async client => {
      const keyStr = String(key);
      const expireSeconds = parseInt(seconds, 10);
      if (isNaN(expireSeconds) || expireSeconds <= 0) {
        throw new Error('过期时间必须是正整数');
      }
      return await client.expire(keyStr, expireSeconds);
    }, false); // 失败时返回false
  }

  /**
   * 获取剩余过期时间
   * @param {string} key 键
   */
  static async ttl(key) {
    return safeRedisExecute(async client => {
      const keyStr = String(key);
      return await client.ttl(keyStr);
    }, -1); // 失败时返回-1
  }

  /**
   * 递增操作
   * @param {string} key 键
   * @param {number} increment 递增值，默认为1
   */
  static async incr(key, increment = 1) {
    return safeRedisExecute(async client => {
      const keyStr = String(key);
      const incrValue = parseInt(increment, 10) || 1;

      if (incrValue === 1) {
        return await client.incr(keyStr);
      } else {
        return await client.incrBy(keyStr, incrValue);
      }
    }, null); // 失败时返回null
  }

  /**
   * 递减操作
   * @param {string} key 键
   * @param {number} decrement 递减值，默认为1
   */
  static async decr(key, decrement = 1) {
    return safeRedisExecute(async client => {
      const keyStr = String(key);
      const decrValue = parseInt(decrement, 10) || 1;

      if (decrValue === 1) {
        return await client.decr(keyStr);
      } else {
        return await client.decrBy(keyStr, decrValue);
      }
    }, null); // 失败时返回null
  }

  /**
   * 列表操作 - 左侧推入
   * @param {string} key 键
   * @param {string|string[]} value 值
   */
  static async lpush(key, value) {
    return safeRedisExecute(async client => {
      const keyStr = String(key);
      const values = Array.isArray(value) ? value.map(v => String(v)) : [String(value)];
      return await client.lPush(keyStr, values);
    }, 0); // 失败时返回0
  }

  /**
   * 列表操作 - 右侧弹出
   * @param {string} key 键
   */
  static async rpop(key) {
    return safeRedisExecute(async client => {
      const keyStr = String(key);
      return await client.rPop(keyStr);
    }, null); // 失败时返回null
  }

  /**
   * 获取列表长度
   * @param {string} key 键
   */
  static async llen(key) {
    return safeRedisExecute(async client => {
      const keyStr = String(key);
      return await client.lLen(keyStr);
    }, 0); // 失败时返回0
  }

  /**
   * 哈希表操作 - 设置字段值
   * @param {string} key 键
   * @param {string} field 字段
   * @param {string} value 值
   */
  static async hset(key, field, value) {
    return safeRedisExecute(async client => {
      const keyStr = String(key);
      const fieldStr = String(field);
      const valueStr = String(value);
      return await client.hSet(keyStr, fieldStr, valueStr);
    }, false); // 失败时返回false
  }

  /**
   * 哈希表操作 - 获取字段值
   * @param {string} key 键
   * @param {string} field 字段
   */
  static async hget(key, field) {
    return safeRedisExecute(async client => {
      const keyStr = String(key);
      const fieldStr = String(field);
      return await client.hGet(keyStr, fieldStr);
    }, null); // 失败时返回null
  }

  /**
   * 集合操作 - 添加成员
   * @param {string} key 键
   * @param {string|string[]} member 成员
   */
  static async sadd(key, member) {
    return safeRedisExecute(async client => {
      const keyStr = String(key);
      const members = Array.isArray(member) ? member.map(m => String(m)) : [String(member)];
      return await client.sAdd(keyStr, members);
    }, 0); // 失败时返回0
  }

  /**
   * 批量操作 - 设置多个键值对
   * @param {Object} keyValuePairs 键值对对象
   * @param {number} expireTime 统一过期时间(秒)
   */
  static async mset(keyValuePairs, expireTime = null) {
    return safeRedisExecute(async client => {
      const pipeline = client.multi();

      for (const [key, value] of Object.entries(keyValuePairs)) {
        const keyStr = String(key);
        const val = typeof value === 'object' ? JSON.stringify(value) : String(value);

        if (expireTime) {
          const expireSeconds = parseInt(expireTime, 10);
          if (!isNaN(expireSeconds) && expireSeconds > 0) {
            pipeline.setEx(keyStr, expireSeconds, val);
          } else {
            pipeline.set(keyStr, val);
          }
        } else {
          pipeline.set(keyStr, val);
        }
      }

      await pipeline.exec();
      return true;
    }, false); // 失败时返回false
  }

  /**
   * 批量获取多个键的值
   * @param {string[]} keys 键数组
   */
  static async mget(keys) {
    return safeRedisExecute(async client => {
      const keyStrs = keys.map(k => String(k));
      return await client.mGet(keyStrs);
    }, []); // 失败时返回空数组
  }
}

module.exports = RedisHelper;
