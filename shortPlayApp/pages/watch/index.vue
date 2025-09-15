<template>
  <view class="content">
    <!-- 视频播放区域 -->
    <view class="video-container">
      <video
        :src="currentVideoData.videoUrl"
        :autoplay="true"
        :muted="false"
        :controls="false"
        :show-center-play-btn="true"
        :enable-progress-gesture="true"
        :show-play-btn="false"
        :show-fullscreen-btn="false"
        :show-casting-button="false"
        :show-screen-lock-button="false"
        :show-mute-btn="false"
        :show-loading="true"
        :object-fit="'cover'"
        :poster="currentVideoData.poster"
        @play="onVideoPlay"
        @pause="onVideoPause"
        @loadeddata="onVideoLoaded"
        @error="onVideoError"
        @timeupdate="onTimeUpdate"
        @ended="onVideoEnded"
        class="video-player"
        id="mainVideo"
      ></video>

      <!-- 视频加载指示器 -->
      <view v-if="isLoading" class="loading-indicator">
        <u-loading size="50" color="#fff"></u-loading>
        <text class="loading-text">视频加载中...</text>
      </view>

      <!-- 视频信息覆盖层 -->
      <view class="video-overlay">
        <!-- 左侧作者信息 -->
        <view class="author-info">
          <image :src="currentVideoData.author.avatar" class="author-avatar"></image>
          <view class="author-details">
            <text class="author-name">{{ currentVideoData.author.name }}</text>
            <text class="video-desc">{{ currentVideoData.author.desc }}</text>
          </view>
          <button class="follow-btn" :class="{ following: currentVideoData.author.isFollowing }" @click="onFollow">
            {{ currentVideoData.author.isFollowing ? '已关注' : '关注' }}
          </button>
        </view>

        <!-- 右侧操作按钮 -->
        <view class="action-buttons">
          <!-- 点赞按钮 -->
          <view class="action-btn" @click="onLike">
            <view class="action-icon">
              <up-icon :name="currentVideoData.isLiked ? 'thumb-up-fill' : 'thumb-up'" color="#fff" size="40"></up-icon>
            </view>
            <text class="action-text">{{ currentVideoData.likeCount }}</text>
          </view>

          <!-- 评论按钮 -->
          <view class="action-btn" @click="onComment">
            <view class="action-icon">
              <up-icon name="chat" color="#fff" size="40"></up-icon>
            </view>
            <text class="action-text">{{ currentVideoData.commentCount }}</text>
          </view>

          <!-- 分享按钮 -->
          <view class="action-btn" @click="onShare">
            <view class="action-icon">
              <up-icon name="share" color="#fff" size="40"></up-icon>
            </view>
            <text class="action-text">{{ currentVideoData.shareCount }}</text>
          </view>

          <!-- 收藏按钮 -->
          <view class="action-btn" @click="onCollect">
            <view class="action-icon">
              <up-icon :name="currentVideoData.isCollected ? 'heart-fill' : 'heart'" color="#fff" size="40"></up-icon>
            </view>
            <text class="action-text">{{ currentVideoData.collectCount }}</text>
          </view>
        </view>

        <!-- 视频进度条 -->
        <view class="progress-container">
          <view class="progress-bar">
            <view class="progress-fill" :style="{ width: progressPercent + '%' }"></view>
          </view>
        </view>
      </view>
    </view>

    <!-- 评论模态框 -->
    <view v-if="commentModalShow" class="comment-modal-overlay" @click="closeCommentModal">
      <view class="comment-modal-container" @click.stop>
        <view class="comment-modal-header">
          <text class="comment-modal-title">评论 ({{ comments.length }})</text>
          <view class="comment-modal-close" @click="closeCommentModal">✕</view>
        </view>

        <view class="comment-modal-content">
          <scroll-view class="comment-list" scroll-y>
            <!-- 加载中状态 -->
            <view v-if="isLoading && comments.length === 0" class="comment-loading">
              <u-loading size="40" color="#2979ff"></u-loading>
              <text class="comment-loading-text">加载评论中...</text>
            </view>

            <!-- 空状态 -->
            <view v-else-if="comments.length === 0" class="no-comments">
              <text>暂无评论，快来抢沙发吧～</text>
            </view>

            <view v-for="(comment, index) in comments" :key="comment._id || `comment_${index}`" class="comment-item">
              <image :src="comment.userInfo?.avatar || '/static/img/1.gif'" class="comment-avatar"></image>
              <view class="comment-body">
                <view class="comment-user-info">
                  <text class="comment-user-name">{{ comment.userInfo?.nickname || '用户' }}</text>
                  <!-- 为点赞数最高的前5条评论添加置顶标签 -->
                  <text v-if="index < 5" class="comment-top-tag">置顶</text>
                  <text class="comment-time">{{ formatTime(comment.createdAt) }}</text>
                </view>
                <text class="comment-content">{{ comment.content }}</text>
                <view class="comment-actions">
                  <view class="comment-action" @click="likeComment(comment._id)">
                    <view :class="['comment-action-icon', { liked: comment.isLiked }]">
                      <up-icon v-if="!comment.isLiked" name="thumb-up" color="#2979ff" size="28"></up-icon>
                      <up-icon v-else name="thumb-up-fill" color="#2979ff" size="28"></up-icon>
                    </view>
                    <text v-if="comment.likeCount > 0" :class="['comment-action-count', { liked: comment.isLiked }]">
                      {{ comment.likeCount }}
                    </text>
                    <text v-else :class="['comment-action-count', { liked: comment.isLiked }]">0</text>
                  </view>
                  <view class="comment-action" @click="replyComment(comment)">
                    <text class="comment-action-icon">回复</text>
                  </view>
                </view>

                <!-- 回复列表 -->
                <view v-if="comment.replies && comment.replies.length > 0" class="reply-list">
                  <view
                    v-for="(reply, replyIndex) in comment.replies"
                    :key="reply._id || `reply_${replyIndex}`"
                    class="reply-item"
                  >
                    <text class="reply-user-name">{{ reply.userInfo?.nickname || '用户' }}</text>
                    <text class="reply-content">{{ reply.content }}</text>
                    <text class="reply-time">{{ formatTime(reply.createdAt) }}</text>
                  </view>
                </view>
              </view>
            </view>
          </scroll-view>
        </view>

        <view class="comment-input-area">
          <input class="comment-input" placeholder="说点什么..." v-model="commentContent" />
          <button class="comment-submit-btn" @click="submitComment">发送</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue';
