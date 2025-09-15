//引入alipay SDK
const { AlipaySdk } = require('alipay-sdk');

const config = require('./index');

//初始化SDK
const alipaySdk = new AlipaySdk({
  appId: config.appId,
  gateway: config.gateway,
  notifyUrl: config.notifyUrl,
  signType: config.signType,
  charset: config.charset,
  privateKey: config.merchantPrivateKey,
  alipayPublicKey: config.alipayPublicKey,
});

module.exports = alipaySdk;
