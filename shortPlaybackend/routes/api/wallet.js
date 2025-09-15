const express = require('express');
const router = express.Router();
const protect = require('../../middleware/auth'); // 引入认证中间件
const Wallet = require('../../models/Wallet'); // 引入钱包模型

/**
 * @route   GET /api/wallet/balance
 * @desc    获取当前用户的钱包余额
 * @access  Private
 */
router.get('/balance', protect, async (req, res, next) => {
  try {
    const wallet = await Wallet.findOne({ user: req.user.id });

    if (!wallet) {
      // 如果用户还没有钱包，返回 0.00
      return res.json({ success: true, balance: '0.00' });
    }

    // Decimal128 类型需要转换为字符串再返回给前端
    res.json({ success: true, balance: wallet.balance.toString() });
  } catch (error) {
    console.error('获取钱包余额失败:', error);
    next(error);
  }
});

module.exports = router;
