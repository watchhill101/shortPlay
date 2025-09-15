const alipaySdk = require('../config/initAlipay');
const config = require('../config/index');

/**
 * 创建支付宝订单
 * @param {string} orderId - 商户订单号，必须唯一
 * @param {number} amount - 支付金额，单位为元
 * @param {string} subject - 订单标题
 * @returns {Promise<string>} 返回一个包含支付链接的 Promise
 */

async function createOrder(orderId, amount, subject) {
  try {
    // 调用支付宝手机网站支付接口，并强制使用 POST 方法
    const result = await alipaySdk.exec(
      'alipay.trade.wap.pay',
      {
        notifyUrl: config.notifyUrl, // 异步回调地址
        bizContent: {
          out_trade_no: orderId,
          total_amount: amount.toString(),
          subject: subject,
          product_code: 'QUICK_WAP_WAY', // 固定值
        },
      },
      {
        // 强制 SDK 使用 POST 方法请求支付宝网关
        method: 'POST',
        // 使用 [连接超时, 读取超时] 的格式，避免与 method 配置冲突
        timeout: [15000, 15000],
      }
    );

    // result 即为支付宝返回的支付页面 URL，可以直接返回给前端
    return result;
  } catch (error) {
    console.error('创建支付宝订单失败:', error);
    throw error;
  }
}

module.exports = {
  createOrder,
};