import { onHide, onShow } from '@dcloudio/uni-app';
import http from '@/utils/request.js';
import tokenManager from '@/utils/tokenManager';

// 当前播放视频索引
const currentVideo = ref(0);
// 播放状态
const playingState = ref(false);
// 加载状态
const isLoading = ref(false);
// 视频上下文实例
let videoContext: any = null;
// 上一次播放/暂停操作的时间戳，用于防抖动
let lastMediaOperationTime = 0;
// 防抖动时间阈值（毫秒）
const DEBOUNCE_THRESHOLD = 300;
// 新增一个状态，用于标记视频是否因页面切换而暂停
let pausedBySystem = false;
// 视频总时长
const videoDuration = ref(0);
// 当前播放时间
const currentTime = ref(0);
// 视频列表数据
const videoList = reactive([]);

// 评论相关状态
const commentModalShow = ref(false);
const comments = ref([]);
const commentContent = ref('');
let currentWorkId = '';
let replyToComment: any = null;
// 当前评论会话的视频ID，确保整个评论过程中使用同一个视频ID
let currentCommentVideoId = '';

// 计算当前视频数据
const currentVideoData = computed(() => {
  return (
    videoList[currentVideo.value] || {
      id: '',
      videoUrl: '',
      poster: '',
      author: {
        id: '',
        avatar: '/static/img/1.gif',
        name: '未知作者',
        collectionId: '',
        desc: '暂无描述',
        isFollowing: false,
      },
      isLiked: false,
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
      collectCount: 0,
      isCollected: false,
      loaded: false,
    }
  );
});

// 计算播放进度百分比
const progressPercent = computed(() => {
  if (videoDuration.value === 0) return 0;
  return (currentTime.value / videoDuration.value) * 100;
});

