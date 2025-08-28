<template>
  <view class="content">
    <u-short-video
      :video-list="videoList"
      :current-index="currentVideo"
      @change="onVideoChange"
      @like="onLike"
      @comment="onComment"
      @share="onShare"
      @collect="onCollect"
      @follow="onFollow"
      @play="onPlay"
      @pause="onPause"
      @loadeddata="onLoadedData"
      @error="onVideoError"
      :autoplay="true"
      :muted="false"
      :controls="true"
      :show-center-play-btn="true"
      :enable-progress-gesture="true"
    ></u-short-video>
    <!-- 视频加载指示器 -->
    <view v-if="isLoading" class="loading-indicator">
      <u-loading size="50" color="#fff"></u-loading>
      <text class="loading-text">视频加载中...</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue';

// 当前播放视频索引
const currentVideo = ref(0);
// 播放状态
const playingState = ref(false);
// 加载状态
const isLoading = ref(false);
// 视频上下文实例
let videoContext = null;
// 上一次播放/暂停操作的时间戳，用于防抖动
let lastMediaOperationTime = 0;
// 防抖动时间阈值（毫秒）
const DEBOUNCE_THRESHOLD = 300;

// 视频列表数据 - 使用更可靠的测试视频地址
const videoList = reactive([
  {
    // 视频唯一ID
    id: '1',
    // 视频播放地址 - 更换为更可靠的测试地址(HTTPS)
    videoUrl: 'http://qn-o.jiangruyi.com/rjtsdl.MP4',
    // 视频进度
    progress: 0,
    bgColor: '#0e0f0f',

    // 作者信息
    author: {
      // 作者ID
      id: 'author1',
      // 作者头像
      avatar: '/static/img/1.gif',
      // 作者名称
      name: '小夹一下',
      // 视频描述
      desc: '呦呦呦',
    },
    // 点赞信息
    isLiked: false,
    likeCount: 128,
    // 评论信息
    commentCount: 25,
    // 评论列表
    commentList: [
      {
        id: '1',
        author: {
          id: 'user1',
          avatar: '/static/img/video.png',
          name: '用户1',
        },
        content: '这是一条评论',
        time: '2023-01-01 12:00:00',
      },
    ],

    // 分享信息
    shareCount: 12,
    // 收藏信息
    collectCount: 8,
    // 是否已收藏
    isCollected: false,
    // 视频加载状态
    loaded: false,
  },
  {
    // 视频唯一ID
    id: '2',
    // 视频播放地址 - 更换为更可靠的测试地址(HTTPS)
    videoUrl: 'http://v-cdn.zjol.com.cn/280443.mp4',
    // 视频进度
    progress: 0,
    bgColor: '#0e0f0f',

    // 作者信息
    author: {
      // 作者ID
      id: 'author1',
      // 作者头像
      avatar: '/static/img/1.gif',
      // 作者名称
      name: '沪上老头',
      // 视频描述
      desc: '上海上海',
    },
    // 点赞信息
    isLiked: false,
    likeCount: 128,
    // 评论信息
    commentCount: 25,
    // 评论列表
    commentList: [
      {
        id: '1',
        author: {
          id: 'user1',
          avatar: '/static/img/video.png',
          name: '用户1',
        },
        content: '这是一条评论',
        time: '2023-01-01 12:00:00',
      },
    ],

    // 分享信息
    shareCount: 12,
    // 收藏信息
    collectCount: 8,
    // 是否已收藏
    isCollected: false,
    // 视频加载状态
    loaded: false,
  },
]);

// 下一个视频 - 组件内部需要此方法进行视频切换
function goNext() {
  if (currentVideo.value < videoList.length - 1) {
    currentVideo.value++;
  } else {
    // 循环播放
    currentVideo.value = 0;
  }
}

// 上一个视频 - 组件内部需要此方法进行视频切换
function goPrev() {
  if (currentVideo.value > 0) {
    currentVideo.value--;
  } else {
    // 循环播放
    currentVideo.value = videoList.length - 1;
  }
}
// 视频切换事件处理
function onVideoChange(e) {
  // 增强的参数解析逻辑，适配不同格式的参数
  let index;
  if (typeof e === 'number') {
    index = e;
  } else if (e && typeof e === 'object') {
    index = e.index !== undefined ? e.index : e.detail?.index;
  }
  console.log('切换视频到:', index, '参数:', e);

  // 安全检查
  if (index === undefined || index === null || !Number.isInteger(index)) {
    console.error('无效的索引值:', index);
    return;
  }

  // 检查索引是否在视频列表范围内
  if (index < 0 || index >= videoList.length) {
    console.error('视频索引超出范围:', index, '列表长度:', videoList.length);
    return;
  }

  // 如果切换到新视频，且视频尚未加载完成，显示加载指示器
  if (!videoList[index]?.loaded) {
    isLoading.value = true;
  }

  // 更新当前视频索引
  currentVideo.value = index;
  // 重置播放状态
  playingState.value = false;
}

