<template>
  <view class="content">
    <!-- 返回按钮 -->
    <image class="back" src="../../static/img/left_jt.png" mode="scaleToFill" @click="toBack"></image>

    <!-- 视频播放器 -->
    <view class="video-container" v-if="currentWork">
      <video
        :src="getVideoUrl(currentWork.videoUrl)"
        class="video-player"
        :poster="getImageUrl(currentWork.coverImage)"
        controls
        autoplay
        @play="onVideoPlay"
        @pause="onVideoPause"
        @ended="onVideoEnded"
        @error="onVideoError"
      ></video>

      <!-- 视频信息 -->
      <view class="video-info">
        <text class="video-title">{{ currentWork.title }}</text>
        <text class="video-episode">第{{ currentWork.episodeNumber }}集</text>
        <text class="video-duration">时长: {{ formatDuration(currentWork.duration) }}</text>
      </view>
    </view>

    <!-- 剧集列表 -->
    <view class="episodes-section" v-if="worksList.length > 0">
      <view class="section-title">剧集列表</view>
      <view class="episodes-grid">
        <view
          class="episode-item"
          :class="{ current: index === currentEpisodeIndex }"
          v-for="(work, index) in worksList"
          :key="work._id"
          @click="switchEpisode(work, index)"
        >
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
      <button @click="loadEpisodeData" class="retry-btn">重试</button>
    </view>

    <!-- 空状态 -->
    <view class="empty" v-if="!loading && !error && worksList.length === 0">
      <text>暂无剧集</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onLoad, onShow, onHide } from '@dcloudio/uni-app';
import http from '@/utils/request.js';
import { getAssetBaseURL } from '@/config/index.js';

// --- State ---
const collectionId = ref(''); // 合集ID
const episodeIndex = ref(0); // 当前播放的剧集索引
const totalEpisodes = ref(0); // 总剧集数
const currentWork = ref(null); // 当前播放的作品
const worksList = ref([]); // 剧集列表
const loading = ref(true); // 加载状态
const error = ref(''); // 错误信息
const isPlaying = ref(false); // 是否正在播放
const assetBaseURL = getAssetBaseURL();

// --- Computed ---
const currentEpisodeIndex = computed(() => {
  return episodeIndex.value;
});

// --- Lifecycle Hooks ---
onLoad(options => {
  console.log('🎬 播放页面加载，参数:', options);

  if (options.collectionId) {
    collectionId.value = options.collectionId;
    episodeIndex.value = Number(options.episodeIndex) || 0;
    totalEpisodes.value = Number(options.totalEpisodes) || 0;
    loadEpisodeData();
  } else {
    error.value = '缺少合集ID参数';
    loading.value = false;
  }
});

onShow(() => {
  console.log('🎬 播放页面显示');
});

onHide(() => {
  console.log('🎬 播放页面隐藏');
  // 暂停视频播放
  pauseVideo();
});

// --- Methods ---

// 加载剧集数据
const loadEpisodeData = async () => {
  loading.value = true;
  error.value = '';

  try {
    console.log('🔄 开始加载剧集数据，合集ID:', collectionId.value);

    // 获取剧集列表
    await loadWorksList();

    // 设置当前播放的剧集
    if (worksList.value.length > 0) {
      currentWork.value = worksList.value[episodeIndex.value] || worksList.value[0];
      episodeIndex.value = worksList.value.findIndex(w => w._id === currentWork.value._id);
      console.log('✅ 当前播放剧集:', currentWork.value);
    }

    loading.value = false;
    console.log('✅ 剧集数据加载完成');
  } catch (err) {
    console.error('❌ 加载剧集数据失败:', err);
    error.value = '加载失败，请重试';
    loading.value = false;
  }
};