// 视频播放事件
function onVideoPlay() {
  console.log('视频开始播放');
  playingState.value = true;
}

// 视频暂停事件
function onVideoPause() {
  console.log('视频暂停');
  playingState.value = false;
}

// 视频加载完成事件
function onVideoLoaded() {
  console.log('视频加载完成');
  isLoading.value = false;
  if (videoList[currentVideo.value]) {
    videoList[currentVideo.value].loaded = true;
  }
}

// 视频播放错误事件
function onVideoError(e: any) {
  console.error('视频播放错误:', e);
  isLoading.value = true;
  setTimeout(() => {
    goNext();
    uni.showToast({
      title: '视频加载失败，已切换到下一个视频',
      icon: 'none',
    });
  }, 1000);
}

// 视频时间更新事件
function onTimeUpdate(e: any) {
  currentTime.value = e.detail.currentTime;
  videoDuration.value = e.detail.duration;
}

// 视频播放结束事件
function onVideoEnded() {
  console.log('视频播放结束');
  goNext();
}

// 下一个视频
function goNext() {
  if (currentVideo.value < videoList.length - 1) {
    currentVideo.value++;
  } else {
    currentVideo.value = 0;
  }
}

// 上一个视频
function goPrev() {
  if (currentVideo.value > 0) {
    currentVideo.value--;
  } else {
    currentVideo.value = videoList.length - 1;
  }
}

// 从后端获取视频数据并添加到videoList
async function fetchVideos() {
  try {
    isLoading.value = true;
    console.log('开始从后端获取视频数据...');

    // 调用后端API获取视频数据
    const response = await http.get('/work/videos');

    // 处理响应数据
    // 200表示成功，201表示资源已创建，都视为评论成功
    if (response.statusCode === 200 || response.statusCode === 201) {
      const worksList = response.data;
      console.log('====================================');
      console.log(worksList);
      console.log('====================================');
      console.log('获取视频数据成功，共', worksList.length, '条数据');

      // 遍历worksList，转换数据格式并添加到videoList中
      worksList.forEach((work: any, index: any) => {
        // 创建符合前端需求的视频对象
        const videoItem = {
          // 视频唯一ID
          id: work._id || `video_${index}`,
          // 视频播放地址
          videoUrl: work.videoUrl || 'http://qn-o.jiangruyi.com/rjtsdl.MP4',
          // 视频封面
          poster: work.poster || '',
          // 视频进度
          progress: 0,
          bgColor: '#0e0f0f',

          // 作者信息
          author: {
            // 作者ID
            id: work.authorId || 'author' + Math.floor(Math.random() * 1000),
            // 作者头像
            avatar: '/static/img/1.gif',
            // 作者名称 - 使用合集中的title
            name: work.collectionTitle || '视频作者' + Math.floor(Math.random() * 1000),
            // 短剧id - 确保总是有一个有效的值
            collectionId: work.collectionId || 'collection_' + (work._id || `default_${index}`),
            // 视频描述
            desc: work.title + work.episodeNumber || '视频描述',
            // 关注状态
            isFollowing: false,
          },
          // 点赞信息
          isLiked: false,
          likeCount: work.likeCount || Math.floor(Math.random() * 1000),
          // 评论信息
          commentCount: work.commentCount || Math.floor(Math.random() * 100),
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
          shareCount: Math.floor(Math.random() * 1000),
          // 收藏信息
          collectCount: Math.floor(Math.random() * 100),
          // 是否已收藏
          isCollected: false,
          // 视频加载状态
          loaded: false,
        };

        // 以拼接的形式添加到videoList中，而不是替换
        videoList.push(videoItem);
      });

      // 如果没有从后端获取到数据，添加一些默认测试数据
      if (videoList.length === 0) {
        console.log('没有从后端获取到视频数据，添加默认测试数据');
        videoList.push({
          id: 'default_1',
          videoUrl: 'http://qn-o.jiangruyi.com/rjtsdl.MP4',
          poster: '',
          progress: 0,
          bgColor: '#0e0f0f',
          author: {
            id: 'author1',
            avatar: '/static/img/1.gif',
            name: '小夹一下',
            // 短剧id
            collectionId: 'collection_default_1',
            desc: '呦呦呦',
            // 关注状态
            isFollowing: false,
          },
          isLiked: false,
          likeCount: 128,
          commentCount: 25,
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
          shareCount: 12,
          collectCount: 8,
          isCollected: false,
          loaded: false,
        });
        videoList.push({
          id: 'default_2',
          videoUrl: 'http://v-cdn.zjol.com.cn/280443.mp4',
          poster: '',
          progress: 0,
          bgColor: '#0e0f0f',
          author: {
            id: 'author2',
            avatar: '/static/img/1.gif',
            name: '沪上老头',
            // 短剧id
            collectionId: 'collection_default_2',
            desc: '上海上海',
            // 关注状态
            isFollowing: false,
          },
          isLiked: false,
          likeCount: 555,
          commentCount: 55,
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
          shareCount: 22222,
          collectCount: 77777,
          isCollected: false,
          loaded: false,
        });
      }
    } else {
      console.error('获取视频数据失败，状态码:', response.statusCode);
      // 添加默认测试数据
      addDefaultVideos();
    }
  } catch (error) {
    console.error('获取视频数据时发生错误:', error);
    // 添加默认测试数据
    addDefaultVideos();
  } finally {
    isLoading.value = false;
    console.log('视频数据加载完成，当前视频数量:', videoList.length);
  }
}

