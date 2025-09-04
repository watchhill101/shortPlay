<template>
  <view class="login-container">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar">
      <view class="navbar-content">
        <u-icon name="arrow-left" size="20" color="#333" @click="goBack"></u-icon>
        <text class="navbar-title">登录</text>
        <view style="width: 20px;"></view>
      </view>
    </view>

    <!-- 登录表单 -->
    <view class="login-form">
      <!-- Logo区域 -->
      <view class="logo-section">
        <image class="logo" src="/static/img/logo.png" mode="aspectFit"></image>
        <text class="app-name">MaiShort</text>
        <text class="welcome-text">欢迎使用手机号登录</text>
      </view>

      <!-- 手机号输入 -->
      <view class="input-section">
        <u-input
          v-model="phone"
          placeholder="请输入手机号"
          type="number"
          maxlength="11"
          :border="true"
          :clearable="true"
          prefixIcon="phone"
          prefixIconStyle="color: #909399"
        ></u-input>
      </view>

      <!-- 验证码输入 -->
      <view class="input-section">
        <view class="code-input-wrapper">
          <u-input
            v-model="code"
            placeholder="请输入验证码"
            type="number"
            maxlength="6"
            :border="true"
            :clearable="true"
            prefixIcon="shield"
            prefixIconStyle="color: #909399"
            style="flex: 1;"
          ></u-input>
          <u-button
            :text="codeButtonText"
            :disabled="codeButtonDisabled"
            @click="sendCode"
            type="primary"
            size="small"
            style="margin-left: 10px; width: 100px;"
          ></u-button>
        </view>
      </view>

      <!-- 登录按钮 -->
      <view class="button-section">
        <u-button
          text="登录"
          type="primary"
          :loading="loginLoading"
          @click="handleLogin"
          :disabled="!phone || !code"
          size="large"
        ></u-button>
      </view>

      <!-- 用户协议 -->
      <view class="agreement-section">
        <text class="agreement-text">
          登录即表示同意
          <text class="link-text" @click="showAgreement">《用户协议》</text>
          和
          <text class="link-text" @click="showPrivacy">《隐私政策》</text>
        </text>
      </view>
    </view>

    <!-- 加载提示 -->
    <u-loading-page :loading="pageLoading" loading-text="登录中..."></u-loading-page>
  </view>
</template>

<script>
import authService from '@/utils/authService'

export default {
  data() {
    return {
      phone: '',
      code: '',
      loginLoading: false,
      pageLoading: false,
      codeButtonText: '获取验证码',
      codeButtonDisabled: false,
      countdown: 0,
      fromSwitch: false // 是否从用户切换页面来的
    }
  },
  onLoad(options) {
    // 获取状态栏高度
    const systemInfo = uni.getSystemInfoSync()
    this.statusBarHeight = systemInfo.statusBarHeight
    
    // 检查是否从用户切换页面来的
    this.fromSwitch = options.from === 'switch'
    
    // 如果已经登录且不是从切换页面来的，直接跳转到首页
    if (authService.isLoggedIn() && !this.fromSwitch) {
      uni.reLaunch({
        url: '/pages/index/index'
      })
    }
  },
  methods: {
    // 返回上一页
    goBack() {
      if (this.fromSwitch) {
        // 从用户切换页面来的，返回到个人中心
        uni.reLaunch({
          url: '/pages/mine/index'
        })
      } else {
        uni.navigateBack()
      }
    },

    // 发送验证码
    async sendCode() {
      if (!this.phone) {
        uni.showToast({
          title: '请输入手机号',
          icon: 'none'
        })
        return
      }

      if (!/^1[3-9]\d{9}$/.test(this.phone)) {
        uni.showToast({
          title: '请输入正确的手机号',
          icon: 'none'
        })
        return
      }

      try {
        const response = await authService.sendSmsCode(this.phone)

        if (response.success) {
          uni.showToast({
            title: '验证码已发送',
            icon: 'success'
          })
          this.startCountdown()
        } else {
          uni.showToast({
            title: response.message || '发送失败',
            icon: 'none'
          })
        }
      } catch (error) {
        console.error('发送验证码失败:', error)
        uni.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        })
      }
    },

    // 开始倒计时
    startCountdown() {
      this.countdown = 60
      this.codeButtonDisabled = true
      this.codeButtonText = `${this.countdown}s`
      
      const timer = setInterval(() => {
        this.countdown--
        this.codeButtonText = `${this.countdown}s`
        
        if (this.countdown <= 0) {
          clearInterval(timer)
          this.codeButtonDisabled = false
          this.codeButtonText = '获取验证码'
        }
      }, 1000)
    },

    // 处理登录
    async handleLogin() {
      if (!this.phone || !this.code) {
        uni.showToast({
          title: '请填写完整信息',
          icon: 'none'
        })
        return
      }

      this.loginLoading = true
      
      try {
        const response = await authService.loginWithPhone(this.phone, this.code)

        if (response.success) {
          uni.showToast({
            title: '登录成功',
            icon: 'success'
          })
          
          // 延迟跳转
          setTimeout(() => {
            if (this.fromSwitch) {
              // 从用户切换页面来的，返回到个人中心
              uni.reLaunch({
                url: '/pages/mine/index'
              })
            } else {
              // 正常登录，跳转到首页
              uni.reLaunch({
                url: '/pages/index/index'
              })
            }
          }, 1500)
        } else {
          uni.showToast({
            title: response.message || '登录失败',
            icon: 'none'
          })
        }
      } catch (error) {
        console.error('登录失败:', error)
        uni.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        })
      } finally {
        this.loginLoading = false
      }
    },

    // 显示用户协议
    showAgreement() {
      uni.showModal({
        title: '用户协议',
        content: '这里是用户协议内容...',
        showCancel: false
      })
    },

    // 显示隐私政策
    showPrivacy() {
      uni.showModal({
        title: '隐私政策',
        content: '这里是隐私政策内容...',
        showCancel: false
      })
    }
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
}

/* 自定义导航栏 */
.custom-navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 999;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
}

.navbar-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 44px 15px 10px;
  height: 44px;
}

.navbar-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

/* 登录表单 */
.login-form {
  padding: 120px 30px 30px;
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 120px);
}

/* Logo区域 */
.logo-section {
  text-align: center;
  margin-bottom: 60px;
}

.logo {
  width: 80px;
  height: 80px;
  margin-bottom: 20px;
}

.app-name {
  display: block;
  font-size: 28px;
  font-weight: bold;
  color: #fff;
  margin-bottom: 10px;
}

.welcome-text {
  display: block;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.8);
}

/* 输入区域 */
.input-section {
  margin-bottom: 20px;
}

.code-input-wrapper {
  display: flex;
  align-items: center;
}

/* 按钮区域 */
.button-section {
  margin-top: 30px;
  margin-bottom: 30px;
}

/* 用户协议 */
.agreement-section {
  text-align: center;
  margin-top: auto;
  padding-bottom: 30px;
}

.agreement-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.5;
}

.link-text {
  color: #fff;
  text-decoration: underline;
}
</style>