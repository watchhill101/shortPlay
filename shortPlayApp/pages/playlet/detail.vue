<template>
  <view class="content">
    <image class="back" src="../../static/img/left_jt.png" mode="scaleToFill" @click="toBack"></image>

    <view class="text-area">
      <text class="title">{{ pageTitle }}</text>
    </view>

    <view class="episodes">
      <view class="tips">点击观看：</view>
      <view class="item" v-for="index in 7" :key="index" @click="toPlayEpisodes(index)">{{ index }}</view>
    </view>

    <view class="episodes">
      <view class="episodescurrent" @click="toPlayEpisodes()">点击继续观看</view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';

// --- state ---
const pageTitle = ref('短剧详情');

// --- methods ---
const toPlayEpisodes = episodesStart => {
  let url = '/pages/playlet/episodes';
  if (episodesStart) {
    url += '?episodesStart=' + episodesStart;
  }
  uni.navigateTo({ url });
};

const toBack = () => {
  uni.navigateBack();
};
</script>

<style>
.content {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: #0e0f0f;
}

.text-area {
  display: flex;
  justify-content: center;
  margin-top: 60rpx;
}

.title {
  font-size: 36rpx;
  color: #8f8f94;
}

.episodes {
  display: flex;
  justify-content: center;
  padding: 6rpx;
  margin-top: 60rpx;
}

.episodes .tips {
  color: #ffffff;
}

.episodes .item {
  width: 60rpx;
  height: 60rpx;
  text-align: center;
  color: #ffffff;
  background-color: #8f8f94;
  margin-left: 10rpx;
  border-radius: 10rpx;
  line-height: 60rpx;
}

.episodescurrent {
  margin-top: 60rpx;
  color: #ffffff;
  background-color: #8f8f94;
  padding: 10rpx 30rpx 10rpx 30rpx;
  border-radius: 10rpx;
  line-height: 60rpx;
}

.back {
  position: absolute;
  z-index: 100;
  top: 70rpx;
  left: 20rpx;
  font-size: 38rpx;
  color: #ffffff;
  width: 50rpx;
  height: 50rpx;
  text-align: center;
  font-weight: bolder;
  border-radius: 50%;
  background-color: #eaeaea33;
}
</style>
