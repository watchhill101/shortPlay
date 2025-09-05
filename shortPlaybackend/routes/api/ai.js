const express = require('express');
const axios = require('axios');
const chatSessionService = require('../../services/redis.service');
const router = express.Router();

// SiliconFlow API 配置
const SILICONFLOW_API_URL = 'https://api.siliconflow.cn/v1/chat/completions';
const API_KEY = process.env.SILICONFLOW_API_KEY || 'sk-qnprobguoovvanqhdjahwendqrfeacremxubyynhcoonxxjx';

/**
 * 创建新的聊天会话
 * POST /ai/session/create
 */
router.post('/session/create', async (req, res) => {
  try {
    const { userId, sessionData = {} } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId是必需的',
      });
    }

    const sessionId = await chatSessionService.createSession(userId, sessionData);

    res.json({
      success: true,
      sessionId,
      message: '会话创建成功',
    });
  } catch (error) {
    console.error('创建会话失败:', error);
    res.status(500).json({
      success: false,
      error: '创建会话失败',
      message: error.message,
    });
  }
});

/**
 * 获取用户的所有会话
 * GET /ai/sessions/:userId
 */
router.get('/sessions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // 清理过期会话
    const sessions = await chatSessionService.cleanExpiredSessions(userId);

    res.json({
      success: true,
      sessions,
      total: sessions.length,
    });
  } catch (error) {
    console.error('获取用户会话失败:', error);
    res.status(500).json({
      success: false,
      error: '获取会话失败',
      message: error.message,
    });
  }
});

/**
 * 获取会话消息（分页）
 * GET /ai/session/:sessionId/messages
 */
router.get('/session/:sessionId/messages', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { page = 1, pageSize = 20 } = req.query;

    const result = await chatSessionService.getSessionMessages(sessionId, parseInt(page), parseInt(pageSize));

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('获取会话消息失败:', error);
    res.status(500).json({
      success: false,
      error: '获取消息失败',
      message: error.message,
    });
  }
});

/**
 * 获取会话统计信息
 * GET /ai/session/:sessionId/stats
 */
router.get('/session/:sessionId/stats', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const stats = await chatSessionService.getSessionStats(sessionId);

    if (!stats) {
      return res.status(404).json({
        success: false,
        error: '会话不存在',
      });
    }

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('获取会话统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取统计失败',
      message: error.message,
    });
  }
});

/**
 * 删除会话
 * DELETE /ai/session/:sessionId
 */
router.delete('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId是必需的',
      });
    }

    const result = await chatSessionService.deleteSession(sessionId, userId);

    if (result) {
      res.json({
        success: true,
        message: '会话删除成功',
      });
    } else {
      res.status(500).json({
        success: false,
        error: '删除会话失败',
      });
    }
  } catch (error) {
    console.error('删除会话失败:', error);
    res.status(500).json({
      success: false,
      error: '删除会话失败',
      message: error.message,
    });
  }
});

/**
 * 带上下文记忆的AI聊天接口
 * POST /ai/chat-with-context
 */
router.post('/chat-with-context', async (req, res) => {
  try {
    let { sessionId, userId, message, model = 'THUDM/GLM-4-9B-0414', contextSize = 10 } = req.body;

    if (!sessionId || !userId || !message) {
      return res.status(400).json({
        success: false,
        error: 'sessionId、userId和message都是必需的',
      });
    }

    // 验证会话存在
    let session = await chatSessionService.getSession(sessionId);
    if (!session) {
      // 如果会话不存在，创建新会话
      const newSessionId = await chatSessionService.createSession(userId, {
        title: '新的对话',
        platform: 'mobile',
      });
      session = await chatSessionService.getSession(newSessionId);
      // 更新sessionId为新创建的会话ID
      sessionId = newSessionId;
    }

    // 添加用户消息到会话
    await chatSessionService.addMessage(sessionId, {
      type: 'user',
      content: message,
    });

    // 获取上下文消息
    const contextMessages = await chatSessionService.getContextMessages(sessionId, contextSize);

    // 添加系统提示
    const systemPrompt = {
      role: 'system',
      content: `你是一个专业的短视频应用客服助手，名叫"小助手"。你的任务是帮助用户解决关于短视频应用的各种问题。

请遵循以下原则：
1. 友好、专业、耐心地回答用户问题
2. 回答要简洁明了，避免过长的文字
3. 针对短视频应用相关问题提供具体的解决方案
4. 如果不确定答案，建议用户联系人工客服
5. 保持积极正面的语调
6. 记住之前的对话内容，提供连贯的服务

常见问题领域：
- 账户登录注册问题
- 支付充值相关
- 视频播放卡顿
- 会员服务咨询
- 技术故障报告
- 其他使用问题`,
    };

    const allMessages = [systemPrompt, ...contextMessages];

    // 调用AI API
    const response = await axios({
      method: 'POST',
      url: SILICONFLOW_API_URL,
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      data: {
        model,
        messages: allMessages,
        stream: false,
        top_p: 0.7,
        max_tokens: 1000,
      },
      timeout: 30000,
    });

    // 提取AI回复
    let aiContent = response.data?.choices?.[0]?.message?.content || '';
    aiContent = aiContent.trim();

    if (!aiContent) {
      aiContent = '抱歉，我现在无法回答您的问题，请稍后再试。';
    }

    // 添加AI回复到会话
    const aiMessage = await chatSessionService.addMessage(sessionId, {
      type: 'ai',
      content: aiContent,
    });

    res.json({
      success: true,
      content: aiContent,
      message: aiMessage,
      sessionId,
      model,
      timestamp: Date.now(),
      usage: response.data.usage || {},
    });
  } catch (error) {
    console.error('带上下文的AI聊天失败:', error);
    res.status(500).json({
      success: false,
      error: 'AI聊天失败',
      message: error.message,
    });
  }
});

