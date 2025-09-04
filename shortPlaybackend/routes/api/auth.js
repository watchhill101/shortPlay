// routes/api/auth.js
const express = require('express');
const { register, login, sendSmsCode, loginWithPhone, loginWithDouyin } = require('../../models/User/indexApi');

const router = express.Router();

// 传统用户名密码认证
router.post('/register', register);
router.post('/login', login);

// 短信验证码认证
router.post('/send-sms', sendSmsCode);
router.post('/login-phone', loginWithPhone);

// 抖音第三方登录
router.post('/login-douyin', loginWithDouyin);

module.exports = router;