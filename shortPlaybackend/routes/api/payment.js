const express = require('express');
const { createOrder } = require('../../utils/generateOrder');
const { v4: uuidv4 } = require('uuid'); // 用于生成唯一订单ID
const alipaySdk = require('../../config/initAlipay'); // 引入支付宝SDK实例
const protect = require('../../middleware/auth'); // 引入认证中间件
const Wallet = require('../../models/Wallet'); // 引入钱包模型
const mongoose = require('mongoose');

const router = express.Router();

/**
 * @route   POST /api/payment/create
 * @desc    创建一个新的支付宝支付订单 (受保护)
 * @access  Private
 */
router.post('/create', protect, async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    console.log(`用户 ${req.user.id} 请求创建支付订单`);

    const { amount, subject = '余额充值' } = req.body;
    const parsedAmount = parseFloat(amount);

    if (!parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: '必须提供有效的金额' });
    }

    const orderId = uuidv4();
    const fullSubject = `${subject} ${parsedAmount.toFixed(2)}元`;

    // 查找或创建用户的钱包，并在其中创建一笔待处理的交易
    let wallet = await Wallet.findOne({ user: req.user.id }).session(session);
    if (!wallet) {
      wallet = new Wallet({ user: req.user.id, balance: 0 });
    }

    wallet.transactions.push({
      orderId,
      amount: parsedAmount.toFixed(2),
      type: 'deposit',
      status: 'pending',
      description: fullSubject,
    });

    await wallet.save({ session });

    // 从支付宝获取支付链接
    const paymentUrl = await createOrder(orderId, parsedAmount, fullSubject);

    await session.commitTransaction();
    session.endSession();

    res.json({ success: true, paymentUrl });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('创建支付订单失败:', error);
    next(error); // 交给全局错误处理器
  }
});

/**
 * @route   POST /api/payment/notify
 * @desc    接收支付宝异步回调通知
 * @access  Public
 */
router.post('/notify', async (req, res, next) => {
  const data = req.body;
  console.log('接收到支付宝异步通知:', data);

  try {
    const isSignVerified = alipaySdk.checkNotifySign(data);
    if (!isSignVerified) {
      console.warn('支付宝回调验签失败:', data);
      return res.status(400).send('failure');
    }

    const { out_trade_no, trade_status, total_amount } = data;

    if (trade_status === 'TRADE_SUCCESS' || trade_status === 'TRADE_FINISHED') {
      const wallet = await Wallet.findOneAndUpdate(
        {
          'transactions.orderId': out_trade_no,
          'transactions.status': 'pending',
        },
        {
          $inc: { balance: parseFloat(total_amount) },
          $set: { 'transactions.$.status': 'completed' },
        },
        { new: true }
      );

      if (wallet) {
        const trx = wallet.transactions.find(t => t.orderId === out_trade_no);
        if (trx && parseFloat(trx.amount.toString()) !== parseFloat(total_amount)) {
            console.error(`严重警告: 订单 ${out_trade_no} 金额不匹配! 系统记录: ${trx.amount}, 支付宝回调: ${total_amount}`);
            // TODO: 这里应该有一个监控和报警机制
        }
        console.log(`订单 ${out_trade_no} 支付成功，用户 ${wallet.user} 余额已更新。`);
      } else {
        console.log(`订单 ${out_trade_no} 可能已被处理或不存在。`);
      }
      res.send('success');
    } else {
      console.log(`订单 ${out_trade_no} 状态为 ${trade_status}，无需处理。`);
      res.send('success');
    }
  } catch (error) {
    console.error('处理支付宝回调时发生错误:', error);
    next(error);
    res.status(500).send('failure');
  }
});

module.exports = router;
