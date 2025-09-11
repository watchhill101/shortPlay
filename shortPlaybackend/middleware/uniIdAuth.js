// middleware/uniIdAuth.js - uni-id-co Token验证中间件
const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * 验证uni-id-co生成的Token
 * 这个中间件用于验证从uniCloud云函数返回的Token
 */
const verifyUniIdToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'No token provided or invalid format'
    });
  }

  const token = authHeader.substring(7); // 移除 'Bearer ' 前缀

  try {
    // 验证Token（uni-id-co使用的是标准JWT格式）
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // uni-id-co Token的标准结构
    if (!decoded.uid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token structure'
      });
    }

    // 将用户信息添加到请求对象
    req.user = {
      id: decoded.uid,
      role: decoded.role || 'user',
      permissions: decoded.permission || []
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Token verification failed'
    });
  }
};

/**
 * 混合验证中间件
 * 支持传统双Token和uni-id-co Token两种方式
 */
const hybridAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'No token provided or invalid format'
    });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // 判断Token类型
    if (decoded.uid) {
      // uni-id-co Token
      req.user = {
        id: decoded.uid,
        role: decoded.role || 'user',
        permissions: decoded.permission || [],
        tokenType: 'uniId'
      };
    } else if (decoded.user && decoded.user.id) {
      // 传统双Token
      req.user = {
        id: decoded.user.id,
        tokenType: 'traditional'
      };
    } else {
      return res.status(401).json({
        success: false,
        message: 'Invalid token structure'
      });
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Token verification failed'
    });
  }
};

module.exports = {
  verifyUniIdToken,
  hybridAuth
};
