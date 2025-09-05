// routes/api/auth.js
const express = require('express');
const {
  sendSmsCode,
  loginWithPhone,
  loginWithDouyin,
  refreshToken,
  verifyToken,
  logout,
  getSessions,
} = require('../../models/User/indexApi');
const protect = require('../../middleware/auth');

const router = express.Router();

// 短信验证码认证
router.post('/send-sms', sendSmsCode);
router.post('/login-phone', loginWithPhone);

// 抖音第三方登录
router.post('/login-douyin', loginWithDouyin);

// Token管理
router.post('/refresh', refreshToken);
router.get('/verify', protect, verifyToken);
router.post('/logout', protect, logout);
router.get('/sessions', protect, getSessions);

module.exports = router;
