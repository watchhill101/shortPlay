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

    // 将用户信息（不含密码）附加到请求对象上
    req.user = await User.findById(decoded.user.id).select('-password');

    next();
  } catch (_error) {
    const err = new Error('Not authorized, token failed');
    console.log(_error.message);
    err.status = 401;
    next(err);
  }
};

module.exports = protect;
