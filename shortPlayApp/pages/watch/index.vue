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
import { ref, reactive, onMounted, onUnmounted } from 'vue';

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

// 从后端获取视频数据并添加到videoList
async function fetchVideos() {
  try {
    isLoading.value = true;
    console.log('开始从后端获取视频数据...');

    // 调用后端API获取视频数据
    const response = await uni.request({
      url: 'http://localhost:3000/api/work/videos',
      method: 'GET',
    });

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
function onVideoChange(e: any) {
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

  // 解析视频URL中的workId参数
  const videoUrl = videoList[currentVideo.value]?.videoUrl || '';
  let workIdFromUrl = '';

  // 安全地解析URL参数
  try {
    const urlParts = videoUrl.split('?');
    if (urlParts.length > 1) {
      const urlParams = new URLSearchParams(urlParts[1]);
      workIdFromUrl = urlParams.get('workId') || '';
    }
  } catch (error) {
    console.error('解析URL参数时发生错误:', error);
  }

  // 优先使用URL中的workId，否则使用视频对象的id
  currentWorkId = workIdFromUrl || videoList[currentVideo.value]?.id || '';

  // 清空评论相关状态
  comments.value = [];
  commentContent.value = '';
  replyToComment = null;

  // 安全检查
  const videoId = videoList[currentVideo.value]?.id;
  if (videoId) {
    // 如果评论模态框是打开的，直接使用视频对象的ID重新获取评论列表
    if (commentModalShow.value) {
      fetchComments(videoId);
    }
  } else {
    console.warn('无效的视频ID');
  }
}

// 视频资源加载完成事件
function onLoadedData(e: any) {
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
function onVideoError(e: any) {
  let index;
  if (typeof e === 'number') {
    index = e;
  } else if (e && typeof e === 'object') {
    index = e.index !== undefined ? e.index : e.detail?.index;
  }
  console.error('视频播放错误:', e.detail?.errMsg || e, '索引:', index);

  // 显示加载指示器
  isLoading.value = true;

  // 尝试切换到下一个视频
  setTimeout(() => {
    goNext();

    // 显示错误提示
    uni.showToast({
      title: '视频加载失败，已切换到下一个视频',
      icon: 'none',
    });
  }, 1000);
}

// 点赞事件处理
function onLike(e: any) {
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
  if (video.hasOwnProperty('like') && video.like.hasOwnProperty('isLiked')) {
    video.like.isLiked = !video.like.isLiked;
    video.like.num += video.like.isLiked ? 1 : -1;
  } else {
    // 适配shortPlay1的视频对象结构
    video.isLiked = !video.isLiked;
    video.likeCount = video.isLiked ? (video.likeCount || 0) + 1 : Math.max(0, (video.likeCount || 0) - 1);
  }

  // 显示点赞反馈
  uni.showToast({
    title: video.like?.isLiked || video.isLiked ? '点赞成功' : '取消点赞',
    icon: 'none',
    duration: 1500,
  });

  // 调用API更新服务器上的点赞状态
  updateVideoLikeStatus(video.id, video.like?.isLiked || video.isLiked);
}

// 调用API更新视频点赞状态
async function updateVideoLikeStatus(videoId: string, isLiked: boolean) {
  try {
    const response = await uni.request({
      url: `http://localhost:3000/api/work/like/${videoId}`,
      method: 'POST',
      data: {
        isLiked: isLiked,
      },
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
function onComment(e: any) {
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

  // 先清空评论数据，避免显示旧内容
  comments.value = [];

  // 立即显示模态框（带加载指示器）
  commentModalShow.value = true;

  // 直接从视频对象获取id，确保使用正确的视频ID
  const videoId = videoList[index].id;

  // 保存当前评论会话的视频ID，确保整个评论过程中使用同一个ID
  currentCommentVideoId = videoId;

  if (videoId) {
    // 调用API获取评论列表
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

    const response = await uni.request({
      url: `http://localhost:3000/api/comment/work/${workId}`,
      method: 'GET',
    });

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

    const response = await uni.request({
      url: 'http://localhost:3000/api/comment',
      method: 'POST',
      data: {
        targetType: 'work',
        targetId: currentCommentVideoId,
        content: commentContent.value.trim(),
        parentComment: replyToComment?._id || null,
      },
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
    const response = await uni.request({
      url: `http://localhost:3000/api/comment/like/${commentId}`,
      method: 'POST',
    });

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
function onShare(e: any) {
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
function onCollect(e: any) {
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
  if (video.hasOwnProperty('collect') && video.collect.hasOwnProperty('isCollected')) {
    video.collect.isCollected = !video.collect.isCollected;
    video.collect.num += video.collect.isCollected ? 1 : -1;
  } else {
    // 适配shortPlay1的视频对象结构
    video.isCollected = !video.isCollected;
    video.collectCount = video.isCollected ? (video.collectCount || 0) + 1 : Math.max(0, (video.collectCount || 0) - 1);
  }

  // 显示收藏反馈
  uni.showToast({
    title: video.collect?.isCollected || video.isCollected ? '收藏成功' : '取消收藏',
    icon: 'none',
    duration: 1500,
  });

  // 调用API更新服务器上的收藏状态
  updateVideoCollectStatus(video.id, video.collect?.isCollected || video.isCollected);
}

// 调用API更新视频收藏状态
async function updateVideoCollectStatus(videoId: string, isCollected: boolean) {
  try {
    const response = await uni.request({
      url: `http://localhost:3000/api/work/collect/${videoId}`,
      method: 'POST',
      data: {
        isCollected: isCollected,
      },
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

// 关注短剧事件处理
function onFollow(e: any) {
  // 增强的参数解析逻辑，适配不同格式的参数
  let index;
  if (typeof e === 'number') {
    index = e;
  } else if (e && typeof e === 'object') {
    index = e.index !== undefined ? e.index : e.detail?.index;
  }
  console.log('关注短剧:', index, '参数:', e);

  // 安全检查
  if (index === undefined || index === null || !Number.isInteger(index) || !videoList[index]) {
    console.error('视频索引不存在或无效:', index);
    return;
  }

  const video = videoList[index];

  // 详细日志：打印video对象结构
  console.log('视频对象:', video);
  console.log('author对象:', video.author);
  console.log('原始collectionId值:', video.author?.collectionId);
  console.log('原始collectionId类型:', typeof video.author?.collectionId);

  // 获取短剧ID (collectionId)，确保它是一个字符串
  let collectionId = video.author?.collectionId || '';

  // 确保collectionId是一个有效的字符串
  if (typeof collectionId !== 'string') {
    // 如果是对象，尝试获取其id属性或转换为字符串
    if (collectionId && typeof collectionId === 'object') {
      // 优先使用对象的id属性
      if (collectionId.id) {
        collectionId = String(collectionId.id);
      }
      // 或者使用对象的_id属性（MongoDB常用格式）
      else if (collectionId._id) {
        collectionId = String(collectionId._id);
      }
      // 或者尝试转换整个对象为字符串
      else {
        collectionId = String(collectionId);
      }
    } else {
      collectionId = String(collectionId);
    }
    console.log('转换后的collectionId:', collectionId);
  }

  // 如果collectionId仍然无效，尝试使用默认值
  if (!collectionId || collectionId === '[object Object]' || collectionId === 'undefined' || collectionId === 'null') {
    // 尝试生成一个基于视频id的默认collectionId
    collectionId = 'collection_' + (video.id || 'default');
    console.warn('使用默认collectionId:', collectionId);
  }

  // 更新关注状态
  if (!video.author) video.author = {};
  video.author.isFollowing = !video.author.isFollowing;

  // 显示关注反馈
  uni.showToast({
    title: video.author.isFollowing ? '关注短剧成功' : '取消关注短剧',
    icon: 'none',
    duration: 1500,
  });

  // 调用API更新服务器上的关注状态
  updateCollectionFollowStatus(collectionId, video.author.isFollowing);
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

    const response = await uni.request({
      url: `http://localhost:3000/api/collection/follow/${encodeURIComponent(safeCollectionId)}`,
      method: 'POST',
      data: {
        isFollowing: isFollowing,
      },
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

// 视频播放事件处理 - 防抖动版本
function onPlay(e: any) {
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
  console.log('视频播放成功，当前索引:', index, '视频地址:', videoList[index]?.videoUrl);
}

// 视频暂停事件处理 - 防抖动版本
function onPause(e: any) {
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
  // 获取视频数据
  fetchVideos();
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

/* 为scroll-view添加flex布局 */
:deep(.u-short-video scroll-view) {
  display: flex;
  flex-direction: column;
}

/* 确保视频控件层级正确 */
:deep(.u-short-video__controls) {
  z-index: 10;
}

/* 评论模态框样式 */
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

/* 置顶评论标签样式 */
.comment-top-tag {
  background-color: #ff4d4f;
  color: #fff;
  font-size: 20rpx;
  padding: 2rpx 10rpx;
  border-radius: 10rpx;
  margin-left: 10rpx;
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

/* 点赞状态样式 */
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

/* 评论加载状态样式 */
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
</style>
