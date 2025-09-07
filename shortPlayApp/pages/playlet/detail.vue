<template>
  <view class="content">
    <!-- 返回按钮 -->
    <image class="back" src="../../static/img/left_jt.png" mode="scaleToFill" @click="toBack"></image>

    <!-- 短剧基本信息 -->
    <view class="shortplay-info" v-if="shortplayData">
      <!-- 封面图 -->
      <view class="cover-container">
        <image
          :src="getImageUrl(shortplayData.coverImage)"
          class="cover-image"
          mode="aspectFill"
          @error="onImageError"
          @load="onImageLoad"
        ></image>
        <!-- 图片加载失败时的占位图 -->
        <view class="cover-placeholder" v-if="imageLoadFailed">
          <text class="placeholder-text">封面加载失败</text>
        </view>
      </view>

      <!-- 标题和简介 -->
      <view class="info-container">
        <text class="title">{{ shortplayData.title || '短剧标题' }}</text>
        <text class="description">{{ shortplayData.description || '暂无简介' }}</text>

        <!-- 统计信息 -->
        <view class="stats">
          <view class="stat-item">
            <text class="stat-label">播放量</text>
            <text class="stat-value">{{ shortplayData.totalPlayCount || 0 }}</text>
          </view>
          <view class="stat-item">
            <text class="stat-label">点赞数</text>
            <text class="stat-value">{{ shortplayData.likeCount || 0 }}</text>
          </view>
          <view class="stat-item">
            <text class="stat-label">共多少集</text>
            <text class="stat-value">{{ worksList.length }}集</text>
          </view>
        </view>

        <!-- 立即播放按钮 -->
        <view class="play-button-container" v-if="worksList.length > 0">
          <button class="play-button" @click="playEpisode(worksList[0], 0)">
            <text class="play-icon">▶️</text>
            <text class="play-text">立即播放</text>
          </button>
        </view>
      </view>
    </view>

    <!-- 剧集列表 -->
    <view class="episodes-section" v-if="worksList.length > 0">
      <view class="section-title">剧集列表</view>
      <view class="episodes-grid">
        <view class="episode-item" v-for="(work, index) in worksList" :key="work._id" @click="playEpisode(work, index)">
          <view class="episode-number">{{ work.episodeNumber }}</view>
          <view class="episode-info">
            <text class="episode-title">{{ work.title }}</text>
            <text class="episode-duration">{{ formatDuration(work.duration) }}</text>
          </view>
          <view class="episode-stats">
            <text class="play-count">{{ work.playCount || 0 }}次播放</text>
            <text class="like-count">{{ work.likeCount || 0 }}点赞</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 加载状态 -->
    <view class="loading" v-if="loading">
      <text>加载中...</text>
    </view>

    <!-- 错误状态 -->
    <view class="error" v-if="error">
      <text>{{ error }}</text>
      <button @click="loadShortplayData" class="retry-btn">重试</button>
    </view>

    <!-- 空状态 -->
    <view class="empty" v-if="!loading && !error && worksList.length === 0">
      <text>暂无剧集</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { getApiConfig, getAssetBaseURL } from '../../config/index.js';
import http from '@/utils/request.js';

const playletId = ref(''); // 短剧ID
const shortplayData = ref(null); // 短剧基本信息
const worksList = ref([]); // 剧集列表
const loading = ref(true); // 加载状态
const error = ref(''); // 错误信息
const imageLoadFailed = ref(false); // 图片加载失败状态

// 从配置文件获取API和资源URL
const apiConfig = getApiConfig();
const assetBaseURL = getAssetBaseURL();

onLoad(options => {
  console.log('📱 短剧详情页面加载，参数:', options);

  if (options.playletId) {
    playletId.value = options.playletId;
    loadShortplayData();
  } else {
    error.value = '缺少短剧ID参数';
    loading.value = false;
  }
});

// 加载短剧数据
const loadShortplayData = async () => {
  loading.value = true;
  error.value = '';

  try {
    console.log('🔄 开始加载短剧数据，ID:', playletId.value);
    console.log('🌐 当前API配置:', apiConfig);

    // 获取合集信息和剧集列表
    await loadSingleWorkAndCollection();

    loading.value = false;
    console.log('✅ 短剧数据加载完成，共获取到', worksList.value.length, '集');
  } catch (e) {
    console.error('❌ 加载短剧数据失败:', e);
    error.value = '加载失败，请重试';
    loading.value = false;
  }
};

// 加载合集信息和剧集列表
const loadSingleWorkAndCollection = async () => {
  try {
    // 1. 获取合集详情（包含剧集列表）
    const response = await http.get(`/collection/${playletId.value}`);

    if (response.statusCode === 200 && response.data.success) {
      const collection = response.data.data;
      console.log('📚 合集信息加载成功:', collection);

      // 设置合集基本信息
      shortplayData.value = {
        title: collection.title,
        description: collection.description,
        coverImage: collection.coverImage,
        totalPlayCount: collection.totalPlayCount,
        collectCount: collection.collectCount,
        workCount: collection.workCount,
      };

      // 设置剧集列表
      worksList.value = collection.works || [];

      console.log('✅ 合集数据设置完成:', {
        title: shortplayData.value.title,
        worksCount: worksList.value.length,
      });
    } else {
      throw new Error(response.data.message || '合集不存在');
    }
  } catch (err) {
    console.error('❌ 加载合集信息失败:', err);
    throw err;
  }
};

// 播放剧集
const playEpisode = (work, index) => {
  console.log('▶️ 播放剧集:', work, '索引:', index);

  // 跳转到播放页面
  uni.navigateTo({
    url: `/pages/playlet/episodes?collectionId=${playletId.value}&episodeIndex=${index}&totalEpisodes=${worksList.value.length}`,
  });
};

