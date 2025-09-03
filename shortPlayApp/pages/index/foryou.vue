<template>
  <view class="foryou-container" :style="'height: calc(100vh - ' + navBarHeight + 'px)'">
    <!-- Placeholder for video player -->
    <view class="video-placeholder">
      <text>视频播放器组件</text>
      <text class="subtitle">原使用付费插件 xqx-player</text>
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

  props: {
    fowyouShow: {
      type: Boolean,
      default: false,
    },
  },

  data() {
    return {
      title: 'discover',

      //当前播放哪一集的信息，由组件通知获得
      currentEpisodes: {},

      // 推荐的短剧列表
      episodesList: [],

      supplyEpisodes: {
        episodes: null,
        url: null,
      },

      navBarHeight: 0,
    };
  },

  created() {
    let me = this;

    me.initViewInfo();
    me.playletQueryForyou();
  },

  watch: {
    //页面不显示要暂停播放，延时处理确保时机合适
    fowyouShow: {
      handler(newShow, oldShow) {
        let me = this;

        setTimeout(() => {
          if (!me.$refs.playPanelRef) {
            return;
          }

          if (newShow) {
            // me.$refs.playPanelRef.playVideo(); // Commented out due to removed component
            console.log('Video play requested');
          } else {
            // me.$refs.playPanelRef.pauseVideo(); // Commented out due to removed component
            console.log('Video pause requested');
          }
        }, 1000);
      },
      // 强制立即执行回调
      immediate: true,
    },
  },

  methods: {
    //根据不同运行环境，计算高度适配
    initViewInfo() {
      let me = this;

      // pages.json 中tabBar 设置了高度
      // #ifdef APP-PLUS
      me.navBarHeight = 0;
      // #endif
      // #ifndef APP-PLUS
      me.navBarHeight = 60;
      // #endif
    },

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

    // 模拟获取推荐短剧数据
    playletQueryForyou() {
      let me = this;

      // 模拟数据
      me.episodesList = [
        {
          id: 1,
          title: '示例短剧1',
          episode: 1,
          url: 'https://example.com/video1.mp4',
          thumbnail: '/static/img/video.png',
        },
        {
          id: 2,
          title: '示例短剧2',
          episode: 1,
          url: 'https://example.com/video2.mp4',
          thumbnail: '/static/img/video.png',
        },
      ];

      console.log('加载推荐短剧数据完成');
    },
  },
};
</script>

<style scoped>
.foryou-container {
  width: 100%;
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
}
</style>