// 添加默认测试视频数据
function addDefaultVideos() {
  if (videoList.length === 0) {
    console.log('添加默认测试视频数据');
    videoList.push({
      id: 'default_1',
      videoUrl: 'http://qn-o.jiangruyi.com/rjtsdl.MP4',
      poster: '',
      progress: 0,
      bgColor: '#0e0f0f',
      author: {
        id: 'author1',
        avatar: '/static/img/1.gif',
        name: '小夹一下',
        // 短剧id
        collectionId: 'collection_default_1',
        desc: '呦呦呦',
        // 关注状态
        isFollowing: false,
      },
      isLiked: false,
      likeCount: 128,
      commentCount: 25,
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
      shareCount: 12,
      collectCount: 8,
      isCollected: false,
      loaded: false,
    });
    videoList.push({
      id: 'default_2',
      videoUrl: 'http://v-cdn.zjol.com.cn/280443.mp4',
      poster: '',
      progress: 0,
      bgColor: '#0e0f0f',
      author: {
        id: 'author2',
        avatar: '/static/img/1.gif',
        name: '沪上老头',
        // 短剧id
        collectionId: 'collection_default_2',
        desc: '上海上海',
        // 关注状态
        isFollowing: false,
      },
      isLiked: false,
      likeCount: 555,
      commentCount: 55,
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
      shareCount: 22222,
      collectCount: 77777,
      isCollected: false,
      loaded: false,
    });
  }
}

// 点赞事件处理
function onLike() {
  const video = videoList[currentVideo.value];
  if (!video) return;

  video.isLiked = !video.isLiked;
  video.likeCount = video.isLiked ? (video.likeCount || 0) + 1 : Math.max(0, (video.likeCount || 0) - 1);

  uni.showToast({
    title: video.isLiked ? '点赞成功' : '取消点赞',
    icon: 'none',
    duration: 1500,
  });

  updateVideoLikeStatus(video.id, video.isLiked);
}

// 调用API更新视频点赞状态
async function updateVideoLikeStatus(videoId: string, isLiked: boolean) {
  try {
    const response = await http.post(`/work/like/${videoId}`, {
      isLiked: isLiked,
    });

    // 200表示成功，201表示资源已创建，都视为评论成功
    if (response.statusCode === 200 || response.statusCode === 201) {
      console.log('视频点赞状态更新成功');
    } else {
      console.error('视频点赞状态更新失败:', response.statusCode);
    }
  } catch (error) {
    console.error('更新视频点赞状态时发生错误:', error);
  }
}