/**
 * 流式 AI 聊天接口
 * POST /ai/chat
 *
 * 请求体示例:
 * {
 *   "messages": [{"role": "user", "content": "你好，退货流程是怎样的？"}],
 *   "model": "THUDM/GLM-4-9B-0414", // 可选，默认使用 GLM-4-9B-0414
 *   "top_p": 0.7, // 可选
 *   "thinking_budget": 4096 // 可选
 * }
 */
router.post('/chat', async (req, res) => {
  try {
    // 验证请求参数
    const { messages, model = 'THUDM/GLM-4-9B-0414', top_p = 0.7, thinking_budget = 4096 } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: 'messages字段是必需的，且必须是非空数组',
        example: [{ role: 'user', content: '你好' }],
      });
    }

    // 验证 messages 格式
    const hasValidMessage = messages.some(msg => msg.role && msg.content && typeof msg.content === 'string');

    if (!hasValidMessage) {
      return res.status(400).json({
        error: 'messages数组中至少要有一个包含role和content字段的消息',
        example: [{ role: 'user', content: '你好' }],
      });
    }

    // 设置 SSE 响应头
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    // 准备发送给 SiliconFlow 的请求体
    const requestBody = {
      model,
      messages,
      stream: true,
      thinking_budget,
      top_p,
    };

    console.log('发送请求到 SiliconFlow API:', JSON.stringify(requestBody, null, 2));

    // 创建流式请求
    const response = await axios({
      method: 'POST',
      url: SILICONFLOW_API_URL,
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      data: requestBody,
      responseType: 'stream',
      timeout: 60000, // 60秒超时
    });

    let buffer = '';
    let messageId = Date.now().toString();

    // 发送连接成功事件
    res.write(`event: connected\n`);
    res.write(`data: {"status": "connected", "messageId": "${messageId}"}\n\n`);

    // 处理流数据
    response.data.on('data', chunk => {
      try {
        buffer += chunk.toString();
        const lines = buffer.split('\n');

        // 保留最后一行（可能不完整）
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;

          if (line.startsWith('data: ')) {
            const data = line.substring(6).trim();

            // 检查是否是结束标记
            if (data === '[DONE]') {
              res.write(`event: done\n`);
              res.write(`data: {"status": "completed", "messageId": "${messageId}"}\n\n`);
              res.end();
              return;
            }

            try {
              const jsonData = JSON.parse(data);

              // 检查是否有内容
              if (
                jsonData.choices &&
                jsonData.choices[0] &&
                jsonData.choices[0].delta &&
                jsonData.choices[0].delta.content
              ) {
                const content = jsonData.choices[0].delta.content;

                // 发送内容片段
                res.write(`event: message\n`);
                res.write(
                  `data: ${JSON.stringify({
                    content: content,
                    messageId: messageId,
                    model: model,
                    timestamp: Date.now(),
                  })}\n\n`
                );
              }

              // 检查是否完成
              if (jsonData.choices && jsonData.choices[0] && jsonData.choices[0].finish_reason) {
                res.write(`event: done\n`);
                res.write(
                  `data: ${JSON.stringify({
                    status: 'completed',
                    messageId: messageId,
                    finish_reason: jsonData.choices[0].finish_reason,
                  })}\n\n`
                );
                res.end();
                return;
              }
            } catch (parseError) {
              console.error('解析 JSON 数据时出错:', parseError.message);
              console.error('原始数据:', data);
            }
          }
        }
      } catch (error) {
        console.error('处理数据块时出错:', error.message);
      }
    });

    // 处理流结束
    response.data.on('end', () => {
      console.log('SiliconFlow API 流结束');
      if (!res.headersSent) {
        res.write(`event: done\n`);
        res.write(`data: {"status": "completed", "messageId": "${messageId}"}\n\n`);
      }
      res.end();
    });

    // 处理流错误
    response.data.on('error', error => {
      console.error('SiliconFlow API 流错误:', error.message);
      if (!res.headersSent) {
        res.write(`event: error\n`);
        res.write(
          `data: ${JSON.stringify({
            error: '流处理错误',
            message: error.message,
            messageId: messageId,
          })}\n\n`
        );
      }
      res.end();
    });

    // 处理客户端断开连接
    req.on('close', () => {
      console.log('客户端断开连接');
      if (response.data && typeof response.data.destroy === 'function') {
        response.data.destroy();
      }
    });
  } catch (error) {
    console.error('AI 聊天接口错误:', error);

    // 如果响应头还没发送，发送错误响应
    if (!res.headersSent) {
      if (error.response) {
        // API 返回的错误
        const status = error.response.status || 500;
        const errorData = error.response.data || {};

        res.status(status).json({
          error: 'SiliconFlow API 错误',
          status: status,
          message: errorData.message || error.message,
          details: errorData,
        });
      } else if (error.code === 'ECONNABORTED') {
        // 请求超时
        res.status(408).json({
          error: '请求超时',
          message: '连接 SiliconFlow API 超时，请稍后重试',
        });
      } else {
        // 其他错误
        res.status(500).json({
          error: '服务器内部错误',
          message: error.message,
        });
      }
    } else {
      // 如果已经开始流式响应，发送错误事件
      try {
        res.write(`event: error\n`);
        res.write(
          `data: ${JSON.stringify({
            error: '请求处理错误',
            message: error.message,
          })}\n\n`
        );
        res.end();
      } catch (writeError) {
        console.error('写入错误响应时出错:', writeError);
      }
    }
  }
});

