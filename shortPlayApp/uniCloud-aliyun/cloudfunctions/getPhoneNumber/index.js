'use strict';

// 引入 uni-id-common
const uniIdCommon = require('uni-id-common');
// 注意：自2023年11月30日起，新开通的一键登录不再需要配置文件

exports.main = async (event, context) => {
  console.log('📱 getPhoneNumber 云函数被调用，参数:', event);

  // 提取前端传递的参数
  const { access_token, openid } = event;

  // 校验必需参数
  if (!access_token || !openid) {
    return {
      code: 400,
      message: '缺少必需参数：access_token 或 openid',
    };
  }

  try {
    // 第一步：通过运营商凭证获取手机号
    console.log('📱 正在通过一键登录获取手机号...');
    console.log('📱 注意：需要HBuilderX 3.94+版本，自2023年11月30日起不再需要apiKey');

    const phoneRes = await uniCloud.getPhoneNumber({
      provider: 'univerify',
      access_token: access_token,
      openid: openid,
      // 注意：自2023年11月30日起，新开通的一键登录账户不再需要apiKey
      // 但需要确保HBuilderX版本为3.94+
    });

    console.log('📱 一键登录获取手机号结果:', phoneRes);

    // 检查获取手机号是否成功
    if (phoneRes.code !== 0 || !phoneRes.phoneNumber) {
      return {
        code: phoneRes.code || 500,
        message: phoneRes.message || '获取手机号失败',
        detail: phoneRes,
      };
    }

    const phoneNumber = phoneRes.phoneNumber;
    console.log('📱 获取到手机号:', phoneNumber);

    // 直接返回手机号，让前端处理后续登录逻辑
    console.log('📱 一键登录成功，返回手机号给前端处理');

    return {
      errCode: 0,
      errMsg: '获取手机号成功',
      phoneNumber: phoneNumber,
      message: '一键登录获取手机号成功，请前端调用后端登录接口',
    };
  } catch (error) {
    console.error('📱 云函数执行异常:', error);

    // 检查是否是apiKey相关错误
    if (error.message && error.message.includes('apiKey')) {
      return {
        code: 500,
        message:
          'HBuilderX版本过旧：请升级到3.94+版本。自2023年11月30日起，新开通的一键登录账户不再需要apiKey，但需要HBuilderX 3.94+版本支持。',
        error: error.message,
        solution: '请升级HBuilderX到3.94+版本后重新部署云函数',
      };
    }

    return {
      code: 500,
      message: '云函数执行异常',
      error: error.message,
      stack: error.stack,
    };
  }
};