// 评论事件处理
function onComment() {
  comments.value = [];
  commentModalShow.value = true;
  const videoId = videoList[currentVideo.value].id;
  currentCommentVideoId = videoId;

  if (videoId) {
    fetchComments(videoId);
  } else {
    console.error('无法获取有效的作品ID');
    isLoading.value = false;
    uni.showToast({
      title: '无法获取视频信息',
      icon: 'none',
    });
  }
}

// 获取评论列表
async function fetchComments(workId: string) {
  try {
    // 显示加载状态
    isLoading.value = true;

    // 检查workId是否有效
    if (!workId) {
      console.error('无效的作品ID');
      comments.value = [];
      isLoading.value = false;
      return;
    }

    const response = await http.get(`/comment/work/${workId}`);

    if (response.statusCode === 200) {
      comments.value = response.data || [];
      console.log('获取评论列表成功，共', comments.value.length, '条评论');
    } else {
      console.error('获取评论列表失败:', response.statusCode);
      // 如果没有获取到评论，使用模拟数据
      comments.value = [
        {
          _id: 'comment_1',
          userInfo: {
            nickname: '用户1',
            avatar: '/static/img/video.png',
          },
          content: '这个视频真不错！',
          createdAt: new Date().toISOString(),
          likeCount: 10,
          isLiked: false,
          replies: [
            {
              _id: 'reply_1',
              userInfo: {
                nickname: '用户2',
                avatar: '/static/img/1.gif',
              },
              content: '同意！',
              createdAt: new Date().toISOString(),
            },
          ],
        },
        {
          _id: 'comment_2',
          userInfo: {
            nickname: '用户3',
            avatar: '/static/img/1.gif',
          },
          content: '期待下一个视频！',
          createdAt: new Date().toISOString(),
          likeCount: 5,
          isLiked: false,
        },
      ];
    }
  } catch (error) {
    console.error('获取评论列表时发生错误:', error);
    // 使用模拟数据
    comments.value = [
      {
        _id: 'comment_1',
        userInfo: {
          nickname: '用户1',
          avatar: '/static/img/video.png',
        },
        content: '这个视频真不错！',
        createdAt: new Date().toISOString(),
        likeCount: 10,
        isLiked: false,
      },
      {
        _id: 'comment_2',
        userInfo: {
          nickname: '用户2',
          avatar: '/static/img/1.gif',
        },
        content: '期待下一个视频！',
        createdAt: new Date().toISOString(),
        likeCount: 5,
        isLiked: false,
      },
    ];
  } finally {
    isLoading.value = false;
  }
}

// 提交评论
async function submitComment() {
  if (!commentContent.value.trim()) {
    uni.showToast({
      title: '评论内容不能为空',
      icon: 'none',
    });
    return;
  }

  // 使用保存的评论会话视频ID，确保评论发布到正确的视频
  if (!currentCommentVideoId) {
    // 如果没有保存的ID，使用当前视频的ID作为备用
    if (!videoList[currentVideo.value]) {
      uni.showToast({
        title: '无法获取视频信息',
        icon: 'none',
      });
      return;
    }
    currentCommentVideoId = videoList[currentVideo.value].id;
  }

  if (!currentCommentVideoId) {
    uni.showToast({
      title: '无法获取视频ID',
      icon: 'none',
    });
    return;
  }

  try {
    isLoading.value = true;

    const response = await http.post(`/comment/work/${currentCommentVideoId}`, {
      userId: tokenManager.getUserId(),
      text: commentContent.value.trim(),
      parentComment: replyToComment?._id || null,
    });

    // 200表示成功，201表示资源已创建，都视为评论成功
    if (response.statusCode === 200 || response.statusCode === 201) {
      // 清空评论内容
      commentContent.value = '';
      replyToComment = null;

      // 重新获取评论列表 - 使用保存的评论会话视频ID
      fetchComments(currentCommentVideoId);

      // 更新视频评论数
      if (videoList[currentVideo.value]) {
        const video = videoList[currentVideo.value];
        if (video.hasOwnProperty('comment') && video.comment.hasOwnProperty('num')) {
          video.comment.num++;
        } else {
          // 适配shortPlay1的视频对象结构
          video.commentCount = (video.commentCount || 0) + 1;
        }
      }

      uni.showToast({
        title: '评论成功',
        icon: 'success',
      });
    } else {
      console.error('提交评论失败:', response.statusCode);
      uni.showToast({
        title: '评论失败，请稍后重试',
        icon: 'none',
      });
    }
  } catch (error) {
    console.error('提交评论时发生错误:', error);
    uni.showToast({
      title: '评论失败，请稍后重试',
      icon: 'none',
    });
  } finally {
    isLoading.value = false;
  }
}