// 视频资源加载完成事件
function onLoadedData(e) {
  // 增强的参数解析逻辑，适配不同格式的参数
  let index;
  if (typeof e === 'number') {
    index = e;
  } else if (e && typeof e === 'object') {
    index = e.index !== undefined ? e.index : e.detail?.index;
  }
  console.log('视频资源加载完成:', index);

  // 标记视频为已加载
  if (index !== undefined && videoList[index]) {
    videoList[index].loaded = true;
  }

  // 隐藏加载指示器
  isLoading.value = false;

  // 保存视频上下文实例
  if (!videoContext) {
    videoContext = e.detail?.context;
  }
}

// 视频播放错误处理
function onVideoError(e) {
  let index;
  if (typeof e === 'number') {
    index = e;
  } else if (e && typeof e === 'object') {
    index = e.index !== undefined ? e.index : e.detail?.index;
  }
  console.error('视频播放错误:', e.detail?.errMsg || e, '索引:', index);

  // 隐藏加载指示器
  isLoading.value = false;

  // 显示错误提示
  uni.showToast({
    title: '视频加载失败，请稍后重试',
    icon: 'none',
    duration: 2000,
  });
}

// 点赞事件处理
function onLike(e) {
  // 增强的参数解析逻辑，适配不同格式的参数
  let index;
  if (typeof e === 'number') {
    index = e;
  } else if (e && typeof e === 'object') {
    index = e.index !== undefined ? e.index : e.detail?.index;
  }
  console.log('点赞视频:', index, '参数:', e);

  // 安全检查
  if (index === undefined || index === null || !Number.isInteger(index) || !videoList[index]) {
    console.error('视频索引不存在或无效:', index);
    return;
  }

  // 更新点赞状态和数量
  const video = videoList[index];
  video.like.isLiked = !video.like.isLiked;
  video.like.num += video.like.isLiked ? 1 : -1;

  // 显示点赞反馈
  uni.showToast({
    title: video.like.isLiked ? '点赞成功' : '取消点赞',
    icon: 'none',
    duration: 1500,
  });
}

// 评论事件处理
function onComment(e) {
  // 增强的参数解析逻辑，适配不同格式的参数
  let index;
  if (typeof e === 'number') {
    index = e;
  } else if (e && typeof e === 'object') {
    index = e.index !== undefined ? e.index : e.detail?.index;
  }
  console.log('评论视频:', index, '参数:', e);

  // 安全检查
  if (index === undefined || index === null || !Number.isInteger(index) || !videoList[index]) {
    console.error('视频索引不存在或无效:', index);
    return;
  }

  // 实际项目中这里应该跳转到评论页面或弹出评论输入框
  uni.showToast({
    title: '评论功能暂未实现',
    icon: 'none',
    duration: 1500,
  });
}

// 分享事件处理
function onShare(e) {
  // 增强的参数解析逻辑，适配不同格式的参数
  let index;
  if (typeof e === 'number') {
    index = e;
  } else if (e && typeof e === 'object') {
    index = e.index !== undefined ? e.index : e.detail?.index;
  }
  console.log('分享视频:', index, '参数:', e);

  // 安全检查
  if (index === undefined || index === null || !Number.isInteger(index) || !videoList[index]) {
    console.error('视频索引不存在或无效:', index);
    return;
  }

  // 调用微信小程序分享API
  uni.showShareMenu({
    withShareTicket: true,
    menus: ['shareAppMessage', 'shareTimeline'],
  });
}

// 收藏事件处理
function onCollect(e) {
  // 增强的参数解析逻辑，适配不同格式的参数
  let index;
  if (typeof e === 'number') {
    index = e;
  } else if (e && typeof e === 'object') {
    index = e.index !== undefined ? e.index : e.detail?.index;
  }
  console.log('收藏视频:', index, '参数:', e);

  // 安全检查
  if (index === undefined || index === null || !Number.isInteger(index) || !videoList[index]) {
    console.error('视频索引不存在或无效:', index);
    return;
  }

  // 更新收藏状态和数量
  const video = videoList[index];
  video.collect.isCollected = !video.collect.isCollected;
  video.collect.num += video.collect.isCollected ? 1 : -1;

  // 显示收藏反馈
  uni.showToast({
    title: video.collect.isCollected ? '收藏成功' : '取消收藏',
    icon: 'none',
    duration: 1500,
  });
}

