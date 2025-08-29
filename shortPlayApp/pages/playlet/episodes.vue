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

<script>
// Removed xqx-player import to fix module resolution error
// import XqxPlayer from 'uni_modules/xqx-player/components/xqx-player/xqx-player.vue';

export default {
  components: {
    // XqxPlayer - removed due to paid plugin dependency
  },

  data() {
    return {
      title: 'discover',

      supplyEpisodes: {
        episodes: null,
        url: null,
      },

      //当前播放哪一集的信息，由组件通知获得
      currentEpisodes: {},

      //短剧详情
      playletDetail: {},

      // 短剧剧集列表
      episodesList: [],

      episodesStart: 0,
    };
  },
  onLoad(option) {
    let me = this;

    if (option.episodesStart) {
      me.episodesStart = Number(option.episodesStart);
    }

    me.playletQueryDetail();
  },

  onShow() {
    let me = this;

    //页面初始化时，第一次调用me.$refs.playPanelRef 可能为空
    if (me.$refs.playPanelRef) {
      // me.$refs.playPanelRef.playVideo(); // Commented out due to removed component
      console.log('Video play requested');
    }
  },

  onHide() {
    let me = this;
    // me.$refs.playPanelRef.pauseVideo(); // Commented out due to removed component
    console.log('Video pause requested');
  },

  methods: {
    //只是通知当前播放哪一集，即使当前集的视频需要先购买才能播放也会通知
    onEpisodesStart(episodes, episodesItem) {
      let me = this;
      console.log('onEpisodesStart: episodes=' + episodes + ' ,episodesItem=' + JSON.stringify(episodesItem));

      me.currentEpisodes = episodesItem;

      //触发加载额外的短剧播放列表
      if (episodes > me.episodesList.length - 10) {
        //me.episodesList = me.episodesList.concat(extraEpisodesList)
        console.log('onEpisodesStart: 触发加载额外的短剧播放列表');
      }
    },

    //如果当前集不允许播放，回调让使用方决定怎么做，比如弹窗购买提示视图
    onEpisodesForbit(episodes, episodesItem) {
      let me = this;
      console.log('onEpisodesForbit: episodes=' + episodes + ' , episodesItem=' + JSON.stringify(episodesItem));
    },

    // 模拟获取短剧详情数据
    playletQueryDetail() {
      let me = this;

      // 模拟数据
      me.playletDetail = {
        id: 1,
        title: '示例短剧',
        description: '这是一个示例短剧的描述',
        totalEpisodes: 10,
      };

      me.episodesList = [
        {
          id: 1,
          title: '第1集',
          url: 'https://example.com/episode1.mp4',
          thumbnail: '/static/img/video.png',
        },
        {
          id: 2,
          title: '第2集',
          url: 'https://example.com/episode2.mp4',
          thumbnail: '/static/img/video.png',
        },
        {
          id: 3,
          title: '第3集',
          url: 'https://example.com/episode3.mp4',
          thumbnail: '/static/img/video.png',
        },
      ];

      console.log('加载短剧详情数据完成');
    },
  },
};
</script>

<style scoped>
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
