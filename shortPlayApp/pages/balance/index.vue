<template>
  <view>
    <u-navbar
      title="余额"
      :safeAreaInsetTop="true"
      :placeholder="true"
      bgColor="#ffffff"
      leftIconSize="24px"
      :autoBack="true"
    ></u-navbar>
    <view class="balance-container">
      <!-- 余额显示区域 -->
      <view class="balance-card">
        <text class="balance-label">我的余额</text>
        <view class="balance-amount">
          <text class="currency-symbol">¥</text>
          <text class="amount-value">{{ balance.toFixed(2) }}</text>
        </view>
      </view>

      <!-- 充值选项 -->
      <view class="recharge-section">
        <text class="section-title">选择充值金额</text>
        <view class="recharge-grid">
          <view
            v-for="item in rechargeOptions"
            :key="item.amount"
            class="recharge-item"
            :class="{ selected: selectedAmount === item.amount }"
            @click="selectAmount(item.amount)"
          >
            <text class="recharge-amount">{{ item.label }}</text>
          </view>
        </view>
      </view>

      <!-- 充值按钮 -->
      <view class="action-button-container">
        <button class="recharge-button" @click="handleRecharge" :disabled="!selectedAmount || loading">
          <text v-if="!loading">立即充值</text>
          <u-loading-icon v-else mode="circle" color="#FFFFFF"></u-loading-icon>
        </button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import request from '../../utils/request'; // 假设您的请求工具封装在 request.js

// --- state ---
const balance = ref(0.0); // 初始余额为0
const selectedAmount = ref(null);
const loading = ref(false);

const rechargeOptions = ref([
  { amount: 50, label: '50元' },
  { amount: 100, label: '100元' },
  { amount: 200, label: '200元' },
  { amount: 300, label: '300元' },
  { amount: 500, label: '500元' },
]);

// --- methods ---
const selectAmount = amount => {
  selectedAmount.value = amount;
};

const handleRecharge = async () => {
  if (!selectedAmount.value) {
    uni.showToast({
      title: '请选择充值金额',
      icon: 'none',
    });
    return;
  }

  loading.value = true;
  try {
    const response = await request.post('/payment/create', {
      amount: selectedAmount.value,
      subject: `余额充值 ${selectedAmount.value}元`,
    });

    console.log('支付接口返回:', response);

    if (response && response.success && response.paymentUrl) {
      // 在App环境中，可能需要使用Webview打开链接
      // 为了通用性，这里使用 uni.openURL，它会尝试在外部浏览器打开
      // 对于支付宝链接，这通常会唤起支付宝App
      uni.openURL({
        url: response.paymentUrl,
        success: () => {
          console.log('成功打开支付链接');
        },
        fail: err => {
          console.error('打开支付链接失败:', err);
          uni.showToast({
            title: '无法打开支付页面，请稍后重试',
            icon: 'none',
          });
        },
      });
    } else {
      throw new Error(response.message || '创建支付订单失败');
    }
  } catch (error) {
    console.error('充值失败:', error);
    uni.showToast({
      title: error.message || '充值请求失败，请检查网络',
      icon: 'none',
    });
  } finally {
    loading.value = false;
  }
};

// --- methods ---
const getBalance = async () => {
  try {
    const response = await request.get('/wallet/balance');
    if (response && response.data.success) {
      balance.value = parseFloat(response.data.balance);
    } else {
      throw new Error(response.data.message || '获取余额失败');
    }
  } catch (error) {
    console.error('获取余额失败:', error);
    uni.showToast({
      title: error.message || '无法获取余额',
      icon: 'none',
    });
  }
};

// --- lifecycle hooks ---
onShow(() => {
  getBalance();
});
</script>

<style scoped lang="scss">
.balance-container {
  min-height: 100vh;
  background-color: #f7f8fa;
  padding: 32rpx;
  box-sizing: border-box;
}

.balance-card {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  border-radius: 24rpx;
  padding: 48rpx;
  color: #ffffff;
  margin-bottom: 48rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.1);
}

.balance-label {
  font-size: 28rpx;
  opacity: 0.8;
}

.balance-amount {
  margin-top: 16rpx;
  display: flex;
  align-items: baseline;
  font-weight: bold;
}

.currency-symbol {
  font-size: 40rpx;
  margin-right: 8rpx;
}

.amount-value {
  font-size: 80rpx;
  line-height: 1;
}

.recharge-section {
  background-color: #ffffff;
  padding: 32rpx;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333333;
  margin-bottom: 32rpx;
  display: block;
}

.recharge-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24rpx;
}

.recharge-item {
  background-color: #f7f8fa;
  border-radius: 16rpx;
  padding: 32rpx 0;
  text-align: center;
  border: 2rpx solid transparent;
  transition: all 0.2s ease-in-out;

  &.selected {
    background-color: #e6f7ff;
    border-color: #4facfe;
    color: #4facfe;
    font-weight: bold;
  }
}

.recharge-amount {
  font-size: 32rpx;
}

.action-button-container {
  margin-top: 64rpx;
}

.recharge-button {
  background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);
  color: #ffffff;
  border: none;
  border-radius: 48rpx;
  font-size: 32rpx;
  height: 96rpx;
  line-height: 96rpx;
  box-shadow: 0 8rpx 16rpx rgba(79, 172, 254, 0.3);

  &[disabled] {
    opacity: 0.6;
    box-shadow: none;
  }
}
</style>