// 加载剧集列表
const loadWorksList = async () => {
  try {
    const response = await http.get(`/collection/${collectionId.value}`);

    if (response.data.success) {
      // The endpoint returns the collection object, which contains the works list.
      const collection = response.data.data;
      worksList.value = (collection.works || []).sort((a, b) => a.episodeNumber - b.episodeNumber);
      console.log('📺 合集剧集列表加载成功:', worksList.value);
    } else {
      throw new Error(response.data.message || '作品合集不存在');
    }
  } catch (err) {
    console.error('❌ 加载剧集列表失败:', err);
    throw err;
  }
};

// 切换剧集
const switchEpisode = (work, index) => {
  console.log('🔄 切换剧集:', work, '索引:', index);

  currentWork.value = work;
  episodeIndex.value = index;

  // 记录播放历史（可以添加到本地存储或发送到后端）
  recordPlayHistory(work);
};

// 记录播放历史
const recordPlayHistory = work => {
  console.log('📝 记录播放历史:', work.title);
  // 这里可以添加播放历史记录逻辑
};

// 获取视频完整URL
const getVideoUrl = videoPath => {
  if (!videoPath) return '';
  if (videoPath.startsWith('http')) {
    return videoPath;
  }
  return `${assetBaseURL}${videoPath}`;
};

// 获取图片完整URL
const getImageUrl = imagePath => {
  if (!imagePath) return '';
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  return `${assetBaseURL}${imagePath}`;
};

// 格式化时长
const formatDuration = seconds => {
  if (!seconds) return '00:00';

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// 视频播放事件
const onVideoPlay = () => {
  console.log('▶️ 视频开始播放');
  isPlaying.value = true;
};

// 视频暂停事件
const onVideoPause = () => {
  console.log('⏸️ 视频暂停');
  isPlaying.value = false;
};

// 视频结束事件
const onVideoEnded = () => {
  console.log('⏹️ 视频播放结束');
  isPlaying.value = false;

  // 自动播放下一集
  playNextEpisode();
};

// 视频错误事件
const onVideoError = e => {
  console.error('❌ 视频播放错误:', e);
  error.value = '视频播放失败，请重试';
};

// 播放下一集
const playNextEpisode = () => {
  if (episodeIndex.value < worksList.value.length - 1) {
    const nextWork = worksList.value[episodeIndex.value + 1];
    switchEpisode(nextWork, episodeIndex.value + 1);
  } else {
    console.log('🎬 已经是最后一集');
    uni.showToast({
      title: '已经是最后一集',
      icon: 'none',
    });
  }
};

// 播放上一集
const playPreviousEpisode = () => {
  if (episodeIndex.value > 0) {
    const prevWork = worksList.value[episodeIndex.value - 1];
    switchEpisode(prevWork, episodeIndex.value - 1);
  } else {
    console.log('🎬 已经是第一集');
    uni.showToast({
      title: '已经是第一集',
      icon: 'none',
    });
  }
};

// 暂停视频
const pauseVideo = () => {
  // 这里可以通过ref调用video组件的pause方法
  console.log('⏸️ 暂停视频');
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
  background-color: #000000;
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

/* 视频播放器 */
.video-container {
  padding: 120rpx 20rpx 40rpx;
}

.video-player {
  width: 100%;
  height: 400rpx;
  border-radius: 20rpx;
  background-color: #000;
}

.video-info {
  padding: 30rpx 0;
  text-align: center;
}

.video-title {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: #ffffff;
  margin-bottom: 15rpx;
}

.video-episode {
  display: block;
  font-size: 28rpx;
  color: #8f8f94;
  margin-bottom: 10rpx;
}

.video-duration {
  display: block;
  font-size: 24rpx;
  color: #8f8f94;
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
  transition: all 0.3s ease;
}

.episode-item.current {
  background-color: rgba(143, 143, 148, 0.3);
  border-color: #8f8f94;
}

.episode-item:active {
  transform: scale(0.98);
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

.episode-item.current .episode-number {
  background-color: #ffffff;
  color: #000000;
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