// 获取图片完整URL
const getImageUrl = imagePath => {
  if (!imagePath) {
    console.log('⚠️ 图片路径为空');
    return getDefaultCover();
  }

  console.log('🖼️ 原始图片路径:', imagePath);

  if (imagePath.startsWith('http')) {
    console.log('✅ 已经是完整URL:', imagePath);
    return imagePath;
  }

  if (assetBaseURL) {
    const fullUrl = `${assetBaseURL}${imagePath}`;
    console.log('🔗 构建完整图片URL:', fullUrl);
    return fullUrl;
  }

  console.log('⚠️ 无法构建图片URL，返回默认封面');
  return getDefaultCover();
};

// 获取默认封面
const getDefaultCover = () => {
  return '/static/img/video.png'; // 使用本地默认封面
};

// 格式化时长
const formatDuration = seconds => {
  if (!seconds) return '00:00';

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// 图片加载成功处理
const onImageLoad = e => {
  console.log('✅ 封面图片加载成功:', e);
  console.log('✅ 图片路径:', shortplayData.value?.coverImage);
  console.log('✅ 完整URL:', getImageUrl(shortplayData.value?.coverImage));
};

// 图片加载失败处理
const onImageError = e => {
  console.error('❌ 封面图片加载失败:', e);
  console.error('❌ 图片路径:', shortplayData.value?.coverImage);
  console.error('❌ 完整URL:', getImageUrl(shortplayData.value?.coverImage));

  // 设置图片加载失败状态
  imageLoadFailed.value = true;

  // 显示错误提示
  uni.showToast({
    title: '封面图片加载失败',
    icon: 'none',
    duration: 2000,
  });
};

// 返回上一页
const toBack = () => {
  uni.navigateBack();
};
</script>

<style>
.content {
  width: 100%;
  min-height: 100vh;
  background-color: #0e0f0f;
  padding-bottom: 40rpx;
}

.back {
  position: absolute;
  z-index: 100;
  top: 70rpx;
  left: 20rpx;
  width: 50rpx;
  height: 50rpx;
  border-radius: 50%;
  background-color: rgba(234, 234, 234, 0.2);
}

/* 短剧基本信息 */
.shortplay-info {
  padding: 120rpx 30rpx 40rpx;
}

.cover-container {
  display: flex;
  justify-content: center;
  margin-bottom: 30rpx;
}

.cover-image {
  width: 300rpx;
  height: 400rpx;
  border-radius: 20rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.3);
}

.cover-placeholder {
  width: 300rpx;
  height: 400rpx;
  border-radius: 20rpx;
  background-color: rgba(143, 143, 148, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx dashed rgba(255, 255, 255, 0.3);
}

.placeholder-text {
  color: #8f8f94;
  font-size: 28rpx;
  text-align: center;
}

.info-container {
  /* 移除居中对齐，让子元素各自控制对齐方式 */
}

.title {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  color: #ffffff;
  margin-bottom: 20rpx;
  text-align: center; /* 标题保持居中 */
}

.description {
  display: block;
  font-size: 28rpx;
  color: #8f8f94;
  line-height: 1.5;
  margin-bottom: 30rpx;
  text-align: left;
  text-indent: 2em; /* 首行缩进两个字符 */
}

.stats {
  display: flex;
  justify-content: space-around;
  padding: 20rpx 0;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-label {
  font-size: 24rpx;
  color: #8f8f94;
  margin-bottom: 10rpx;
}

.stat-value {
  font-size: 32rpx;
  font-weight: bold;
  color: #ffffff;
}

/* 播放按钮 */
.play-button-container {
  margin-top: 40rpx;
  display: flex;
  justify-content: center;
}

.play-button {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #ff6b6b, #ee5a24);
  border: none;
  border-radius: 50rpx;
  padding: 25rpx 50rpx;
  box-shadow: 0 8rpx 24rpx rgba(255, 107, 107, 0.3);
  transition: all 0.3s ease;
}

.play-button:active {
  transform: scale(0.95);
  box-shadow: 0 4rpx 12rpx rgba(255, 107, 107, 0.3);
}

.play-icon {
  font-size: 32rpx;
  margin-right: 15rpx;
}

.play-text {
  font-size: 32rpx;
  font-weight: bold;
  color: #ffffff;
}

/* 剧集列表 */
.episodes-section {
  padding: 0 30rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #ffffff;
  margin-bottom: 30rpx;
  text-align: center;
}

.episodes-grid {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.episode-item {
  display: flex;
  align-items: center;
  padding: 20rpx;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 15rpx;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.episode-number {
  width: 80rpx;
  height: 80rpx;
  background-color: #8f8f94;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: bold;
  color: #ffffff;
  margin-right: 20rpx;
}

.episode-info {
  flex: 1;
  margin-right: 20rpx;
}

.episode-title {
  display: block;
  font-size: 28rpx;
  color: #ffffff;
  margin-bottom: 10rpx;
}

.episode-duration {
  display: block;
  font-size: 24rpx;
  color: #8f8f94;
}

.episode-stats {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.play-count,
.like-count {
  font-size: 22rpx;
  color: #8f8f94;
  margin-bottom: 5rpx;
}

/* 加载状态 */
.loading,
.error,
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 30rpx;
  color: #8f8f94;
  font-size: 28rpx;
}

.retry-btn {
  margin-top: 30rpx;
  padding: 20rpx 40rpx;
  background-color: #8f8f94;
  color: #ffffff;
  border: none;
  border-radius: 10rpx;
  font-size: 28rpx;
}
</style>