// 点赞评论
async function likeComment(commentId: string) {
  try {
    // 找到对应的评论
    const comment = comments.value.find((c: any) => c._id === commentId);
    if (!comment) return;

    // 临时更新本地状态
    comment.isLiked = !comment.isLiked;
    comment.likeCount = comment.isLiked ? comment.likeCount + 1 : Math.max(0, comment.likeCount - 1);

    // 调用API更新评论点赞状态
    const response = await http.post(`/comment/like/${commentId}`);

    if (response.statusCode !== 200) {
      console.error('评论点赞失败:', response.statusCode);
      // 回滚状态
      comment.isLiked = !comment.isLiked;
      comment.likeCount = comment.isLiked ? comment.likeCount + 1 : Math.max(0, comment.likeCount - 1);
    }
  } catch (error) {
    console.error('评论点赞时发生错误:', error);
    // 回滚状态
    const comment = comments.value.find((c: any) => c._id === commentId);
    if (comment) {
      comment.isLiked = !comment.isLiked;
      comment.likeCount = comment.isLiked ? comment.likeCount + 1 : Math.max(0, comment.likeCount - 1);
    }
  }
}

// 回复评论
function replyComment(comment: any) {
  replyToComment = comment;
  commentContent.value = `回复 @${comment.userInfo?.nickname || '用户'}: `;

  // 聚焦到输入框
  setTimeout(() => {
    const input = document.querySelector('.comment-input') as HTMLInputElement;
    if (input) {
      input.focus();
    }
  }, 100);
}

// 关闭评论模态框
function closeCommentModal() {
  commentModalShow.value = false;
  commentContent.value = '';
  replyToComment = null;
}

