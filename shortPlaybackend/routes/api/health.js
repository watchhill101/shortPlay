// routes/api/health.js
const express = require('express');
const mongoose = require('mongoose');
const { isRedisAvailable } = require('../../config/redis');

const router = express.Router();

/**
 * @desc    系统健康检查
 * @route   GET /api/health
 */
router.get('/', async (req, res) => {
  try {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        api: 'healthy',
        mongodb: 'unknown',
        redis: 'unknown'
      }
    };

    // 检查MongoDB连接状态
    const mongoState = mongoose.connection.readyState;
    switch (mongoState) {
      case 0:
        health.services.mongodb = 'disconnected';
        break;
      case 1:
        health.services.mongodb = 'connected';
        break;
      case 2:
        health.services.mongodb = 'connecting';
        break;
      case 3:
        health.services.mongodb = 'disconnecting';
        break;
      default:
        health.services.mongodb = 'unknown';
    }

    // 检查Redis连接状态
    const redisHealthy = await isRedisAvailable();
    health.services.redis = redisHealthy ? 'connected' : 'disconnected';

    // 判断整体状态
    const allServicesHealthy = 
      health.services.mongodb === 'connected' && 
      health.services.redis === 'connected';
    
    health.status = allServicesHealthy ? 'healthy' : 'degraded';

    // 根据服务状态返回相应的HTTP状态码
    const statusCode = allServicesHealthy ? 200 : 503;
    
    res.status(statusCode).json({
      success: true,
      data: health
    });

  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      success: false,
      status: 'error',
      message: 'Health check failed',
      error: error.message
    });
  }
});

/**
 * @desc    Redis专项健康检查
 * @route   GET /api/health/redis
 */
router.get('/redis', async (req, res) => {
  try {
    const isHealthy = await isRedisAvailable();
    const status = isHealthy ? 'healthy' : 'unhealthy';
    
    res.status(isHealthy ? 200 : 503).json({
      success: true,
      service: 'redis',
      status: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      service: 'redis',
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @desc    MongoDB专项健康检查
 * @route   GET /api/health/mongodb
 */
router.get('/mongodb', async (req, res) => {
  try {
    const mongoState = mongoose.connection.readyState;
    const isHealthy = mongoState === 1;
    
    const stateMap = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    res.status(isHealthy ? 200 : 503).json({
      success: true,
      service: 'mongodb',
      status: isHealthy ? 'healthy' : 'unhealthy',
      state: stateMap[mongoState] || 'unknown',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      service: 'mongodb',
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
