// routes/api/trtc.js - 腾讯云TRTC API接口
const express = require('express');
const crypto = require('crypto');
const zlib = require('zlib');
const authMiddleware = require('../../middleware/auth');

const router = express.Router();

// TRTC配置 - 腾讯云实时音视频SDK配置
const TRTC_CONFIG = {
  SDKAppID: 1600104513, // 腾讯云TRTC应用ID
  secretKey: '7cb822b10d2151733c987d54204556ede642c55aadf8fac4bcffa4cd3a27073a', // 腾讯云密钥
  expireTime: 604800, // 7天过期时间
};

/**
 * 生成UserSig
 * 注意：生产环境中必须在服务端生成，客户端生成仅用于调试
 */
function genTestUserSig(userID, expireTime = TRTC_CONFIG.expireTime) {
  const sdkAppId = TRTC_CONFIG.SDKAppID;
  const secretKey = TRTC_CONFIG.secretKey;

  if (!secretKey || secretKey === 'your_secret_key_here') {
    throw new Error('请先配置TRTC密钥');
  }

  // 计算过期时间
  const current = Math.floor(Date.now() / 1000);
  const expire = current + expireTime;

  // 构建签名内容
  const contentToBeSigned =
    `TLS.identifier:${userID}\n` + `TLS.sdkappid:${sdkAppId}\n` + `TLS.time:${current}\n` + `TLS.expire:${expire}\n`;

  // 计算签名
  const signature = crypto.createHmac('sha256', secretKey).update(contentToBeSigned).digest('base64');

  // 构建UserSig
  const userSigDoc = {
    'TLS.ver': '2.0',
    'TLS.identifier': userID,
    'TLS.sdkappid': sdkAppId,
    'TLS.time': current,
    'TLS.expire': expire,
    'TLS.sig': signature,
  };

  // 压缩并编码
  const compressed = zlib.deflateSync(JSON.stringify(userSigDoc));
  return compressed.toString('base64').replace(/\+/g, '*').replace(/\//g, '-').replace(/=/g, '_');
}

/**
 * 获取UserSig
 * POST /api/trtc/getUserSig
 */
router.post('/getUserSig', authMiddleware, async (req, res) => {
  try {
    const { userId, roomId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: '用户ID不能为空',
      });
    }

    // 生成UserSig
    const userSig = genTestUserSig(userId.toString());

    // 生成房间ID（如果未提供）
    const finalRoomId = roomId || Math.floor(Math.random() * 1000000);

    console.log('🔐 生成UserSig成功:', { userId, roomId: finalRoomId });

    res.json({
      success: true,
      data: {
        sdkAppId: TRTC_CONFIG.SDKAppID,
        userSig: userSig,
        userId: userId.toString(),
        roomId: finalRoomId,
        expireTime: TRTC_CONFIG.expireTime,
      },
    });
  } catch (error) {
    console.error('生成UserSig失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '生成UserSig失败',
    });
  }
});

/**
 * 获取房间信息
 * GET /api/trtc/room/:roomId
 */
router.get('/room/:roomId', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;

    // TODO: 可以从数据库获取房间信息
    // 这里返回基本的房间配置
    res.json({
      success: true,
      data: {
        roomId: parseInt(roomId),
        sdkAppId: TRTC_CONFIG.SDKAppID,
        maxUsers: 2, // 1v1通话
        roomType: 'video_call',
        created: Date.now(),
      },
    });
  } catch (error) {
    console.error('获取房间信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取房间信息失败',
    });
  }
});

/**
 * 创建通话房间
 * POST /api/trtc/createRoom
 */
router.post('/createRoom', authMiddleware, async (req, res) => {
  try {
    const { callType = 'video', participants } = req.body;
    const userId = req.user.id;

    // 生成房间ID
    const roomId = Math.floor(Math.random() * 1000000);

    // 生成房间创建者的UserSig
    const userSig = genTestUserSig(userId.toString());

    // TODO: 保存房间信息到数据库
    const roomInfo = {
      roomId,
      callType,
      creator: userId,
      participants: participants || [],
      created: Date.now(),
      status: 'active',
    };

    console.log('🏠 创建TRTC房间:', roomInfo);

    res.json({
      success: true,
      data: {
        roomId,
        sdkAppId: TRTC_CONFIG.SDKAppID,
        userSig,
        userId: userId.toString(),
        callType,
        created: Date.now(),
      },
    });
  } catch (error) {
    console.error('创建房间失败:', error);
    res.status(500).json({
      success: false,
      message: '创建房间失败',
    });
  }
});

/**
 * 结束通话房间
 * POST /api/trtc/endRoom
 */
router.post('/endRoom', authMiddleware, async (req, res) => {
  try {
    const { roomId, duration } = req.body;
    const userId = req.user.id;

    // TODO: 更新数据库中的房间状态
    console.log('🏠 结束TRTC房间:', { roomId, userId, duration });

    res.json({
      success: true,
      data: {
        roomId,
        endTime: Date.now(),
        duration: duration || 0,
      },
    });
  } catch (error) {
    console.error('结束房间失败:', error);
    res.status(500).json({
      success: false,
      message: '结束房间失败',
    });
  }
});

/**
 * 获取通话质量统计
 * GET /api/trtc/stats/:roomId
 */
router.get('/stats/:roomId', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;

    // TODO: 从TRTC或数据库获取真实统计数据
    // 这里返回模拟数据
    const mockStats = {
      roomId: parseInt(roomId),
      duration: 0,
      participants: [],
      quality: {
        avgBitrate: 800,
        avgFrameRate: 20,
        packetLoss: 0.1,
        delay: 120,
      },
      networkType: 'wifi',
    };

    res.json({
      success: true,
      data: mockStats,
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取统计数据失败',
    });
  }
});

/**
 * 健康检查
 * GET /api/trtc/health
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'TRTC API',
      status: 'healthy',
      sdkAppId: TRTC_CONFIG.SDKAppID,
      timestamp: Date.now(),
    },
  });
});

module.exports = router;
