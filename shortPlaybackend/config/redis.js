// config/redis.js
const { createClient } = require("redis");
const config = require("./index");

class RedisManager {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.connectionPromise = null;
  }

  /**
   * 获取Redis客户端实例（单例模式）
   */
  async getClient() {
    if (this.client && this.isConnected) {
      return this.client;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this.connect();
    return this.connectionPromise;
  }

  /**
   * 连接Redis
   */
  async connect() {
    try {
      if (!config.redis.url) {
        console.warn('⚠️  Redis URL not configured, Redis features will be disabled');
        return null;
      }

      console.log('🔄 Connecting to Redis...');
      
      this.client = createClient({ 
        url: config.redis.url,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 20) {
              console.error('❌ Redis connection failed after 20 retries');
              return new Error('Redis connection failed');
            }
            const delay = Math.min(retries * 50, 500);
            console.log(`🔄 Redis reconnecting in ${delay}ms (attempt ${retries})`);
            return delay;
          }
        }
      });

      // 设置事件监听器
      this.setupEventListeners();

      // 连接到Redis
      await this.client.connect();
      
      this.isConnected = true;
      console.log('✅ Redis connected successfully');
      
      return this.client;
    } catch (error) {
      console.error('❌ Redis connection failed:', error.message);
      this.client = null;
      this.isConnected = false;
      this.connectionPromise = null;
      
      // 在Redis不可用时返回null，让应用继续运行
      return null;
    }
  }

  /**
   * 设置Redis事件监听器
   */
  setupEventListeners() {
    if (!this.client) return;

    this.client.on('connect', () => {
      console.log('🔗 Redis client connected');
    });

    this.client.on('ready', () => {
      console.log('✅ Redis client ready');
      this.isConnected = true;
    });

    this.client.on('error', (error) => {
      console.error('❌ Redis client error:', error.message);
      this.isConnected = false;
    });

    this.client.on('end', () => {
      console.log('🔌 Redis client disconnected');
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      console.log('🔄 Redis client reconnecting...');
      this.isConnected = false;
    });
  }

  /**
   * 检查Redis是否可用
   */
  async isAvailable() {
    try {
      const client = await this.getClient();
      if (!client) return false;
      
      await client.ping();
      return true;
    } catch (error) {
      console.warn('⚠️  Redis health check failed:', error.message);
      return false;
    }
  }

  /**
   * 优雅关闭Redis连接
   */
  async disconnect() {
    if (this.client && this.isConnected) {
      try {
        await this.client.quit();
        console.log('✅ Redis connection closed gracefully');
      } catch (error) {
        console.error('❌ Error closing Redis connection:', error.message);
      }
    }
    
    this.client = null;
    this.isConnected = false;
    this.connectionPromise = null;
  }

  /**
   * 安全执行Redis操作的包装器
   */
  async safeExecute(operation, fallbackValue = null) {
    try {
      const client = await this.getClient();
      if (!client) {
        console.warn('⚠️  Redis not available, using fallback value');
        return fallbackValue;
      }
      
      return await operation(client);
    } catch (error) {
      console.error('❌ Redis operation failed:', error.message);
      return fallbackValue;
    }
  }
}

// 创建全局单例实例
const redisManager = new RedisManager();

// 导出便捷方法
module.exports = {
  redisManager,
  
  // 获取Redis客户端
  getRedisClient: () => redisManager.getClient(),
  
  // 检查Redis可用性
  isRedisAvailable: () => redisManager.isAvailable(),
  
  // 安全执行Redis操作
  safeRedisExecute: (operation, fallbackValue) => redisManager.safeExecute(operation, fallbackValue),
  
  // 优雅关闭
  closeRedis: () => redisManager.disconnect()
};
