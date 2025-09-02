// middleware/auth.js
const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    const err = new Error('Not authorized, no token');
    err.status = 401;
    return next(err);
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret);

    // 检查是否是access token
    if (decoded.type && decoded.type !== 'access') {
      const err = new Error('Invalid access token');
      err.status = 401;
      err.code = 'INVALID_ACCESS_TOKEN';
      return next(err);
    }

    // 将用户信息附加到请求对象上
    req.user = await User.findById(decoded.user.id);
    
    if (!req.user) {
      const err = new Error('User not found');
      err.status = 401;
      err.code = 'USER_NOT_FOUND';
      return next(err);
    }

    next();
  } catch (_error) {
    const err = new Error('Not authorized, token failed');
    console.log(_error.message);
    err.status = 401;
    err.code = 'INVALID_ACCESS_TOKEN';
    next(err);
  }
};

module.exports = protect;
