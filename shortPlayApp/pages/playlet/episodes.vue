<template>
  <view class="content">
    <!-- Placeholder for video player -->
    <view class="video-placeholder">
      <text>剧集播放器组件</text>
      <text class="subtitle">原使用付费插件 xqx-player</text>
      <view class="episode-info">
        <text>当前剧集: {{ episodesStart + 1 }}</text>
        <text>总集数: {{ episodesList.length }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { onLoad, onShow, onHide } from '@dcloudio/uni-app';

// --- state ---
const title = ref('discover');
const supplyEpisodes = reactive({
  episodes: null,
  url: null,
});
const currentEpisodes = reactive({});
const playletDetail = reactive({});
const episodesList = reactive([]);
const episodesStart = ref(0);

// --- methods ---
const onEpisodesStart = (episodes, episodesItem) => {
  console.log('onEpisodesStart: episodes=' + episodes + ' ,episodesItem=' + JSON.stringify(episodesItem));
  Object.assign(currentEpisodes, episodesItem);

  if (episodes > episodesList.length - 10) {
    console.log('onEpisodesStart: 触发加载额外的短剧播放列表');
  }
};

const onEpisodesForbit = (episodes, episodesItem) => {
  console.log('onEpisodesForbit: episodes=' + episodes + ' , episodesItem=' + JSON.stringify(episodesItem));
};

const playletQueryDetail = () => {
  const mockDetail = {
    id: 1,
    title: '示例短剧',
    description: '这是一个示例短剧的描述',
    totalEpisodes: 10,
  };
  Object.assign(playletDetail, mockDetail);

  const mockEpisodes = [
    { id: 1, title: '第1集', url: 'https://example.com/episode1.mp4', thumbnail: '/static/img/video.png' },
    { id: 2, title: '第2集', url: 'https://example.com/episode2.mp4', thumbnail: '/static/img/video.png' },
    { id: 3, title: '第3集', url: 'https://example.com/episode3.mp4', thumbnail: '/static/img/video.png' },
  ];
  episodesList.splice(0, episodesList.length, ...mockEpisodes);

  console.log('加载短剧详情数据完成');
};

// --- lifecycle hooks ---
onLoad(option => {
  if (option.episodesStart) {
    episodesStart.value = Number(option.episodesStart);
  }
  playletQueryDetail();
});

onShow(() => {
  // Since the original component ref is removed, we just log the action.
  // const playPanelRef = ...;
  // if (playPanelRef) {
  //   playPanelRef.playVideo();
  // }
  console.log('Video play requested');
});

onHide(() => {
  // Since the original component ref is removed, we just log the action.
  // const playPanelRef = ...;
  // if (playPanelRef) {
  //   playPanelRef.pauseVideo();
  // }
  console.log('Video pause requested');
});
</script>

<style scoped>
/* Styles remain the same */
.content {
  width: 100%;
  height: 100vh;
  background-color: #000;
}

.video-placeholder {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #fff;
  text-align: center;
}

.video-placeholder text {
  font-size: 18px;
  margin-bottom: 10px;
}

.video-placeholder .subtitle {
  font-size: 14px;
  color: #999;
  margin-bottom: 20px;
}

.episode-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 20px;
}

.episode-info text {
  font-size: 16px;
  color: #ccc;
}
</style>
