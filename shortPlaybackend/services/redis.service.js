// services/redis.service.js
const RedisHelper = require('../utils/redisHelper');

/**
 * AI聊天会话Redis服务
 */
class ChatSessionService {
  constructor() {
    this.SESSION_PREFIX = 'chat:session:';
    this.USER_SESSIONS_PREFIX = 'chat:user_sessions:';
    this.SESSION_EXPIRE_TIME = 24 * 60 * 60; // 24小时过期
    this.MAX_MESSAGES_PER_SESSION = 1000; // 每个会话最大消息数
    this.CONTEXT_WINDOW_SIZE = 10; // 上下文窗口大小（最近N条消息）
  }

  /**
   * 生成会话ID
   * @param {string} userId 用户ID
   */
  generateSessionId(userId) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${userId}_${timestamp}_${random}`;
  }

  /**
   * 创建新会话
   * @param {string} userId 用户ID
   * @param {object} sessionData 会话数据
   */
  async createSession(userId, sessionData = {}) {
    try {
      const sessionId = this.generateSessionId(userId);
      const sessionKey = this.SESSION_PREFIX + sessionId;

      const session = {
        id: sessionId,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [],
        messageCount: 0,
        status: 'active',
        ...sessionData,
      };

      // 保存会话数据
      await RedisHelper.set(sessionKey, session, this.SESSION_EXPIRE_TIME);

      // 更新用户会话列表
      await this.addUserSession(userId, sessionId);

      return sessionId;
    } catch (error) {
      console.error('创建会话失败:', error);
      throw error;
    }
  }

  /**
   * 获取会话信息
   * @param {string} sessionId 会话ID
   */
  async getSession(sessionId) {
    try {
      const sessionKey = this.SESSION_PREFIX + sessionId;
      const session = await RedisHelper.get(sessionKey, true);

      if (session) {
        // 延长会话过期时间
        await RedisHelper.expire(sessionKey, this.SESSION_EXPIRE_TIME);
      }

      return session;
    } catch (error) {
      console.error('获取会话失败:', error);
      return null;
    }
  }

  /**
   * 添加消息到会话
   * @param {string} sessionId 会话ID
   * @param {object} message 消息对象
   */
  async addMessage(sessionId, message) {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error('会话不存在');
      }

      // 检查消息数量限制
      if (session.messageCount >= this.MAX_MESSAGES_PER_SESSION) {
        // 移除最旧的消息
        session.messages.shift();
      } else {
        session.messageCount++;
      }

      // 添加时间戳和ID
      const messageWithMeta = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        ...message,
      };

      session.messages.push(messageWithMeta);
      session.updatedAt = new Date().toISOString();

      // 保存更新的会话
      const sessionKey = this.SESSION_PREFIX + sessionId;
      await RedisHelper.set(sessionKey, session, this.SESSION_EXPIRE_TIME);

      return messageWithMeta;
    } catch (error) {
      console.error('添加消息失败:', error);
      throw error;
    }
  }

  /**
   * 获取会话的上下文消息（用于AI对话）
   * @param {string} sessionId 会话ID
   * @param {number} contextSize 上下文大小
   */
  async getContextMessages(sessionId, contextSize = this.CONTEXT_WINDOW_SIZE) {
    try {
      const session = await this.getSession(sessionId);
      if (!session || !session.messages) {
        return [];
      }

      // 获取最近的消息作为上下文
      const recentMessages = session.messages.slice(-contextSize);

      // 转换为AI API格式
      return recentMessages.map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content,
      }));
    } catch (error) {
      console.error('获取上下文消息失败:', error);
      return [];
    }
  }

  /**
   * 获取会话消息（分页）
   * @param {string} sessionId 会话ID
   * @param {number} page 页码（从1开始）
   * @param {number} pageSize 每页大小
   */
  async getSessionMessages(sessionId, page = 1, pageSize = 20) {
    try {
      const session = await this.getSession(sessionId);
      if (!session || !session.messages) {
        return {
          messages: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0,
          hasMore: false,
        };
      }

      const total = session.messages.length;
      const totalPages = Math.ceil(total / pageSize);

      // 计算分页索引（从最新消息开始）
      const startIndex = Math.max(0, total - page * pageSize);
      const endIndex = total - (page - 1) * pageSize;

      const messages = session.messages.slice(startIndex, endIndex);

      return {
        messages,
        total,
        page,
        pageSize,
        totalPages,
        hasMore: page < totalPages,
      };
    } catch (error) {
      console.error('获取会话消息失败:', error);
      return {
        messages: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
        hasMore: false,
      };
    }
  }

  /**
   * 添加用户会话到用户会话列表
   * @param {string} userId 用户ID
   * @param {string} sessionId 会话ID
   */
  async addUserSession(userId, sessionId) {
    try {
      const userSessionsKey = this.USER_SESSIONS_PREFIX + userId;

      // 获取现有会话列表
      const sessions = (await RedisHelper.get(userSessionsKey, true)) || [];

      // 添加新会话到开头
      sessions.unshift({
        sessionId,
        createdAt: new Date().toISOString(),
      });

      // 限制保存的会话数量（最多保存50个）
      if (sessions.length > 50) {
        sessions.splice(50);
      }

      // 保存更新的会话列表
      await RedisHelper.set(userSessionsKey, sessions, this.SESSION_EXPIRE_TIME);

      return true;
    } catch (error) {
      console.error('添加用户会话失败:', error);
      return false;
    }
  }

  /**
   * 获取用户的所有会话
   * @param {string} userId 用户ID
   */
  async getUserSessions(userId) {
    try {
      const userSessionsKey = this.USER_SESSIONS_PREFIX + userId;
      return (await RedisHelper.get(userSessionsKey, true)) || [];
    } catch (error) {
      console.error('获取用户会话失败:', error);
      return [];
    }
  }

  /**
   * 删除会话
   * @param {string} sessionId 会话ID
   * @param {string} userId 用户ID
   */
  async deleteSession(sessionId, userId) {
    try {
      const sessionKey = this.SESSION_PREFIX + sessionId;

      // 删除会话数据
      await RedisHelper.del(sessionKey);

      // 从用户会话列表中移除
      const userSessionsKey = this.USER_SESSIONS_PREFIX + userId;
      const sessions = (await RedisHelper.get(userSessionsKey, true)) || [];
      const updatedSessions = sessions.filter(s => s.sessionId !== sessionId);

      await RedisHelper.set(userSessionsKey, updatedSessions, this.SESSION_EXPIRE_TIME);

      return true;
    } catch (error) {
      console.error('删除会话失败:', error);
      return false;
    }
  }

  /**
   * 清理过期会话
   * @param {string} userId 用户ID
   */
  async cleanExpiredSessions(userId) {
    try {
      const sessions = await this.getUserSessions(userId);
      const validSessions = [];

      for (const sessionInfo of sessions) {
        const session = await this.getSession(sessionInfo.sessionId);
        if (session) {
          validSessions.push(sessionInfo);
        }
      }

      // 更新用户会话列表
      const userSessionsKey = this.USER_SESSIONS_PREFIX + userId;
      await RedisHelper.set(userSessionsKey, validSessions, this.SESSION_EXPIRE_TIME);

      return validSessions;
    } catch (error) {
      console.error('清理过期会话失败:', error);
      return [];
    }
  }

  /**
   * 获取会话统计信息
   * @param {string} sessionId 会话ID
   */
  async getSessionStats(sessionId) {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        return null;
      }

      const userMessages = session.messages.filter(m => m.type === 'user').length;
      const aiMessages = session.messages.filter(m => m.type === 'ai').length;

      return {
        sessionId,
        userId: session.userId,
        messageCount: session.messageCount,
        userMessages,
        aiMessages,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        status: session.status,
      };
    } catch (error) {
      console.error('获取会话统计失败:', error);
      return null;
    }
  }
}

module.exports = new ChatSessionService();