/**
 * 简单 AI 聊天接口 (非流式)
 * POST /ai/simple-chat
 *
 * 请求体示例:
 * {
 *   "messages": [{"role": "user", "content": "你好，退货流程是怎样的？"}],
 *   "model": "THUDM/GLM-4-9B-0414" // 可选
 * }
 */
router.post('/simple-chat', async (req, res) => {
  try {
    // 验证请求参数
    const { messages, model = 'THUDM/GLM-4-9B-0414' } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'messages字段是必需的，且必须是非空数组',
        example: [{ role: 'user', content: '你好' }],
      });
    }

    // 验证 messages 格式
    const hasValidMessage = messages.some(msg => msg.role && msg.content && typeof msg.content === 'string');

    if (!hasValidMessage) {
      return res.status(400).json({
        success: false,
        error: 'messages数组中至少要有一个包含role和content字段的消息',
        example: [{ role: 'user', content: '你好' }],
      });
    }

    // 准备发送给 SiliconFlow 的请求体
    const requestBody = {
      model,
      messages,
      stream: false, // 非流式
      top_p: 0.7,
      max_tokens: 1000,
    };

    console.log('发送简单聊天请求到 SiliconFlow API:', JSON.stringify(requestBody, null, 2));

    // 发送请求到 SiliconFlow API
    const response = await axios({
      method: 'POST',
      url: SILICONFLOW_API_URL,
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      data: requestBody,
      timeout: 30000, // 30秒超时
    });

    // 记录完整的API响应用于调试
    console.log('SiliconFlow API 完整响应:', JSON.stringify(response.data, null, 2));

    // 提取AI回复内容
    let aiContent = response.data?.choices?.[0]?.message?.content || '';

    console.log('提取的AI内容原始:', JSON.stringify(aiContent));

    // 清理内容：去除前后空白字符和换行符
    aiContent = aiContent.trim();

    console.log('清理后的AI内容:', JSON.stringify(aiContent));
    console.log('AI内容长度:', aiContent.length);

    if (!aiContent || aiContent.trim() === '') {
      console.warn('AI回复内容为空，使用默认回复');
      const defaultContent = '抱歉，我现在无法回答您的问题，请稍后再试。';

      res.json({
        success: true,
        content: defaultContent,
        model: model,
        timestamp: Date.now(),
        usage: response.data.usage || {},
        debug: {
          originalResponse: response.data,
          extractedContent: aiContent,
          reason: 'empty_content',
        },
      });
      return;
    }

    // 返回成功响应
    res.json({
      success: true,
      content: aiContent,
      model: model,
      timestamp: Date.now(),
      usage: response.data.usage || {},
    });
  } catch (error) {
    console.error('简单AI聊天接口错误:', error);

    if (error.response) {
      // API 返回的错误
      const status = error.response.status || 500;
      const errorData = error.response.data || {};

      res.status(status).json({
        success: false,
        error: 'SiliconFlow API 错误',
        status: status,
        message: errorData.message || error.message,
        details: errorData,
      });
    } else if (error.code === 'ECONNABORTED') {
      // 请求超时
      res.status(408).json({
        success: false,
        error: '请求超时',
        message: '连接 SiliconFlow API 超时，请稍后重试',
      });
    } else {
      // 其他错误
      res.status(500).json({
        success: false,
        error: '服务器内部错误',
        message: error.message,
      });
    }
  }
});

/**
 * 健康检查接口
 * GET /ai/health
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'AI Chat API',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

module.exports = router;