// 关注作者事件处理
function onFollow(e) {
  // 增强的参数解析逻辑，适配不同格式的参数
  let index;
  if (typeof e === 'number') {
    index = e;
  } else if (e && typeof e === 'object') {
    index = e.index !== undefined ? e.index : e.detail?.index;
  }
  console.log('关注作者:', index, '参数:', e);

  // 安全检查
  if (index === undefined || index === null || !Number.isInteger(index) || !videoList[index]) {
    console.error('视频索引不存在或无效:', index);
    return;
  }

  // 更新关注状态
  const video = videoList[index];
  video.author.isFollowing = !video.author.isFollowing;

  // 显示关注反馈
  uni.showToast({
    title: video.author.isFollowing ? '关注成功' : '取消关注',
    icon: 'none',
    duration: 1500,
  });
}

// 视频播放事件处理 - 防抖动版本
function onPlay(e) {
  // 增强的参数解析逻辑，适配不同格式的参数
  let index;
  if (typeof e === 'number') {
    index = e;
  } else if (e && typeof e === 'object') {
    index = e.index !== undefined ? e.index : e.detail?.index;
  }

  // 获取当前时间戳
  const now = Date.now();
  // 防抖动检查
  if (now - lastMediaOperationTime < DEBOUNCE_THRESHOLD) {
    console.log('播放操作被防抖动拦截，时间间隔过短');
    return;
  }

  lastMediaOperationTime = now;
  console.log('视频播放:', index, '参数:', e);
  playingState.value = true;
  // 添加播放成功的日志输出，方便调试
  console.log('视频播放成功，当前索引:', index, '视频地址:', videoList[index]?.url);
}

// 视频暂停事件处理 - 防抖动版本
function onPause(e) {
  // 增强的参数解析逻辑，适配不同格式的参数
  let index;
  if (typeof e === 'number') {
    index = e;
  } else if (e && typeof e === 'object') {
    index = e.index !== undefined ? e.index : e.detail?.index;
  }

  // 获取当前时间戳
  const now = Date.now();
  // 防抖动检查
  if (now - lastMediaOperationTime < DEBOUNCE_THRESHOLD) {
    console.log('暂停操作被防抖动拦截，时间间隔过短');
    return;
  }

  lastMediaOperationTime = now;
  console.log('视频暂停:', index, '参数:', e);
  playingState.value = false;
}

// 组件挂载时的处理
onMounted(() => {
  // 确保视频上下文实例初始化
  console.log('watch页面组件已挂载');
});

// 组件卸载时的清理
onUnmounted(() => {
  // 清理视频上下文实例，保持唯一性
  if (videoContext) {
    // 暂停视频播放
    if (playingState.value) {
      try {
        videoContext.pause();
      } catch (error) {
        console.error('清理视频资源时出错:', error);
      }
    }
    videoContext = null;
  }
  console.log('watch页面组件已卸载，资源已清理');
});
</script>

<style>
/* 基础样式重置 */
view,
text,
image,
scroll-view {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* 主容器样式 */
.content {
  width: 100%;
  height: 100vh;
  background-color: #000;
  position: relative;
  overflow: hidden;
}

/* 视频加载指示器样式 */
.loading-indicator {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  z-index: 9999;
}

.loading-text {
  display: block;
  margin-top: 20rpx;
  color: #fff;
  font-size: 28rpx;
}

/* u-short-video组件样式优化 */
:deep(.u-short-video) {
  width: 100%;
  height: 100%;
}

/* 视频播放区域样式 */
:deep(.u-short-video video) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 底部导航栏样式优化 */
:deep(.u-tabbar) {
  --u-tabbar-border-color: rgba(255, 255, 255, 0.25) !important;
  background-color: rgba(0, 0, 0, 0.7) !important;
}

/* 底部导航栏文字颜色 */
:deep(.u-tabbar__item__text) {
  color: rgba(255, 255, 255, 0.8) !important;
}

/* 底部导航栏激活状态文字颜色 */
:deep(.u-tabbar__item--active .u-tabbar__item__text) {
  color: #fff !important;
}

/* 右侧操作按钮样式优化 */
:deep(.u-short-video__action-item) {
  color: #fff !important;
}

/* 为scroll-view添加enable-flex属性 */
:deep(.u-short-video scroll-view) {
  enable-flex: true;
}

/* 确保视频控件层级正确 */
:deep(.u-short-video__controls) {
  z-index: 10;
}
</style>
