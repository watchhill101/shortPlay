const express = require('express');
const router = express.Router();
const Wallet = require('./index');
const auth = require('../../middleware/auth'); // 假设有认证中间件

/**
 * @route GET /api/wallet
 * @description 获取当前用户的钱包信息
 * @access Private
 */
router.get('/', auth, async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ userId: req.user.id });
    if (!wallet) {
      // 如果钱包不存在，可以创建一个新的
      const newWallet = new Wallet({ userId: req.user.id });
      await newWallet.save();
      return res.json({
        success: true,
        data: newWallet,
        message: '新的钱包已创建',
      });
    }
    res.json({
      success: true,
      data: wallet,
      message: '钱包信息获取成功',
    });
  } catch (error) {
    console.error('获取钱包信息失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message,
    });
  }
});

module.exports = router;