// 格式化时间
function formatTime(timeStr: string) {
  if (!timeStr) return '';

  try {
    const date = new Date(timeStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    // 小于1分钟
    if (diff < 60000) {
      return '刚刚';
    }
    // 小于1小时
    else if (diff < 3600000) {
      return Math.floor(diff / 60000) + '分钟前';
    }
    // 小于24小时
    else if (diff < 86400000) {
      return Math.floor(diff / 3600000) + '小时前';
    }
    // 小于7天
    else if (diff < 604800000) {
      return Math.floor(diff / 86400000) + '天前';
    }
    // 其他情况显示具体日期
    else {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (error) {
    console.error('格式化时间失败:', error);
    return '';
  }
}

// 分享事件处理
function onShare() {
  uni.showShareMenu({
    withShareTicket: true,
    menus: ['shareAppMessage', 'shareTimeline'],
  });
}

// 收藏事件处理
function onCollect() {
  const video = videoList[currentVideo.value];
  if (!video) return;

  video.isCollected = !video.isCollected;
  video.collectCount = video.isCollected ? (video.collectCount || 0) + 1 : Math.max(0, (video.collectCount || 0) - 1);

  uni.showToast({
    title: video.isCollected ? '收藏成功' : '取消收藏',
    icon: 'none',
    duration: 1500,
  });

  updateVideoCollectStatus(video.id, video.isCollected);
}

// 调用API更新视频收藏状态
async function updateVideoCollectStatus(videoId: string, isCollected: boolean) {
  try {
    const response = await http.post(`/collect`, {
      workId: videoId,
    });

    if (response.statusCode === 200) {
      console.log('视频收藏状态更新成功');
    } else {
      console.error('视频收藏状态更新失败:', response.statusCode);
    }
  } catch (error) {
    console.error('更新视频收藏状态时发生错误:', error);
  }
}

// 关注事件处理
function onFollow() {
  const video = videoList[currentVideo.value];
  if (!video) return;

  video.author.isFollowing = !video.author.isFollowing;

  uni.showToast({
    title: video.author.isFollowing ? '关注成功' : '取消关注',
    icon: 'none',
    duration: 1500,
  });

  updateCollectionFollowStatus(video.author.collectionId, video.author.isFollowing);
}

// 调用API更新短剧关注状态
async function updateCollectionFollowStatus(collectionId: string, isFollowing: boolean) {
  try {
    // 再次检查collectionId的类型和值
    console.log('准备调用API，collectionId类型:', typeof collectionId, '值:', collectionId);

    // 确保collectionId是有效的字符串
    let safeCollectionId = collectionId;
    if (typeof safeCollectionId !== 'string') {
      safeCollectionId = String(safeCollectionId);
      console.warn('collectionId类型不正确，已转换为字符串:', safeCollectionId);
    }

    // 防止空值或无效值 - 允许使用默认collectionId
    if (
      !safeCollectionId ||
      safeCollectionId === '[object Object]' ||
      safeCollectionId === 'undefined' ||
      safeCollectionId === 'null'
    ) {
      console.error('无效的collectionId，无法调用API');
      return;
    }

    console.log('最终使用的collectionId:', safeCollectionId);

    const response = await http.post(`/collection/follow/${encodeURIComponent(safeCollectionId)}`, {
      isFollowing: isFollowing,
    });

    // 200表示成功，201表示资源已创建，都视为关注成功
    if (response.statusCode === 200 || response.statusCode === 201) {
      console.log('短剧关注状态更新成功');
    } else {
      console.error('短剧关注状态更新失败:', response.statusCode);
      // API调用失败但不回滚本地状态，优先保证用户体验
      // 可以考虑添加本地存储来保存用户的关注状态

      // 显示网络错误提示，但不改变UI状态
      if (response.statusCode !== 404) {
        uni.showToast({
          title: '网络连接异常，关注状态已保存',
          icon: 'none',
          duration: 2000,
        });
      }
    }
  } catch (error) {
    console.error('更新短剧关注状态时发生错误:', error);
    // 发生错误但不回滚本地状态，优先保证用户体验
    // 可以考虑添加本地存储来保存用户的关注状态

    // 显示网络错误提示，但不改变UI状态
    uni.showToast({
      title: '网络连接异常，关注状态已保存',
      icon: 'none',
      duration: 2000,
    });
  }
}

// 组件挂载时的处理
onMounted(() => {
  console.log('watch页面组件已挂载');
  fetchVideos();

  // 获取视频上下文
  videoContext = uni.createVideoContext('mainVideo');
});

// 页面隐藏时的处理
onHide(() => {
  if (videoContext && playingState.value) {
    try {
      videoContext.pause();
      console.log('页面已隐藏，视频已暂停');
    } catch (error) {
      console.error('页面隐藏时暂停视频出错:', error);
    }
  }
});

// 页面显示时的处理
onShow(() => {
  if (videoContext && !playingState.value) {
    try {
      videoContext.play();
      console.log('页面已显示，视频已恢复播放');
    } catch (error) {
      console.error('页面显示时恢复播放视频出错:', error);
    }
  }
});

// 组件卸载时的清理
onUnmounted(() => {
  if (videoContext) {
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
scroll-view,
input,
button {
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

/* 视频容器 */
.video-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.video-player {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 视频加载指示器 */
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

/* 视频覆盖层 */
.video-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 40rpx 30rpx;
}

/* 作者信息区域 */
.author-info {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}

.author-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  margin-right: 20rpx;
}

.author-details {
  flex: 1;
}

.author-name {
  display: block;
  color: #fff;
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 10rpx;
}

.video-desc {
  display: block;
  color: #fff;
  font-size: 28rpx;
  opacity: 0.9;
}

.follow-btn {
  background-color: rgba(255, 255, 255, 0.2);
  color: #fff;
  border: 2rpx solid #fff;
  border-radius: 40rpx;
  padding: 10rpx 30rpx;
  font-size: 28rpx;
  margin-left: 20rpx;
}

.follow-btn.following {
  background-color: #ff4d4f;
  border-color: #ff4d4f;
}

/* 右侧操作按钮 */
.action-buttons {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40rpx;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
}

.action-icon {
  width: 80rpx;
  height: 80rpx;
  background-color: rgba(0, 0, 0, 0.3);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-text {
  color: #fff;
  font-size: 24rpx;
  text-align: center;
}

/* 进度条 */
.progress-container {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx;
}

.progress-bar {
  width: 100%;
  height: 4rpx;
  background-color: rgba(255, 255, 255, 0.3);
  border-radius: 2rpx;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: #fff;
  border-radius: 2rpx;
  transition: width 0.3s ease;
}

/* 评论模态框样式保持不变 */
.comment-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 9999;
  display: flex;
  align-items: flex-end;
}

.comment-modal-container {
  width: 100%;
  background-color: #fff;
  border-top-left-radius: 20rpx;
  border-top-right-radius: 20rpx;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.comment-modal-header {
  padding: 20rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1rpx solid #eee;
  background-color: #fff;
}

.comment-modal-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.comment-modal-close {
  font-size: 40rpx;
  color: #999;
}

.comment-modal-content {
  flex: 1;
  overflow-y: auto;
}

.comment-list {
  height: 60vh;
  padding: 20rpx;
  overflow-y: auto;
}

.comment-input-area {
  padding: 20rpx;
  display: flex;
  align-items: center;
  border-top: 1rpx solid #eee;
  background-color: #fff;
}

.comment-input {
  flex: 1;
  height: 80rpx;
  padding: 0 20rpx;
  background-color: #f5f5f5;
  border-radius: 40rpx;
  font-size: 28rpx;
  color: #333;
}

.comment-submit-btn {
  width: 120rpx;
  height: 70rpx;
  line-height: 70rpx;
  text-align: center;
  background-color: #07c160;
  color: #fff;
  border-radius: 35rpx;
  font-size: 28rpx;
  margin-left: 20rpx;
  border: none;
}

.no-comments {
  text-align: center;
  padding: 60rpx 0;
  color: #999;
  font-size: 28rpx;
}

.comment-item {
  display: flex;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.comment-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  margin-right: 20rpx;
  background-color: #f0f0f0;
}

.comment-body {
  flex: 1;
}

.comment-user-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10rpx;
}

.comment-user-name {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.comment-time {
  font-size: 24rpx;
  color: #999;
}

.comment-content {
  font-size: 28rpx;
  color: #333;
  line-height: 1.5;
  margin-bottom: 10rpx;
  word-break: break-all;
}

.comment-actions {
  display: flex;
  align-items: center;
}

.comment-action {
  display: flex;
  align-items: center;
  margin-right: 40rpx;
  font-size: 26rpx;
  color: #999;
}

.comment-action-icon {
  margin-right: 6rpx;
}

.comment-action-count {
  font-size: 24rpx;
}

.comment-action-icon.liked,
.comment-action-count.liked {
  color: #ff4d4f;
  font-weight: bold;
}

.reply-list {
  margin-top: 20rpx;
  padding-left: 40rpx;
  background-color: #f9f9f9;
  border-radius: 10rpx;
  padding: 20rpx;
}

.reply-item {
  margin-bottom: 15rpx;
  padding-bottom: 15rpx;
  border-bottom: 1rpx solid #eee;
}

.reply-item:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.reply-user-name {
  font-size: 26rpx;
  font-weight: bold;
  color: #07c160;
}

.reply-content {
  font-size: 26rpx;
  color: #333;
  margin-left: 10rpx;
}

.reply-time {
  display: block;
  font-size: 22rpx;
  color: #999;
  margin-top: 5rpx;
}

.comment-loading {
  text-align: center;
  padding: 60rpx 0;
  color: #999;
  font-size: 28rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.comment-loading-text {
  margin-top: 20rpx;
  font-size: 28rpx;
  color: #999;
}

.comment-top-tag {
  background-color: #ff4d4f;
  color: #fff;
  font-size: 20rpx;
  padding: 2rpx 10rpx;
  border-radius: 10rpx;
  margin-left: 10rpx;
}
</style>
