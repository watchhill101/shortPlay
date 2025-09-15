<template>
  <view class="chat-container">
    <!-- 顶部导航栏（使用 u-navbar 更稳定） -->
    <u-navbar
      :title="'AI客服'"
      :fixed="true"
      :placeholder="true"
      :safeAreaInsetTop="true"
      :autoBack="true"
      bgColor="#667eea"
      titleStyle="color:#fff;font-weight:700"
    >
      <template #right>
        <view class="nav-actions">
          <view class="nav-action" @click="openImageModal">
            <u-icon name="camera" color="#ffffff" :size="20"></u-icon>
          </view>
          <view class="nav-action" @click="openVideoModal">
            <u-icon name="movie" color="#ffffff" :size="20"></u-icon>
          </view>
        </view>
      </template>
    </u-navbar>

    <!-- 聊天内容区域 -->
    <scroll-view
      scroll-y
      class="chat-content"
      :style="chatContentStyle"
      :scroll-top="scrollTop"
      scroll-with-animation
      @scrolltoupper="onScrollToUpper"
      :refresher-enabled="true"
      :refresher-triggered="refresherTriggered"
      @refresherrefresh="onRefresherRefresh"
      @scroll="onScroll"
    >
      <!-- 欢迎消息 -->
      <view class="welcome-message">
        <view class="welcome-avatar">
          <u-avatar text="AI" :fontSize="14" color="#ffffff" bgColor="#667eea" :size="40"></u-avatar>
        </view>
        <view class="welcome-text">
          <view class="message-bubble ai-bubble">
            <text>您好！我是AI智能客服小助手，有什么可以帮助您的吗？😊</text>
          </view>
          <view class="message-time">{{ getCurrentTime() }}</view>
        </view>
      </view>

      <!-- 消息列表 -->
      <view class="message-list">
        <view
          v-for="(message, index) in messageList"
          :key="index"
          class="message-item"
          :class="[message.type, 'message-animation']"
          :style="{ animationDelay: index * 0.1 + 's' }"
        >
          <!-- AI消息 -->
          <view v-if="message.type === 'ai'" class="ai-message">
            <view class="message-avatar">
              <u-avatar text="AI" :fontSize="14" color="#ffffff" bgColor="#667eea" :size="40"></u-avatar>
            </view>
            <view class="message-content">
              <view v-if="message.messageType === 'image'" class="message-bubble ai-bubble image-bubble">
                <view class="image-container">
                  <image
                    :src="message.content"
                    mode="widthFix"
                    class="generated-image"
                    @error="onImageError"
                    @load="onImageLoad"
                  ></image>
                  <view v-if="message.metadata && message.metadata.prompt" class="image-prompt">
                    <text class="prompt-text">{{ message.metadata.prompt }}</text>
                  </view>
                </view>
              </view>
              <view v-else-if="message.messageType === 'video'" class="message-bubble ai-bubble video-bubble">
                <view class="video-container">
                  <video
                    :src="message.content"
                    controls
                    class="generated-video"
                    @error="onVideoError"
                    @loadstart="onVideoLoadStart"
                    poster=""
                    preload="metadata"
                  ></video>
                  <view v-if="message.metadata && message.metadata.prompt" class="video-prompt">
                    <text class="prompt-text">{{ message.metadata.prompt }}</text>
                  </view>
                </view>
              </view>
              <view v-else class="message-bubble ai-bubble">
                <text>{{ message.content }}</text>
              </view>
              <view class="message-time">{{ message.time }}</view>
            </view>
          </view>

          <!-- 用户消息 -->
          <view v-else class="user-message">
            <view class="message-content">
              <view class="message-bubble user-bubble">
                <text>{{ message.content }}</text>
              </view>
              <view class="message-time">{{ message.time }}</view>
            </view>
            <view class="message-avatar">
              <u-avatar
                :text="userInfo && userInfo.nickname ? userInfo.nickname.charAt(0) : '我'"
                :src="userInfo && userInfo.avatar ? userInfo.avatar : ''"
                :fontSize="14"
                color="#ffffff"
                bgColor="#4facfe"
                :size="40"
              ></u-avatar>
            </view>
          </view>
        </view>
      </view>

      <!-- 打字提示 -->
      <view v-if="isTyping" class="typing-indicator">
        <view class="typing-avatar">
          <u-avatar text="AI" :fontSize="14" color="#ffffff" bgColor="#667eea" :size="40"></u-avatar>
        </view>
        <view class="typing-bubble">
          <view class="typing-dots">
            <view class="dot"></view>
            <view class="dot"></view>
            <view class="dot"></view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 表情面板 -->
    <view v-if="showEmojiPanel" class="emoji-panel" :style="emojiPanelStyle">
      <view class="emoji-header">
        <text class="emoji-title">选择表情</text>
        <view class="emoji-close" @click="toggleEmojiPanel">
          <u-icon name="close" color="#999" :size="16"></u-icon>
        </view>
      </view>
      <scroll-view scroll-y class="emoji-content">
        <view class="emoji-grid">
          <view v-for="(emoji, index) in emojiList" :key="index" class="emoji-item" @click="selectEmoji(emoji)">
            <text class="emoji-char">{{ emoji.char }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 图片生成弹窗 -->
    <view v-if="showImageModal" class="image-modal-overlay" @click="closeImageModal">
      <view class="image-modal" @click.stop>
        <view class="modal-header">
          <text class="modal-title">AI图片生成</text>
          <view class="modal-close" @click="closeImageModal">
            <u-icon name="close" color="#999" :size="18"></u-icon>
          </view>
        </view>
        <view class="modal-content">
          <view class="feature-tip">
            <text class="tip-text">🎨 AI将根据您的描述生成独特的图片</text>
          </view>
          <view class="prompt-input-wrapper">
            <text class="input-label">描述您想要生成的图片</text>
            <u-input
              v-model="imagePrompt"
              type="textarea"
              :placeholder="'例如：一只可爱的小猫在花园里玩耍，阳光明媚，动漫风格，高质量，4K分辨率'"
              :border="true"
              :autoHeight="true"
              :maxlength="200"
              showWordLimit
              class="prompt-input"
            ></u-input>
          </view>
          <view class="prompt-examples">
            <text class="examples-title">💡 推荐描述词：</text>
            <view class="example-tags">
              <text class="example-tag" @click="addExampleTag('动漫风格')">动漫风格</text>
              <text class="example-tag" @click="addExampleTag('写实风格')">写实风格</text>
              <text class="example-tag" @click="addExampleTag('水彩画')">水彩画</text>
              <text class="example-tag" @click="addExampleTag('高质量')">高质量</text>
              <text class="example-tag" @click="addExampleTag('4K分辨率')">4K分辨率</text>
            </view>
          </view>
          <view v-if="imageGenerationError" class="error-message">
            <u-icon name="error-circle" color="#ff4757" :size="16"></u-icon>
            <text class="error-text">{{ imageGenerationError }}</text>
          </view>
        </view>
        <view class="modal-footer">
          <view class="modal-btn cancel-btn" @click="closeImageModal">
            <text class="btn-text">取消</text>
          </view>
          <view
            class="modal-btn generate-btn"
            :class="{ active: imagePrompt.trim() && !isGeneratingImage, loading: isGeneratingImage }"
            @click="generateImage"
          >
            <u-loading-icon v-if="isGeneratingImage" :size="16" color="#ffffff"></u-loading-icon>
            <text class="btn-text">{{ isGeneratingImage ? '生成中...' : '生成图片' }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 视频生成弹窗 -->
    <view v-if="showVideoModal" class="video-modal-overlay" @click="closeVideoModal">
      <view class="video-modal" @click.stop>
        <view class="modal-header">
          <text class="modal-title">AI视频生成</text>
          <view class="modal-close" @click="closeVideoModal">
            <u-icon name="close" color="#999" :size="18"></u-icon>
          </view>
        </view>
        <view class="modal-content">
          <view class="feature-tip">
            <text class="tip-text">🎬 AI将根据您的描述生成精彩的视频内容</text>
          </view>
          <view class="prompt-input-wrapper">
            <text class="input-label">描述您想要生成的视频</text>
            <u-input
              v-model="videoPrompt"
              type="textarea"
              :placeholder="'例如：一只可爱的小猫在草地上奔跑，阳光明媚，慢镜头，电影感'"
              :border="true"
              :autoHeight="true"
              :maxlength="200"
              showWordLimit
              class="prompt-input"
            ></u-input>
          </view>
          <view class="prompt-examples">
            <text class="examples-title">🎪 推荐描述词：</text>
            <view class="example-tags">
              <text class="example-tag" @click="addVideoExampleTag('慢镜头')">慢镜头</text>
              <text class="example-tag" @click="addVideoExampleTag('电影感')">电影感</text>
              <text class="example-tag" @click="addVideoExampleTag('阳光明媚')">阳光明媚</text>
              <text class="example-tag" @click="addVideoExampleTag('唯美画面')">唯美画面</text>
              <text class="example-tag" @click="addVideoExampleTag('高清画质')">高清画质</text>
            </view>
          </view>
          <view class="feature-info">
            <text class="info-text">⚡ 视频生成功能需要消耗大量算力资源</text>
          </view>
          <view v-if="videoGenerationError" class="error-message">
            <u-icon name="error-circle" color="#ff4757" :size="16"></u-icon>
            <text class="error-text">{{ videoGenerationError }}</text>
          </view>
        </view>
        <view class="modal-footer">
          <view class="modal-btn cancel-btn" @click="closeVideoModal">
            <text class="btn-text">取消</text>
          </view>
          <view class="modal-btn generate-btn" :class="{ active: videoPrompt.trim() }" @click="generateVideo">
            <text class="btn-text">生成视频</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 快捷回复 -->
    <view v-if="showQuickReplies" class="quick-replies" :style="quickRepliesStyle">
      <scroll-view scroll-x class="quick-scroll">
        <view class="quick-reply-list">
          <view
            v-for="(reply, index) in quickReplies"
            :key="index"
            class="quick-reply-item"
            @click="sendQuickReply(reply)"
          >
            {{ reply }}
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 输入区域 -->
    <view class="input-container" :style="inputContainerStyle">
      <view class="input-wrapper">
        <view class="input-content">
          <u-input
            v-model="inputText"
            :placeholder="isRecording ? `正在录音... ${recordingTime}s` : '请输入您的问题...'"
            :border="false"
            :clearable="false"
            @focus="onInputFocus"
            @blur="onInputBlur"
            @confirm="sendMessage"
            confirmType="send"
            class="message-input"
            :class="{ recording: isRecording }"
          ></u-input>
        </view>
        <view class="input-actions">
          <view class="emoji-btn" :class="{ active: showEmojiPanel }" @click="toggleEmojiPanel">
            <text class="emoji-icon">😀</text>
          </view>
          <view
            class="voice-btn"
            :class="{ recording: isRecording }"
            @touchstart="startRecording"
            @touchend="stopRecording"
            @touchcancel="cancelRecording"
          >
            <u-icon
              :name="isRecording ? 'pause-circle-fill' : 'mic'"
              :color="isRecording ? '#ffffff' : '#667eea'"
              :size="18"
            ></u-icon>
          </view>
          <!-- 已移至顶部导航栏：图片与视频生成功能入口 -->
          <view class="send-btn" :class="{ active: inputText.trim() }" @click="sendMessage">
            <text class="send-text">发送</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, nextTick } from 'vue';
import { onLoad, onShow, onReady, onUnload } from '@dcloudio/uni-app';
import authService from '@/utils/authService.js';

// data properties
const inputText = ref('');
const messageList = ref([]);
const scrollTop = ref(0);
const isTyping = ref(false);
const showQuickReplies = ref(true);
const isSending = ref(false);
const canSend = ref(false);
const isRecording = ref(false);
const recordingTime = ref(0);
const voiceText = ref('');
const showEmojiPanel = ref(false);

// Image generation state
const showImageModal = ref(false);
const imagePrompt = ref('');
const isGeneratingImage = ref(false);
const imageGenerationError = ref('');

// Video generation state
const showVideoModal = ref(false);
const videoPrompt = ref('');
const isGeneratingVideo = ref(false);
const videoGenerationError = ref('');
const videoGenerationProgress = ref(0);

// User info
const userInfo = ref(null);

// Session management
const currentSessionId = ref(null);
const userId = ref(null);
const isLoadingHistory = ref(false);
const hasMoreHistory = ref(true);
const currentPage = ref(1);
const pageSize = ref(20);

// Pull-to-refresh
const refresherTriggered = ref(false);

let typingTimer = null;
let videoProgressInterval = null;
let recordingTimer = null;
let resizeListener = null;
let recognition = null;

// API base URL
const getApiBaseUrl = () => {
  // #ifdef H5
  return '';
  // #endif

  // #ifdef MP-WEIXIN || MP-ALIPAY || MP-BAIDU || MP-TOUTIAO
  return 'http://172.20.10.3:3000';
  // #endif

  // #ifdef APP-PLUS
  return 'http://172.20.10.3:3000';
  // #endif

  return '';
};
const apiBaseUrl = getApiBaseUrl();

const quickReplies = ['账户问题', '支付相关', '视频播放', '会员服务', '技术支持', '其他问题'];

const aiReplies = {
  账户问题: '关于账户问题，我可以帮您解决登录、注册、密码重置等相关问题。请详细描述您遇到的具体情况。',
  支付相关: '支付问题我来帮您！我们支持微信支付、支付宝等多种支付方式。如遇到支付失败，请检查网络连接或联系客服。',
  视频播放: '视频播放遇到问题了吗？请尝试：1.检查网络连接 2.清除缓存 3.重启应用。如仍有问题请告诉我详细情况。',
  会员服务: '关于会员服务，我们提供月度、季度、年度会员套餐。会员可享受无广告观看、高清画质、专属内容等特权。',
  技术支持: '技术问题我来协助！请描述您遇到的具体技术问题，比如应用崩溃、功能异常等，我会尽力帮您解决。',
  其他问题: '请详细描述您遇到的问题，我会认真为您解答。您也可以通过意见反馈功能向我们提交建议。',
};

const emojiList = [
  {
    char: '😊',
    name: '微笑',
  },
  {
    char: '😄',
    name: '开心',
  },
  {
    char: '🥰',
    name: '爱心',
  },
  {
    char: '😘',
    name: '飞吻',
  },
  {
    char: '🤔',
    name: '思考',
  },
  {
    char: '😅',
    name: '汗',
  },
  {
    char: '😂',
    name: '笑哭',
  },
  {
    char: '🥺',
    name: '可怜',
  },
  {
    char: '😭',
    name: '哭泣',
  },
  {
    char: '😤',
    name: '生气',
  },
  {
    char: '🤗',
    name: '拥抱',
  },
  {
    char: '👍',
    name: '赞',
  },
  {
    char: '👎',
    name: '踩',
  },
  {
    char: '👌',
    name: 'OK',
  },
  {
    char: '✌️',
    name: '胜利',
  },
  {
    char: '🤝',
    name: '握手',
  },
  {
    char: '👏',
    name: '鼓掌',
  },
  {
    char: '🙏',
    name: '祈祷',
  },
  {
    char: '❤️',
    name: '红心',
  },
  {
    char: '💔',
    name: '心碎',
  },
  {
    char: '💯',
    name: '100分',
  },
  {
    char: '🔥',
    name: '火',
  },
  {
    char: '⭐',
    name: '星星',
  },
  {
    char: '🎉',
    name: '庆祝',
  },
];

// Dynamic styles
const inputContainerStyle = ref({});
const emojiPanelStyle = ref({});
const quickRepliesStyle = ref({});
const chatContentStyle = ref({
  paddingBottom: '100px',
});

// Methods
// 初始化用户信息
const initUserInfo = async () => {
  try {
    // 从authService获取当前用户信息
    userInfo.value = authService.getCurrentUser();

    if (userInfo.value && userInfo.value.id) {
      userId.value = userInfo.value.id;
      console.log('获取用户信息成功:', userInfo.value);
    } else {
      // 如果没有登录用户，使用默认用户或跳转登录
      console.warn('未找到登录用户信息');
      // 可以选择跳转到登录页面或使用临时用户
      userId.value = 'anonymous_' + Date.now();
    }
  } catch (error) {
    console.error('初始化用户信息失败:', error);
    // 降级处理：使用临时用户ID
    userId.value = 'anonymous_' + Date.now();
  }
};

// 刷新用户信息
const refreshUserInfo = () => {
  try {
    const latestUserInfo = authService.getCurrentUser();
    if (latestUserInfo && latestUserInfo.id) {
      // 检查用户信息是否有变化
      const hasChanged =
        !userInfo.value ||
        userInfo.value.id !== latestUserInfo.id ||
        userInfo.value.nickname !== latestUserInfo.nickname ||
        userInfo.value.avatar !== latestUserInfo.avatar;

      if (hasChanged) {
        userInfo.value = latestUserInfo;
        userId.value = latestUserInfo.id;
        console.log('用户信息已更新:', userInfo.value);
      }
    }
  } catch (error) {
    console.error('刷新用户信息失败:', error);
  }
};

// 处理用户信息更新事件
const handleUserInfoUpdate = updatedUserInfo => {
  console.log('收到用户信息更新事件:', updatedUserInfo);
  if (updatedUserInfo && updatedUserInfo.id) {
    userInfo.value = updatedUserInfo;
    userId.value = updatedUserInfo.id;
    console.log('聊天页面用户信息已同步更新:', userInfo.value);
  }
};

// 初始化聊天会话
const initChatSession = async () => {
  try {
    // 尝试从本地存储获取现有会话ID
    const savedSessionId = uni.getStorageSync('currentChatSession');

    if (savedSessionId) {
      // 验证会话是否还有效
      const isValid = await validateSession(savedSessionId);
      if (isValid) {
        currentSessionId.value = savedSessionId;
        console.log('恢复现有会话:', savedSessionId);
        return;
      }
    }

    // 创建新会话
    await createNewSession();
  } catch (error) {
    console.error('初始化会话失败:', error);
    // 降级处理：使用临时会话ID
    currentSessionId.value = 'temp_' + Date.now();
  }
};

// 创建新会话
const createNewSession = async () => {
  try {
    const response = await uni.request({
      url: `${apiBaseUrl}/api/ai/session/create`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
      },
      data: {
        userId: userId.value,
        sessionData: {
          title: '新的对话',
          platform: 'mobile',
        },
      },
    });

    if (response.statusCode === 200 && response.data && response.data.success) {
      currentSessionId.value = response.data.sessionId;
      // 保存到本地存储
      uni.setStorageSync('currentChatSession', currentSessionId.value);
      console.log('创建新会话成功:', currentSessionId.value);
    } else {
      throw new Error(response.data?.error || '创建会话失败');
    }
  } catch (error) {
    console.error('创建会话失败:', error);
    console.error('错误详情:', {
      message: error.message,
      response: error.response || error.data,
      status: error.statusCode || error.status,
    });
    // 使用临时会话ID
    currentSessionId.value = 'temp_' + Date.now();
  }
};

// 验证会话有效性
const validateSession = async sessionId => {
  try {
    const response = await uni.request({
      url: `${apiBaseUrl}/api/ai/session/${sessionId}/stats`,
      method: 'GET',
    });

    return response.statusCode === 200 && response.data && response.data.success;
  } catch (error) {
    return false;
  }
};

// 加载历史消息
const loadHistoryMessages = async (options = {}) => {
  const { fromUserScroll = false } = options;
  if (!currentSessionId.value || isLoadingHistory.value || !hasMoreHistory.value) {
    return;
  }

  try {
    isLoadingHistory.value = true;

    const response = await uni.request({
      url: `${apiBaseUrl}/api/ai/session/${currentSessionId.value}/messages`,
      method: 'GET',
      data: {
        page: currentPage.value,
        pageSize: pageSize.value,
      },
    });

    if (response.statusCode === 200 && response.data && response.data.success) {
      const { messages, hasMore } = response.data;

      if (messages && messages.length > 0) {
        const isInitialPage = currentPage.value === 1;
        // 统一按时间升序（旧->新）排序，避免接口返回顺序不一致导致渲染反序
        const sorted = messages
          .slice()
          .sort((a, b) => new Date(a.timestamp || a.createdAt) - new Date(b.timestamp || b.createdAt));
        const historyMessages = sorted.map(msg => ({
          type: msg.type,
          content: msg.content,
          messageType: msg.messageType, // 保留消息类型（如 'image'）
          metadata: msg.metadata, // 保留元数据（如图片的prompt等）
          time: formatTime(new Date(msg.timestamp || msg.createdAt)),
          id: msg.id,
        }));

        if (isInitialPage && !fromUserScroll) {
          // 页面初次自动加载（当前已禁用），如启用则进入底部
          messageList.value = historyMessages;
          nextTick(() => scrollToBottom());
        } else {
          // 用户上拉触顶加载或后续分页，前置拼接
          messageList.value = [...historyMessages, ...messageList.value];
        }

        currentPage.value++;
        hasMoreHistory.value = hasMore;

        console.log(`加载了${messages.length}条历史消息`);
      } else {
        hasMoreHistory.value = false;
      }
    }
  } catch (error) {
    console.error('加载历史消息失败:', error);
    hasMoreHistory.value = false;
  } finally {
    isLoadingHistory.value = false;
  }
};

// 监听滚动，实时记录 scrollTop
const onScroll = e => {
  const top = e?.detail?.scrollTop ?? 0;
  scrollTop.value = top;
};

// 手动点击加载历史（当内容不足以触发触顶或下拉刷新时）
const manualLoadHistory = async () => {
  if (isLoadingHistory.value || !hasMoreHistory.value) return;
  try {
    await loadHistoryMessages({
      fromUserScroll: true,
    });
  } catch (err) {
    console.error('手动加载历史失败:', err);
    uni.showToast({
      title: '加载失败，请稍后重试',
      icon: 'none',
    });
  }
};

// 返回上一页
const goBack = () => {
  uni.navigateBack();
};

// 发送消息（更新为使用会话上下文）
const sendMessage = async () => {
  if (!inputText.value.trim() || isSending.value) return;

  isSending.value = true;

  const userMessage = {
    type: 'user',
    content: inputText.value.trim(),
    time: getCurrentTime(),
    id: Date.now().toString(),
    userId: userId.value, // 关联真实用户ID
    userInfo: userInfo.value, // 包含用户信息用于显示
  };

  messageList.value.push(userMessage);
  showQuickReplies.value = false;

  const userInput = inputText.value.trim();
  inputText.value = '';

  // 滚动到底部
  nextTick(() => {
    scrollToBottom();
  });

  // 显示打字效果
  isTyping.value = true;

  try {
    // 使用带上下文的AI接口
    await getAIReplyWithContext(userInput);
  } catch (error) {
    console.error('AI回复失败:', error);
    // 降级到本地回复
    fallbackToLocalReply(userInput);
  } finally {
    isSending.value = false;
  }
};

// 快捷回复
const sendQuickReply = reply => {
  inputText.value = reply;
  sendMessage();
};

// 获取带上下文的AI回复
const getAIReplyWithContext = async userInput => {
  try {
    if (!currentSessionId.value) {
      await createNewSession();
    }

    const response = await uni.request({
      url: `${apiBaseUrl}/api/ai/chat-with-context`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
      },
      data: {
        sessionId: currentSessionId.value,
        userId: userId.value,
        message: userInput,
        model: 'THUDM/GLM-4-9B-0414',
        contextSize: 10,
      },
      timeout: 30000,
    });

    isTyping.value = false;

    if (response.statusCode === 200 && response.data && response.data.success) {
      const aiContent = response.data.content;

      // 创建AI消息对象
      const aiMessage = {
        type: 'ai',
        content: '',
        time: getCurrentTime(),
        id: response.data.message?.id || Date.now().toString(),
      };

      messageList.value.push(aiMessage);

      // 使用流式效果显示AI回复
      simulateStreamResponse(aiMessage, aiContent);
    } else {
      throw new Error(response.data?.error || 'AI服务响应异常');
    }
  } catch (error) {
    console.error('带上下文的AI回复失败:', error);
    console.error('错误详情:', {
      message: error.message,
      response: error.response || error.data,
      status: error.statusCode || error.status,
    });
    isTyping.value = false;
    throw error;
  }
};

// 原有的获取AI回复方法（作为备用）
const getAIReply = async userInput => {
  try {
    // 首先尝试使用带上下文的API
    await getAIReplyWithContext(userInput);
  } catch (error) {
    console.error('上下文AI回复失败，降级到简单模式:', error);

    // 降级到原有的简单AI接口
    const contextMessages = getContextMessages(userInput);
    await callAIStreamAPI(contextMessages);
  }
};

// 滚动到顶部时加载更多历史消息
const onScrollToUpper = async () => {
  if (isLoadingHistory.value || !hasMoreHistory.value) {
    return;
  }

  console.log('触发上拉加载历史消息');

  const hadMessages = messageList.value && messageList.value.length > 0;
  // 记录当前滚动位置
  const currentScrollTop = scrollTop.value;

  await loadHistoryMessages({
    fromUserScroll: true,
  });

  // 加载完成后调整滚动位置，避免跳动（仅在已有消息基础上加载才需要）
  nextTick(() => {
    if (hadMessages) {
      // 保持相对位置
      scrollTop.value = currentScrollTop + 100;
    }
  });
};

// 下拉刷新触发（scroll-view 原生下拉）
const onRefresherRefresh = async () => {
  if (isLoadingHistory.value || !hasMoreHistory.value) {
    refresherTriggered.value = false;
    if (!hasMoreHistory.value) {
      uni.showToast({
        title: '没有更多历史了',
        icon: 'none',
      });
    }
    return;
  }
  refresherTriggered.value = true;
  try {
    await loadHistoryMessages({
      fromUserScroll: true,
    });
  } catch (e) {
    console.error('下拉刷新加载历史失败:', e);
    uni.showToast({
      title: '加载失败，请稍后重试',
      icon: 'none',
    });
  } finally {
    // 稍作延迟以展示下拉刷新完成动画
    setTimeout(() => {
      refresherTriggered.value = false;
    }, 400);
  }
};

// 保存当前会话到本地存储
const saveSessionToLocal = () => {
  try {
    const sessionData = {
      sessionId: currentSessionId.value,
      userId: userId.value,
      lastUpdated: Date.now(),
    };
    uni.setStorageSync('currentChatSession', currentSessionId.value);
    uni.setStorageSync('chatSessionData', sessionData);
  } catch (error) {
    console.error('保存会话到本地失败:', error);
  }
};

// 从本地存储恢复会话
const restoreSessionFromLocal = () => {
  try {
    const sessionData = uni.getStorageSync('chatSessionData');
    if (sessionData && sessionData.sessionId) {
      // 检查会话是否在24小时内
      const now = Date.now();
      const lastUpdated = sessionData.lastUpdated || 0;
      const timeDiff = now - lastUpdated;
      const twentyFourHours = 24 * 60 * 60 * 1000;

      if (timeDiff < twentyFourHours) {
        currentSessionId.value = sessionData.sessionId;
        userId.value = sessionData.userId;
        return true;
      }
    }
  } catch (error) {
    console.error('从本地恢复会话失败:', error);
  }
  return false;
};

// 清理过期的本地会话数据
const cleanExpiredLocalSessions = () => {
  try {
    uni.removeStorageSync('currentChatSession');
    uni.removeStorageSync('chatSessionData');
    uni.removeStorageSync('chatMessages');
    uni.removeStorageSync('messageList');
    uni.removeStorageSync('chatHistory');
  } catch (error) {
    console.error('清理本地会话数据失败:', error);
  }
};

// 获取对话上下文
const getContextMessages = currentInput => {
  const systemPrompt = {
    role: 'system',
    content: `你是一个专业的短视频应用客服助手，名叫"小助手"。你的任务是帮助用户解决关于短视频应用的各种问题。
  
  请遵循以下原则：
  1. 友好、专业、耐心地回答用户问题
  2. 回答要简洁明了，避免过长的文字
  3. 针对短视频应用相关问题提供具体的解决方案
  4. 如果不确定答案，建议用户联系人工客服
  5. 保持积极正面的语调
  6. 记住之前的对话内容，提供连贯的服务
  
  常见问题领域：
  - 账户登录注册问题
  - 支付充值相关
  - 视频播放卡顿
  - 会员服务咨询
  - 技术故障报告
  - 其他使用问题`,
  };

  // 获取最近5条对话作为上下文（增加上下文长度）
  const recentMessages = messageList.value.slice(-5).map(msg => ({
    role: msg.type === 'user' ? 'user' : 'assistant',
    content: msg.content,
  }));

  // 添加当前用户输入
  const currentMessage = {
    role: 'user',
    content: currentInput,
  };

  return [systemPrompt, ...recentMessages, currentMessage];
};

// 调用AI接口 - 使用uni.request
const callAIStreamAPI = async messages => {
  isTyping.value = false;

  // 创建AI消息对象
  const aiMessage = {
    type: 'ai',
    content: '',
    time: getCurrentTime(),
    id: Date.now(), // 添加唯一ID用于调试
  };

  messageList.value.push(aiMessage);

  // 显示打字效果
  showTypingEffect(aiMessage);

  return new Promise((resolve, reject) => {
    const apiUrl = `${apiBaseUrl}/api/ai/simple-chat`;

    uni.request({
      url: apiUrl,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
      },
      data: {
        messages: messages,
        model: 'THUDM/GLM-4-9B-0414',
      },
      timeout: 30000,
      success: res => {
        if (res.statusCode === 200) {
          // 检查是否有AI回复内容
          let aiContent = res.data?.content || res.data?.message || '';

          // 清理内容：去除前后空白字符和换行符
          aiContent = aiContent.trim();

          if (aiContent && aiContent.length > 0) {
            // 模拟流式效果，逐字显示
            simulateStreamResponse(aiMessage, aiContent);
            resolve(aiContent);
          } else {
            simulateStreamResponse(aiMessage, '抱歉，我现在无法回答您的问题，请稍后再试。');
            resolve('抱歉，我现在无法回答您的问题，请稍后再试。');
          }
        } else {
          // 移除未完成的AI消息
          const index = messageList.value.indexOf(aiMessage);
          if (index > -1) {
            messageList.value.splice(index, 1);
          }
          reject(new Error(res.data?.message || 'AI服务响应异常'));
        }
      },
      fail: error => {
        // 移除未完成的AI消息
        const index = messageList.value.indexOf(aiMessage);
        if (index > -1) {
          messageList.value.splice(index, 1);
        }

        // 显示用户友好的错误提示
        uni.showToast({
          title: 'AI服务暂时不可用',
          icon: 'none',
          duration: 2000,
        });

        reject(error);
      },
    });
  });
};

// 显示打字效果
const showTypingEffect = aiMessage => {
  const dots = ['', '.', '..', '...'];
  let dotIndex = 0;

  const typingInterval = setInterval(() => {
    const typingText = `正在思考中${dots[dotIndex]}`;
    // 使用Vue.set确保响应式更新
    aiMessage.content = typingText;
    dotIndex = (dotIndex + 1) % dots.length;

    nextTick(() => {
      scrollToBottom();
    });
  }, 500);

  // 保存定时器ID，用于清除
  aiMessage.typingInterval = typingInterval;
};

// 模拟流式响应效果
const simulateStreamResponse = (aiMessage, fullContent) => {
  // 清除打字效果
  if (aiMessage.typingInterval) {
    clearInterval(aiMessage.typingInterval);
    delete aiMessage.typingInterval;
  }

  if (!fullContent || fullContent.trim() === '') {
    fullContent = '抱歉，我现在无法回答您的问题，请稍后再试。';
  }

  // 逐字显示效果 - 流式输出
  let currentIndex = 0;
  const chars = fullContent.split('');

  const displayInterval = setInterval(() => {
    if (currentIndex < chars.length) {
      const currentContent = chars.slice(0, currentIndex + 1).join('');

      const msgToUpdate = messageList.value.find(msg => msg.id === aiMessage.id);
      if (msgToUpdate) {
        msgToUpdate.content = currentContent;
      }

      currentIndex++;

      nextTick(() => {
        scrollToBottom();
      });
    } else {
      clearInterval(displayInterval);
    }
  }, 80); // 每80ms显示一个字符，稍微慢一点更有打字效果
};

// 备用的本地AI回复（当API不可用时使用）
const getLocalAIReply = userInput => {
  isTyping.value = false;

  let replyContent = '';

  // 根据用户输入匹配回复
  if (userInput.includes('账户') || userInput.includes('登录') || userInput.includes('注册')) {
    replyContent = aiReplies['账户问题'];
  } else if (userInput.includes('支付') || userInput.includes('付费') || userInput.includes('充值')) {
    replyContent = aiReplies['支付相关'];
  } else if (userInput.includes('视频') || userInput.includes('播放') || userInput.includes('卡顿')) {
    replyContent = aiReplies['视频播放'];
  } else if (userInput.includes('会员') || userInput.includes('VIP')) {
    replyContent = aiReplies['会员服务'];
  } else if (userInput.includes('技术') || userInput.includes('bug') || userInput.includes('问题')) {
    replyContent = aiReplies['技术支持'];
  } else {
    // 默认智能回复
    const responses = [
      '我理解您的问题，让我为您详细解答...',
      '这是一个很好的问题，根据我的了解...',
      '关于这个问题，我建议您可以尝试以下方法...',
      '感谢您的咨询，针对您提到的情况...',
    ];
    replyContent = responses[Math.floor(Math.random() * responses.length)];
  }

  // 创建新的AI消息对象
  const aiMessage = {
    type: 'ai',
    content: '',
    time: getCurrentTime(),
  };

  // 添加到消息列表
  messageList.value.push(aiMessage);

  // 使用模拟流式效果显示内容
  simulateStreamResponse(aiMessage, replyContent);
};

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    scrollTop.value = 999999;
  });
};

// 输入框获得焦点
const onInputFocus = () => {
  showQuickReplies.value = false;
  showEmojiPanel.value = false;

  // 监听键盘高度变化
  listenKeyboardHeight();

  setTimeout(() => {
    scrollToBottom();
  }, 300);
};

// 输入框失去焦点
const onInputBlur = () => {
  if (messageList.value.length <= 2) {
    showQuickReplies.value = true;
  }

  // 重置输入区域位置
  resetInputPosition();
};

// 监听键盘高度变化
const listenKeyboardHeight = () => {
  // #ifdef APP-PLUS
  // App环境下监听键盘高度
  uni.onKeyboardHeightChange(res => {
    console.log('键盘高度变化:', res.height);
    adjustInputPosition(res.height);
  });
  // #endif

  // #ifdef H5
  // H5环境下监听视口变化
  const originalHeight = window.innerHeight;
  const checkResize = () => {
    const currentHeight = window.innerHeight;
    const keyboardHeight = originalHeight - currentHeight;
    if (keyboardHeight > 100) {
      // 键盘弹出
      adjustInputPosition(keyboardHeight);
    } else {
      // 键盘收起
      resetInputPosition();
    }
  };

  window.addEventListener('resize', checkResize);
  // 保存监听器引用以便清理
  resizeListener = checkResize;
  // #endif

  // #ifdef MP-WEIXIN
  // 微信小程序环境下监听键盘高度
  uni.onKeyboardHeightChange &&
    uni.onKeyboardHeightChange(res => {
      console.log('键盘高度变化:', res.height);
      adjustInputPosition(res.height);
    });
  // #endif
};

// 调整输入区域位置
const adjustInputPosition = keyboardHeight => {
  // #ifdef H5
  const inputContainer = document.querySelector('.input-container');
  const emojiPanel = document.querySelector('.emoji-panel');
  const quickReplies = document.querySelector('.quick-replies');

  if (inputContainer) {
    // 将输入区域上移到键盘上方
    inputContainer.style.transform = `translateY(-${keyboardHeight}px)`;
  }

  if (emojiPanel && showEmojiPanel.value) {
    // 调整表情面板位置
    emojiPanel.style.transform = `translateY(-${keyboardHeight}px)`;
  }

  if (quickReplies && showQuickReplies.value) {
    // 调整快捷回复位置
    quickReplies.style.transform = `translateY(-${keyboardHeight}px)`;
  }
  // #endif

  // #ifdef APP-PLUS || MP-WEIXIN
  // 在uni-app环境下使用动态样式
  inputContainerStyle.value = {
    transform: `translateY(-${keyboardHeight}px)`,
    transition: 'transform 0.3s ease',
  };

  if (showEmojiPanel.value) {
    emojiPanelStyle.value = {
      transform: `translateY(-${keyboardHeight}px)`,
      transition: 'transform 0.3s ease',
    };
  }

  if (showQuickReplies.value) {
    quickRepliesStyle.value = {
      transform: `translateY(-${keyboardHeight}px)`,
      transition: 'transform 0.3s ease',
    };
  }
  // 增加内容区底部内边距，避免被键盘遮挡
  chatContentStyle.value = {
    paddingBottom: `${100 + keyboardHeight}px`,
  };
  // #endif

  // 调整聊天内容区域，确保消息可见
  setTimeout(() => {
    scrollToBottom();
  }, 100);
};

// 重置输入区域位置
const resetInputPosition = () => {
  // #ifdef H5
  const inputContainer = document.querySelector('.input-container');
  const emojiPanel = document.querySelector('.emoji-panel');
  const quickReplies = document.querySelector('.quick-replies');

  if (inputContainer) {
    inputContainer.style.transform = 'translateY(0)';
  }

  if (emojiPanel) {
    emojiPanel.style.transform = 'translateY(0)';
  }

  if (quickReplies) {
    quickReplies.style.transform = 'translateY(0)';
  }
  // #endif

  // #ifdef APP-PLUS || MP-WEIXIN
  // 重置uni-app环境下的样式
  inputContainerStyle.value = {
    transform: 'translateY(0)',
    transition: 'transform 0.3s ease',
  };

  emojiPanelStyle.value = {
    transform: 'translateY(0)',
    transition: 'transform 0.3s ease',
  };

  quickRepliesStyle.value = {
    transform: 'translateY(0)',
    transition: 'transform 0.3s ease',
  };
  chatContentStyle.value = {
    paddingBottom: '100px',
  };
  // #endif
};

// WebSocket连接管理
const initWebSocket = () => {
  // 暂时保留HTTP方式，WebSocket可作为未来优化
  // 这里可以添加WebSocket连接逻辑
  console.log('WebSocket功能预留位置');
};

// 消息压缩（用于大量历史消息）
const compressMessage = message => {
  try {
    // 简单的消息压缩：移除不必要的字段
    return {
      t: message.type,
      c: message.content,
      tm: message.time,
      id: message.id,
    };
  } catch (error) {
    return message;
  }
};

// 消息解压缩
const decompressMessage = compressedMessage => {
  try {
    if (compressedMessage.t !== undefined) {
      return {
        type: compressedMessage.t,
        content: compressedMessage.c,
        time: compressedMessage.tm,
        id: compressedMessage.id,
      };
    }
    return compressedMessage;
  } catch (error) {
    return compressedMessage;
  }
};

// 批量处理消息（性能优化）
const batchProcessMessages = messages => {
  const batchSize = 10;
  const batches = [];

  for (let i = 0; i < messages.length; i += batchSize) {
    batches.push(messages.slice(i, i + batchSize));
  }

  return batches;
};

// 懒加载消息渲染（性能优化）
const lazyRenderMessages = async messages => {
  const batches = batchProcessMessages(messages);

  for (let i = 0; i < batches.length; i++) {
    await new Promise(resolve => {
      setTimeout(() => {
        messageList.value.push(...batches[i]);
        resolve();
      }, i * 50); // 每批次延迟50ms
    });
  }
};

// 内存管理：清理过多的消息
const manageMemory = () => {
  const maxMessages = 200; // 最多保留200条消息在内存中

  if (messageList.value.length > maxMessages) {
    // 保留最新的消息，移除最旧的
    const messagesToRemove = messageList.value.length - maxMessages;
    messageList.value.splice(0, messagesToRemove);
    console.log(`清理了${messagesToRemove}条旧消息以释放内存`);
  }
};

// 开始录音
const startRecording = async () => {
  if (isRecording.value) return;

  // 请求麦克风权限
  try {
    // #ifdef H5
    await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    // #endif
  } catch (error) {
    uni.showModal({
      title: '权限申请',
      content: '需要访问您的麦克风才能使用语音输入功能，请在浏览器设置中允许麦克风权限。',
      showCancel: false,
    });
    return;
  }

  isRecording.value = true;
  recordingTime.value = 0;
  inputText.value = ''; // 清空输入框准备接收语音文字

  // 开始录音计时
  recordingTimer = setInterval(() => {
    recordingTime.value++;
    if (recordingTime.value >= 60) {
      stopRecording();
    }
  }, 1000);

  // 触觉反馈
  uni.vibrateShort && uni.vibrateShort();

  // 启动真实的语音识别
  startVoiceRecognition();
};

// 停止录音
const stopRecording = () => {
  if (!isRecording.value) return;

  // 如果是Web Speech Recognition，直接停止
  if (recognition) {
    recognition.stop();
    return;
  }

  isRecording.value = false;

  if (recordingTimer) {
    clearInterval(recordingTimer);
    recordingTimer = null;
  }

  // 检查录音时长
  if (recordingTime.value >= 1) {
    // 根据平台处理语音识别
    // #ifdef MP-WEIXIN
    // 微信小程序会在recorderManager.onStop中处理
    // #endif

    // #ifdef APP-PLUS
    // APP环境下的处理
    processAppVoiceResult();
    // #endif

    // #ifdef H5
    // H5环境下已经在recognition.onresult中处理
    // #endif
  } else {
    uni.showToast({
      title: '录音时间太短',
      icon: 'none',
    });
  }
};

// 取消录音
const cancelRecording = () => {
  isRecording.value = false;
  recordingTime.value = 0;
  voiceText.value = '';

  if (recordingTimer) {
    clearInterval(recordingTimer);
    recordingTimer = null;
  }
};

// 开始语音识别
const startVoiceRecognition = () => {
  // 检查平台并调用相应的语音识别API
  // #ifdef H5
  startWebSpeechRecognition();
  // #endif

  // #ifdef MP-WEIXIN
  startWechatVoiceRecognition();
  // #endif

  // #ifdef APP-PLUS
  startAppVoiceRecognition();
  // #endif
};

// H5环境下的语音识别
const startWebSpeechRecognition = () => {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    uni.showToast({
      title: '浏览器不支持语音识别',
      icon: 'none',
    });
    cancelRecording();
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();

  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'zh-CN';

  recognition.onresult = event => {
    let finalTranscript = '';
    let interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    // 实时显示识别结果
    inputText.value = finalTranscript || interimTranscript;
  };

  recognition.onend = () => {
    isRecording.value = false;
    if (recordingTimer) {
      clearInterval(recordingTimer);
      recordingTimer = null;
    }

    if (inputText.value.trim()) {
      uni.showToast({
        title: '语音识别完成',
        icon: 'success',
        duration: 1000,
      });
    }
  };

  recognition.onerror = event => {
    console.error('语音识别错误:', event.error);
    cancelRecording();
    uni.showToast({
      title: '语音识别失败',
      icon: 'none',
    });
  };

  try {
    recognition.start();
  } catch (error) {
    console.error('启动语音识别失败:', error);
    cancelRecording();
    uni.showToast({
      title: '无法启动语音识别',
      icon: 'none',
    });
  }
};

// 微信小程序语音识别
const startWechatVoiceRecognition = () => {
  const recorderManager = uni.getRecorderManager();

  recorderManager.onStart(() => {
    console.log('开始录音');
  });

  recorderManager.onStop(res => {
    console.log('录音结束', res);

    // 调用微信语音识别API
    uni.request({
      url: 'https://api.weixin.qq.com/cgi-bin/media/voice/translatecontent',
      method: 'POST',
      data: {
        // 这里需要配置微信语音识别的参数
        media_id: res.tempFilePath,
        format: 'mp3',
        voice_id: Date.now().toString(),
      },
      success: result => {
        if (result.data && result.data.result) {
          inputText.value = result.data.result;
          uni.showToast({
            title: '语音识别完成',
            icon: 'success',
          });
        }
      },
      fail: error => {
        console.error('语音识别失败:', error);
        uni.showToast({
          title: '语音识别失败',
          icon: 'none',
        });
      },
    });
  });

  recorderManager.onError(error => {
    console.error('录音错误:', error);
    cancelRecording();
    uni.showToast({
      title: '录音失败',
      icon: 'none',
    });
  });

  // 开始录音
  recorderManager.start({
    duration: 60000,
    sampleRate: 16000,
    numberOfChannels: 1,
    encodeBitRate: 96000,
    format: 'mp3',
  });
};

// APP环境下的语音识别
const startAppVoiceRecognition = () => {
  try {
    if (typeof plus !== 'undefined' && plus.speech && plus.speech.startRecognize) {
      // 可选：请求录音权限（Android）
      if (plus.android && plus.android.requestPermissions) {
        try {
          plus.android.requestPermissions(
            ['android.permission.RECORD_AUDIO'],
            () => {},
            () => {}
          );
        } catch (_e) {}
      }

      plus.speech.startRecognize(
        {
          engine: 'iFly',
          lang: 'zh-cn',
          punctuation: true,
        },
        result => {
          inputText.value = result || '';
          isRecording.value = false;
          if (recordingTimer) {
            clearInterval(recordingTimer);
            recordingTimer = null;
          }
          uni.showToast({
            title: '语音识别完成',
            icon: 'success',
            duration: 1000,
          });
        },
        error => {
          console.error('语音识别失败:', error);
          cancelRecording();
          uni.showToast({
            title: '语音识别失败',
            icon: 'none',
          });
        }
      );
    } else {
      uni.showToast({
        title: '当前App不支持语音识别',
        icon: 'none',
      });
      cancelRecording();
    }
  } catch (error) {
    console.error('启动语音识别失败:', error);
    cancelRecording();
    uni.showToast({
      title: '无法启动语音识别',
      icon: 'none',
    });
  }
};

// 模拟语音转文字
const simulateVoiceToText = () => {
  const mockTexts = [
    '你好，我想咨询一下会员服务',
    '视频播放有点卡顿怎么办',
    '如何修改我的账户信息',
    '支付失败了怎么处理',
    '有什么新功能吗',
  ];

  const recognizedText = mockTexts[Math.floor(Math.random() * mockTexts.length)];

  // 逐字显示在输入框中
  typeTextInInput(recognizedText);
};

// 逐字显示文字到输入框
const typeTextInInput = text => {
  inputText.value = '';
  let currentIndex = 0;

  const typeInterval = setInterval(() => {
    if (currentIndex < text.length) {
      inputText.value += text[currentIndex];
      currentIndex++;
    } else {
      clearInterval(typeInterval);

      // 显示成功提示
      uni.showToast({
        title: '语音识别完成',
        icon: 'success',
        duration: 1000,
      });

      // 触觉反馈
      uni.vibrateShort && uni.vibrateShort();
    }
  }, 100); // 每100ms显示一个字符
};

// 切换表情面板
const toggleEmojiPanel = () => {
  showEmojiPanel.value = !showEmojiPanel.value;
  if (showEmojiPanel.value) {
    showQuickReplies.value = false;
  }
};

// 选择表情
const selectEmoji = emoji => {
  inputText.value += emoji.char;
  // 不自动关闭面板，让用户可以连续选择表情
  // showEmojiPanel.value = false;
};

// 获取当前时间
const getCurrentTime = () => {
  return formatTime(new Date());
};

// 格式化时间
const formatTime = date => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

// 测试AI连接
const testAIConnection = async () => {
  try {
    const healthUrl = `${apiBaseUrl}/api/ai/health`;

    uni.request({
      url: healthUrl,
      method: 'GET',
      timeout: 10000,
      success: res => {
        // AI服务连接正常，无需显示信息
      },
      fail: error => {
        // 静默失败
      },
    });
  } catch (error) {
    // 静默处理连接测试错误
  }
};

// 降级到本地回复
const fallbackToLocalReply = userInput => {
  isTyping.value = false;

  // 延迟一点时间，让用户感觉是AI在思考
  setTimeout(() => {
    getLocalAIReply(userInput);
  }, 1000);
};

// 打开图片生成弹窗
const openImageModal = () => {
  showImageModal.value = true;
  imagePrompt.value = '';
  imageGenerationError.value = '';
  showEmojiPanel.value = false;
  showQuickReplies.value = false;
};

// 关闭图片生成弹窗
const closeImageModal = () => {
  showImageModal.value = false;
  imagePrompt.value = '';
  imageGenerationError.value = '';
  isGeneratingImage.value = false;
};

// 生成图片
const generateImage = async () => {
  if (!imagePrompt.value.trim() || isGeneratingImage.value) return;

  isGeneratingImage.value = true;
  imageGenerationError.value = '';

  // 添加用户的图片生成请求消息
  const userMessage = {
    type: 'user',
    content: `[图片生成] ${imagePrompt.value.trim()}`,
    time: getCurrentTime(),
    id: Date.now().toString() + '_user',
    userId: userId.value,
    userInfo: userInfo.value,
  };

  messageList.value.push(userMessage);

  // 关闭弹窗
  showImageModal.value = false;

  // 滚动到底部
  nextTick(() => {
    scrollToBottom();
  });

  // 显示打字效果
  isTyping.value = true;

  try {
    const response = await uni.request({
      url: `${apiBaseUrl}/api/ai/generate-image`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
      },
      data: {
        prompt: imagePrompt.value.trim(),
        model: 'Kwai-Kolors/Kolors',
        sessionId: currentSessionId.value,
        userId: userId.value,
        size: '1024x1024',
        quality: 'standard',
      },
      timeout: 60000, // 60秒超时
    });

    isTyping.value = false;

    if (response.statusCode === 200 && response.data && response.data.success) {
      // 创建AI图片消息
      const aiImageMessage = {
        type: 'ai',
        content: response.data.imageUrl,
        messageType: 'image',
        metadata: {
          prompt: imagePrompt.value.trim(),
          model: response.data.model,
          ...response.data.metadata,
        },
        time: getCurrentTime(),
        id: Date.now().toString() + '_ai_image',
      };

      messageList.value.push(aiImageMessage);

      // 清空提示词
      imagePrompt.value = '';

      // 滚动到底部
      nextTick(() => {
        scrollToBottom();
      });

      uni.showToast({
        title: '图片生成成功',
        icon: 'success',
        duration: 2000,
      });
    } else {
      throw new Error(response.data?.message || '图片生成失败');
    }
  } catch (error) {
    console.error('图片生成失败:', error);
    isTyping.value = false;

    // 显示错误消息
    const errorMessage = {
      type: 'ai',
      content: '抱歉，图片生成失败了。请稍后再试。',
      time: getCurrentTime(),
      id: Date.now().toString() + '_ai_error',
    };

    messageList.value.push(errorMessage);

    // 显示用户友好的错误提示
    const errorText = error.response?.data?.message || error.message || '图片生成失败';

    uni.showToast({
      title: errorText,
      icon: 'none',
      duration: 3000,
    });
  } finally {
    isGeneratingImage.value = false;
  }
};

// 图片加载成功事件
const onImageLoad = event => {
  console.log('图片加载成功:', event);
  // 图片加载成功后重新滚动到底部
  nextTick(() => {
    scrollToBottom();
  });
};

// 图片加载失败事件
const onImageError = event => {
  console.error('图片加载失败:', event);
  uni.showToast({
    title: '图片加载失败',
    icon: 'none',
    duration: 2000,
  });
};

// 添加示例标签到输入框
const addExampleTag = tag => {
  if (!imagePrompt.value.includes(tag)) {
    imagePrompt.value = imagePrompt.value.trim();
    if (imagePrompt.value) {
      imagePrompt.value += `，${tag}`;
    } else {
      imagePrompt.value = tag;
    }

    // 触觉反馈
    uni.vibrateShort && uni.vibrateShort();

    // 简单的提示反馈
    uni.showToast({
      title: `已添加「${tag}」`,
      icon: 'none',
      duration: 1000,
    });
  }
};

// 打开视频生成弹窗
const openVideoModal = () => {
  showVideoModal.value = true;
  videoPrompt.value = '';
  videoGenerationError.value = '';
  videoGenerationProgress.value = 0;
  showEmojiPanel.value = false;
  showQuickReplies.value = false;
  showImageModal.value = false;
};

// 关闭视频生成弹窗
const closeVideoModal = () => {
  showVideoModal.value = false;
  videoPrompt.value = '';
  videoGenerationError.value = '';
  videoGenerationProgress.value = 0;
  isGeneratingVideo.value = false;
};

// 生成视频（演示版本 - 显示余额不足提示）
const generateVideo = () => {
  if (!videoPrompt.value.trim()) return;

  // 关闭弹窗
  closeVideoModal();

  // 显示余额不足的提示弹窗
  uni.showModal({
    title: '余额不足',
    content: '抱歉，您的账户余额不足，暂时无法使用AI视频生成功能。\n\n视频生成需要消耗较多算力资源，请充值后再试。',
    confirmText: '去充值',
    cancelText: '我知道了',
    success: res => {
      if (res.confirm) {
        // 用户点击了去充值，可以跳转到充值页面
        uni.showToast({
          title: '充值功能开发中',
          icon: 'none',
          duration: 2000,
        });
      }
    },
  });

  // 添加一个简单的提示到聊天记录中
  setTimeout(() => {
    const systemMessage = {
      type: 'ai',
      content: '💰 检测到余额不足，视频生成功能暂时不可用。图片生成功能仍可正常使用！',
      time: getCurrentTime(),
      id: Date.now().toString() + '_system',
    };

    messageList.value.push(systemMessage);

    // 滚动到底部
    nextTick(() => {
      scrollToBottom();
    });
  }, 500);
};

// 模拟视频生成进度（已禁用，保留代码结构）
const simulateVideoProgress = () => {
  // 功能已禁用，因为视频生成改为演示模式
  console.log('视频生成进度模拟已禁用');
};

// 添加视频示例标签到输入框
const addVideoExampleTag = tag => {
  if (!videoPrompt.value.includes(tag)) {
    videoPrompt.value = videoPrompt.value.trim();
    if (videoPrompt.value) {
      videoPrompt.value += `，${tag}`;
    } else {
      videoPrompt.value = tag;
    }

    // 触觉反馈
    uni.vibrateShort && uni.vibrateShort();

    // 简单的提示反馈
    uni.showToast({
      title: `已添加「${tag}」`,
      icon: 'none',
      duration: 1000,
    });
  }
};

// 视频加载开始事件
const onVideoLoadStart = event => {
  console.log('视频开始加载:', event);
};

// 视频加载失败事件
const onVideoError = event => {
  console.error('视频加载失败:', event);
  uni.showToast({
    title: '视频加载失败',
    icon: 'none',
    duration: 2000,
  });
};

// Lifecycle Hooks
onLoad(async () => {
  // 初始化用户信息
  await initUserInfo();
  // 初始化聊天会话
  await initChatSession();
  // 首次进入不加载历史，等待用户上拉触顶后再按需加载
  // await loadHistoryMessages();

  // 监听用户信息更新事件
  uni.$on('userInfoUpdated', handleUserInfoUpdate);
});

onShow(() => {
  // 刷新用户信息，确保获取最新数据
  refreshUserInfo();

  // 页面显示时不清空消息，保持会话连续性
  // 只重置UI状态
  showQuickReplies.value = messageList.value.length === 0;
  isTyping.value = false;
  showEmojiPanel.value = false;
  showImageModal.value = false;
  showVideoModal.value = false;

  // 清除所有定时器
  if (typingTimer) {
    clearTimeout(typingTimer);
    typingTimer = null;
  }
  if (videoProgressInterval) {
    clearInterval(videoProgressInterval);
    videoProgressInterval = null;
  }
});

onReady(() => {
  scrollToBottom();
});

onUnload(() => {
  // 移除事件监听器
  uni.$off('userInfoUpdated', handleUserInfoUpdate);

  // 清理键盘监听器
  // #ifdef H5
  if (resizeListener) {
    window.removeEventListener('resize', resizeListener);
    resizeListener = null;
  }
  // #endif

  // #ifdef APP-PLUS
  uni.offKeyboardHeightChange && uni.offKeyboardHeightChange();
  // #endif

  // #ifdef MP-WEIXIN
  uni.offKeyboardHeightChange && uni.offKeyboardHeightChange();
  // #endif
});
</script>

<style lang="scss" scoped>
.chat-container {
  height: 100%;
  background-color: #f5f7fa;
  display: flex;
  flex-direction: column;
}

/* 自定义导航栏 */
.custom-navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  transform: translateZ(0);
  will-change: transform;
  background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);
  padding-top: var(--status-bar-height, 44px);
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
  box-shadow: 0 8px 20px rgba(118, 75, 162, 0.15);
  overflow: hidden;
  backdrop-filter: saturate(180%) blur(10px);
  -webkit-backdrop-filter: saturate(180%) blur(10px);

  .navbar-content {
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px;

    .navbar-left,
    .navbar-right {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.18);
      border: 1px solid rgba(255, 255, 255, 0.25);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
      transition: all 0.2s ease;

      &:active {
        transform: scale(0.95);
        background: rgba(255, 255, 255, 0.3);
      }
    }

    .navbar-title {
      color: #ffffff;
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
    }
  }

  &::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 1px;
    background: rgba(255, 255, 255, 0.35);
    opacity: 0.6;
  }

  &::after {
    content: '';
    position: absolute;
    top: -120%;
    left: -30%;
    width: 60%;
    height: 300%;
    background: linear-gradient(
      60deg,
      rgba(255, 255, 255, 0.25),
      rgba(255, 255, 255, 0.02) 60%,
      rgba(255, 255, 255, 0)
    );
    transform: rotate(12deg);
    pointer-events: none;
  }
}

/* 聊天内容区域 */
.chat-content {
  flex: 1;
  padding: 15px 5px;
  /* u-navbar 已占位，这里不再额外添加 margin-top */
  padding-bottom: 100px;
  /* 为固定的输入区域预留空间 */
  overflow-y: auto;
}

/* 历史加载入口 */
.history-loader {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 15px;
  margin: 10px 15px;
  background: #f8f9fa;
  border: 1px dashed #d0d7de;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: #e9ecef;
    border-color: #6c757d;
  }

  text {
    color: #6c757d;
    font-size: 14px;
  }
}

/* 欢迎消息 */
.welcome-message {
  display: flex;
  margin-bottom: 20px;
  margin-left: 5px;

  .welcome-avatar {
    margin-right: 6px;
    flex-shrink: 0;
    min-width: 40px;
  }

  .welcome-text {
    flex: 1;

    .message-bubble {
      background: #ffffff;
      color: #333;
      padding: 12px 16px;
      border-radius: 18px;
      border-top-left-radius: 6px;
      max-width: 250px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .message-time {
      font-size: 12px;
      color: #999;
      margin-top: 6px;
      margin-left: 8px;
    }
  }
}

/* 消息列表 */
.message-item {
  margin-bottom: 20px;

  &.message-animation {
    animation: messageSlideIn 0.4s ease-out forwards;
    opacity: 0;
    transform: translateY(20px);
  }

  &.ai {
    .ai-message {
      display: flex;
      align-items: flex-start;
      margin-left: 5px;

      .message-avatar {
        margin-right: 6px;
        flex-shrink: 0;
        min-width: 40px;
      }

      .message-content {
        flex: 1;

        .ai-bubble {
          background: #ffffff;
          color: #333;
          padding: 12px 16px;
          border-radius: 18px;
          border-top-left-radius: 6px;
          max-width: 250px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          position: relative;
          font-size: 14px;
          line-height: 1.4;
          word-wrap: break-word;
          white-space: pre-wrap;
        }

        .message-time {
          font-size: 12px;
          color: #999;
          margin-top: 6px;
          margin-left: 8px;
        }
      }
    }
  }

  &.user {
    .user-message {
      display: flex;
      align-items: flex-start;
      justify-content: flex-end;
      padding-right: 0;
      margin-right: 5px;

      .message-avatar {
        margin-left: 6px;
        flex-shrink: 0;
        min-width: 40px;
      }

      .message-content {
        display: flex;
        flex-direction: column;
        align-items: flex-end;

        .user-bubble {
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
          color: #ffffff;
          padding: 12px 16px;
          border-radius: 18px;
          border-top-right-radius: 6px;
          max-width: 250px;
          box-shadow: 0 2px 8px rgba(79, 172, 254, 0.3);
        }

        .message-time {
          font-size: 12px;
          color: #999;
          margin-top: 6px;
          margin-right: 8px;
        }
      }
    }
  }
}

/* 打字提示 */
.typing-indicator {
  display: flex;
  align-items: center;
  margin-bottom: 20px;

  .typing-avatar {
    margin-right: 10px;
  }

  .typing-bubble {
    background: #ffffff;
    padding: 12px 16px;
    border-radius: 18px;
    border-top-left-radius: 6px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

    .typing-dots {
      display: flex;
      gap: 4px;

      .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background-color: #999;
        animation: typing 1.4s infinite ease-in-out;

        &:nth-child(1) {
          animation-delay: -0.32s;
        }

        &:nth-child(2) {
          animation-delay: -0.16s;
        }
      }
    }
  }
}

@keyframes typing {
  0%,
  80%,
  100% {
    transform: scale(0.8);
    opacity: 0.5;
  }

  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* 快捷回复 */
.quick-replies {
  position: fixed;
  bottom: 80px;
  /* 位于输入区域上方 */
  left: 0;
  right: 0;
  padding: 10px 15px;
  background: #ffffff;
  border-top: 1px solid #f0f0f0;
  z-index: 999;

  .quick-scroll {
    white-space: nowrap;
  }

  .quick-reply-list {
    display: flex;
    gap: 10px;

    .quick-reply-item {
      padding: 8px 16px;
      background: #f8f9fa;
      border-radius: 20px;
      font-size: 14px;
      color: #666;
      white-space: nowrap;
      border: 1px solid #e9ecef;
      transition: all 0.3s ease;

      &:active {
        background: #667eea;
        color: #ffffff;
        transform: scale(0.95);
      }
    }
  }
}

/* 表情面板 */
.emoji-panel {
  position: fixed;
  bottom: 80px;
  /* 位于输入区域上方 */
  left: 0;
  right: 0;
  background: #ffffff;
  border-top: 1px solid #f0f0f0;
  height: 200px;
  animation: slideUpIn 0.3s ease-out;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  z-index: 999;

  .emoji-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 15px;
    border-bottom: 1px solid #f0f0f0;

    .emoji-title {
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }

    .emoji-close {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: #f8f9fa;

      &:active {
        background: #e9ecef;
        transform: scale(0.95);
      }
    }
  }

  .emoji-content {
    height: 150px;
    padding: 10px 15px;
  }

  .emoji-grid {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 6px;
    padding: 5px 0;

    .emoji-item {
      aspect-ratio: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      transition: all 0.2s ease;
      cursor: pointer;

      .emoji-char {
        font-size: 22px;
        line-height: 1;
        user-select: none;
      }

      &:hover {
        background: #f8f9fa;
      }

      &:active {
        background: #e9ecef;
        transform: scale(1.15);
      }
    }
  }
}

/* 输入区域 */
.input-container {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #ffffff;
  border-top: 1px solid #f0f0f0;
  padding: 10px 15px;
  padding-bottom: calc(10px + env(safe-area-inset-bottom));
  z-index: 1000;
  transition: transform 0.3s ease;

  .input-wrapper {
    display: flex;
    align-items: center;
    background: #f8f9fa;
    border-radius: 25px;
    padding: 5px 8px;

    .input-content {
      flex: 1;
      padding: 0 12px;

      .message-input {
        background: transparent;
        border: none;
        font-size: 16px;

        &.recording {
          background: rgba(255, 107, 107, 0.1);
          border-radius: 15px;
          padding: 8px 12px;
        }
      }
    }

    .input-actions {
      display: flex;
      align-items: center;
      gap: 6px;

      .emoji-btn {
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        background: #ffffff;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
        border: 1px solid #e9ecef;

        .emoji-icon {
          font-size: 20px;
          line-height: 1;
        }

        &.active {
          background: #667eea;
          border-color: #667eea;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);

          .emoji-icon {
            filter: grayscale(1) brightness(2);
          }
        }

        &:active {
          transform: scale(0.95);
          background: #f8f9fa;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }
      }

      .voice-btn {
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: #ffffff;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;

        &.recording {
          background: linear-gradient(135deg, #ff6b6b 0%, #ff8e8e 100%);
          box-shadow: 0 4px 12px rgba(255, 107, 107, 0.4);
          animation: pulse 1.2s infinite;
        }

        &:active {
          transform: scale(0.95);
        }
      }

      .image-btn {
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.85));
        border: 1px solid rgba(102, 126, 234, 0.1);
        box-shadow:
          0 4px 12px rgba(102, 126, 234, 0.1),
          0 2px 4px rgba(0, 0, 0, 0.05),
          inset 0 1px 0 rgba(255, 255, 255, 0.8);
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);

        &::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea, #764ba2);
          opacity: 0;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: -1;
        }

        &:hover {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(255, 255, 255, 0.92));
          border-color: rgba(102, 126, 234, 0.2);
          box-shadow:
            0 8px 24px rgba(102, 126, 234, 0.2),
            0 4px 8px rgba(118, 75, 162, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.9);
          transform: translateY(-2px) scale(1.05);

          &::before {
            opacity: 0.08;
          }
        }

        &:active {
          transform: translateY(0) scale(0.95);
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.08));
          box-shadow:
            0 2px 8px rgba(102, 126, 234, 0.15),
            inset 0 2px 4px rgba(102, 126, 234, 0.1);

          &::before {
            opacity: 0.12;
          }
        }

        .image-btn-badge {
          position: absolute;
          top: -2px;
          right: -2px;
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff6b6b, #feca57);
          box-shadow:
            0 2px 8px rgba(255, 107, 107, 0.3),
            0 0 0 2px rgba(255, 255, 255, 0.9);
          animation: badgeSparkle 3s ease-in-out infinite;
          pointer-events: none;
        }
      }

      .video-btn {
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.85));
        border: 1px solid rgba(138, 43, 226, 0.1);
        box-shadow:
          0 4px 12px rgba(138, 43, 226, 0.1),
          0 2px 4px rgba(0, 0, 0, 0.05),
          inset 0 1px 0 rgba(255, 255, 255, 0.8);
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);

        &::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: linear-gradient(135deg, #8a2be2, #da70d6);
          opacity: 0;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: -1;
        }

        &:hover {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(255, 255, 255, 0.92));
          border-color: rgba(138, 43, 226, 0.2);
          box-shadow:
            0 8px 24px rgba(138, 43, 226, 0.2),
            0 4px 8px rgba(218, 112, 214, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.9);
          transform: translateY(-2px) scale(1.05);

          &::before {
            opacity: 0.08;
          }
        }

        &:active {
          transform: translateY(0) scale(0.95);
          background: linear-gradient(135deg, rgba(138, 43, 226, 0.1), rgba(218, 112, 214, 0.08));
          box-shadow:
            0 2px 8px rgba(138, 43, 226, 0.15),
            inset 0 2px 4px rgba(138, 43, 226, 0.1);

          &::before {
            opacity: 0.12;
          }
        }

        .video-btn-badge {
          position: absolute;
          top: -2px;
          right: -2px;
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          border-radius: 50%;
          background: linear-gradient(135deg, #8a2be2, #da70d6);
          box-shadow:
            0 2px 8px rgba(138, 43, 226, 0.3),
            0 0 0 2px rgba(255, 255, 255, 0.9);
          animation: videoBadgeSparkle 4s ease-in-out infinite;
          pointer-events: none;
        }
      }

      .send-btn {
        min-width: 60px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 16px;
        background: #f8f9fa;
        transition: all 0.3s ease;
        padding: 0 16px;
        border: 1px solid #e9ecef;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

        .send-text {
          font-size: 14px;
          color: #6c757d;
          font-weight: 600;
        }

        &.active {
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
          border: 1px solid #4facfe;
          box-shadow: 0 2px 8px rgba(79, 172, 254, 0.4);

          .send-text {
            color: #ffffff;
            font-weight: 700;
          }
        }

        &:active {
          transform: scale(0.95);
        }
      }
    }
  }
}

@keyframes messageSlideIn {
  0% {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }

  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.1);
  }
}

@keyframes slideUpIn {
  0% {
    transform: translateY(100%);
    opacity: 0;
  }

  100% {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

/* 图片生成弹窗样式 - 优化版 */
.image-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(118, 75, 162, 0.2));
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  backdrop-filter: blur(12px) saturate(180%);
  -webkit-backdrop-filter: blur(12px) saturate(180%);
  animation: overlayFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.image-modal {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 24px;
  width: 100%;
  max-width: 420px;
  max-height: 85vh;
  overflow: hidden;
  box-shadow:
    0 32px 64px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(255, 255, 255, 0.8),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.2);
  animation: modalSlideInImproved 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 80px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    opacity: 0.06;
    border-radius: 24px 24px 0 0;
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 24px 16px 24px;
  position: relative;
  z-index: 1;

  .modal-title {
    font-size: 20px;
    font-weight: 700;
    color: #1a1d29;
    letter-spacing: -0.01em;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    display: flex;
    align-items: center;

    &::before {
      content: '✨';
      margin-right: 8px;
      font-size: 18px;
      -webkit-text-fill-color: initial;
    }
  }

  .modal-close {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.8);
    border: 1px solid rgba(0, 0, 0, 0.06);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);

    &:hover {
      background: rgba(255, 255, 255, 0.95);
      border-color: rgba(102, 126, 234, 0.2);
      transform: scale(1.05);
    }

    &:active {
      background: rgba(255, 255, 255, 1);
      transform: scale(0.95);
    }
  }
}

.modal-content {
  padding: 8px 24px 24px 24px;
  position: relative;
  z-index: 1;

  .feature-tip {
    text-align: center;
    margin-bottom: 20px;
    padding: 12px 16px;
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.06), rgba(118, 75, 162, 0.04));
    border-radius: 12px;
    border: 1px solid rgba(102, 126, 234, 0.1);

    .tip-text {
      font-size: 13px;
      color: #667eea;
      font-weight: 500;
      line-height: 1.4;
    }
  }

  .prompt-input-wrapper {
    margin-bottom: 16px;

    .input-label {
      display: block;
      font-size: 15px;
      color: #4a5568;
      margin-bottom: 12px;
      font-weight: 600;
      letter-spacing: -0.01em;

      &::after {
        content: '💭';
        margin-left: 8px;
        opacity: 0.7;
      }
    }

    .prompt-input {
      width: 100%;
      background: rgba(255, 255, 255, 0.9);
      border-radius: 16px;
      padding: 16px 20px;
      border: 2px solid rgba(102, 126, 234, 0.1);
      font-size: 15px;
      line-height: 1.6;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow:
        0 4px 12px rgba(0, 0, 0, 0.05),
        inset 0 1px 0 rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      color: #2d3748;
      min-height: 80px;
      resize: none;

      &::placeholder {
        color: #a0aec0;
        font-style: italic;
      }

      &:focus {
        border-color: rgba(102, 126, 234, 0.4);
        background: rgba(255, 255, 255, 0.98);
        box-shadow:
          0 0 0 4px rgba(102, 126, 234, 0.08),
          0 8px 24px rgba(102, 126, 234, 0.12),
          inset 0 1px 0 rgba(255, 255, 255, 0.9);
        transform: translateY(-1px);
      }
    }
  }

  .prompt-examples {
    margin-bottom: 16px;

    .examples-title {
      font-size: 13px;
      color: #4a5568;
      font-weight: 600;
      margin-bottom: 8px;
      display: block;
    }

    .example-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;

      .example-tag {
        padding: 6px 12px;
        background: rgba(102, 126, 234, 0.08);
        border: 1px solid rgba(102, 126, 234, 0.15);
        border-radius: 16px;
        font-size: 12px;
        color: #667eea;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        user-select: none;

        &:hover {
          background: rgba(102, 126, 234, 0.12);
          border-color: rgba(102, 126, 234, 0.25);
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(102, 126, 234, 0.15);
        }

        &:active {
          transform: translateY(0) scale(0.95);
          background: rgba(102, 126, 234, 0.18);
        }
      }
    }
  }

  .error-message {
    display: flex;
    align-items: center;
    padding: 14px 18px;
    background: linear-gradient(135deg, rgba(255, 71, 87, 0.08), rgba(255, 71, 87, 0.04));
    border: 1px solid rgba(255, 71, 87, 0.2);
    border-radius: 12px;
    margin-top: 12px;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);

    .error-text {
      font-size: 14px;
      color: #e53e3e;
      margin-left: 8px;
      font-weight: 500;
    }
  }
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 0 24px 24px 24px;
  position: relative;
  z-index: 1;

  .modal-btn {
    flex: 1;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 16px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    position: relative;
    border: 2px solid transparent;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);

    .btn-text {
      font-size: 16px;
      font-weight: 600;
      letter-spacing: -0.01em;
    }

    &.cancel-btn {
      background: rgba(255, 255, 255, 0.8);
      border-color: rgba(0, 0, 0, 0.08);
      box-shadow:
        0 2px 8px rgba(0, 0, 0, 0.04),
        inset 0 1px 0 rgba(255, 255, 255, 0.9);

      .btn-text {
        color: #718096;
      }

      &:hover {
        background: rgba(255, 255, 255, 0.95);
        border-color: rgba(102, 126, 234, 0.15);
        transform: translateY(-1px);
        box-shadow:
          0 4px 16px rgba(0, 0, 0, 0.08),
          inset 0 1px 0 rgba(255, 255, 255, 0.9);
      }

      &:active {
        background: rgba(255, 255, 255, 1);
        transform: translateY(0) scale(0.98);
      }
    }

    &.generate-btn {
      background: rgba(160, 174, 192, 0.3);
      border-color: rgba(160, 174, 192, 0.2);

      .btn-text {
        color: #a0aec0;
      }

      &.active {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-color: rgba(255, 255, 255, 0.2);
        box-shadow:
          0 8px 24px rgba(102, 126, 234, 0.25),
          0 4px 12px rgba(118, 75, 162, 0.15),
          inset 0 1px 0 rgba(255, 255, 255, 0.2);

        .btn-text {
          color: #ffffff;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        &:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow:
            0 12px 32px rgba(102, 126, 234, 0.3),
            0 8px 16px rgba(118, 75, 162, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }

        &:active {
          transform: translateY(0) scale(0.98);
        }
      }

      &.loading {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-color: rgba(255, 255, 255, 0.2);
        animation: loadingPulse 2s ease-in-out infinite;

        .btn-text {
          color: #ffffff;
          margin-left: 10px;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }
      }
    }
  }
}

/* 图片消息样式 - 优化版 */
.image-bubble {
  padding: 12px !important;
  max-width: 300px !important;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.9)) !important;
  border: 1px solid rgba(102, 126, 234, 0.08) !important;
  backdrop-filter: blur(8px) !important;
  -webkit-backdrop-filter: blur(8px) !important;

  .image-container {
    width: 100%;

    .generated-image {
      width: 100%;
      max-width: 276px;
      border-radius: 16px;
      box-shadow:
        0 8px 24px rgba(0, 0, 0, 0.12),
        0 4px 8px rgba(102, 126, 234, 0.08),
        inset 0 1px 0 rgba(255, 255, 255, 0.8);
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
      border: 1px solid rgba(255, 255, 255, 0.5);

      &:hover {
        transform: translateY(-2px);
        box-shadow:
          0 16px 40px rgba(0, 0, 0, 0.15),
          0 8px 16px rgba(102, 126, 234, 0.1),
          inset 0 1px 0 rgba(255, 255, 255, 0.9);
      }

      &:active {
        transform: translateY(-1px) scale(0.98);
        box-shadow:
          0 8px 24px rgba(0, 0, 0, 0.12),
          0 4px 8px rgba(102, 126, 234, 0.08);
      }
    }

    .image-prompt {
      margin-top: 12px;
      padding: 10px 14px;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.06), rgba(118, 75, 162, 0.04));
      border-radius: 12px;
      border-left: 3px solid #667eea;
      border: 1px solid rgba(102, 126, 234, 0.1);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);

      .prompt-text {
        font-size: 12px;
        color: #4a5568;
        line-height: 1.5;
        font-weight: 500;

        &::before {
          content: '💭 ';
          opacity: 0.7;
        }
      }
    }
  }
}

/* 新的动画效果 */
@keyframes overlayFadeIn {
  0% {
    opacity: 0;
    backdrop-filter: blur(0px) saturate(100%);
    -webkit-backdrop-filter: blur(0px) saturate(100%);
  }

  100% {
    opacity: 1;
    backdrop-filter: blur(12px) saturate(180%);
    -webkit-backdrop-filter: blur(12px) saturate(180%);
  }
}

@keyframes modalSlideInImproved {
  0% {
    opacity: 0;
    transform: translateY(-32px) scale(0.88);
    filter: blur(4px);
  }

  50% {
    opacity: 0.8;
    transform: translateY(-8px) scale(0.96);
    filter: blur(2px);
  }

  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0px);
  }
}

@keyframes loadingPulse {
  0%,
  100% {
    box-shadow:
      0 8px 24px rgba(102, 126, 234, 0.25),
      0 4px 12px rgba(118, 75, 162, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }

  50% {
    box-shadow:
      0 12px 32px rgba(102, 126, 234, 0.35),
      0 8px 20px rgba(118, 75, 162, 0.25),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
  }
}

@keyframes badgeSparkle {
  0%,
  70%,
  100% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
    box-shadow:
      0 2px 8px rgba(255, 107, 107, 0.3),
      0 0 0 2px rgba(255, 255, 255, 0.9);
  }

  15% {
    opacity: 0.8;
    transform: scale(1.1) rotate(12deg);
    box-shadow:
      0 4px 16px rgba(255, 107, 107, 0.5),
      0 0 0 2px rgba(255, 255, 255, 1),
      0 0 20px rgba(255, 107, 107, 0.2);
  }

  30% {
    opacity: 1;
    transform: scale(1.05) rotate(-8deg);
    box-shadow:
      0 3px 12px rgba(254, 202, 87, 0.4),
      0 0 0 2px rgba(255, 255, 255, 0.95),
      0 0 15px rgba(254, 202, 87, 0.3);
  }

  50% {
    opacity: 0.9;
    transform: scale(0.95) rotate(5deg);
    box-shadow:
      0 2px 8px rgba(255, 107, 107, 0.3),
      0 0 0 2px rgba(255, 255, 255, 0.9);
  }
}

@keyframes modalSlideIn {
  0% {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }

  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 视频生成弹窗样式 */
.video-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(138, 43, 226, 0.12), rgba(218, 112, 214, 0.08));
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  backdrop-filter: blur(12px) saturate(180%);
  -webkit-backdrop-filter: blur(12px) saturate(180%);
  animation: overlayFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.video-modal {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 24px;
  width: 100%;
  max-width: 420px;
  max-height: 85vh;
  overflow: hidden;
  box-shadow:
    0 32px 64px rgba(138, 43, 226, 0.15),
    0 0 0 1px rgba(255, 255, 255, 0.8),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.2);
  animation: modalSlideInImproved 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 80px;
    background: linear-gradient(135deg, #8a2be2 0%, #da70d6 100%);
    opacity: 0.06;
    border-radius: 24px 24px 0 0;
  }

  .modal-header {
    .modal-title {
      background: linear-gradient(135deg, #8a2be2 0%, #da70d6 100%);
      background-clip: text;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;

      &::before {
        content: '🎬';
        margin-right: 8px;
        font-size: 18px;
        -webkit-text-fill-color: initial;
      }
    }
  }

  .feature-info {
    margin: 16px 0;
    padding: 12px 16px;
    background: linear-gradient(135deg, rgba(255, 193, 7, 0.08), rgba(255, 152, 0, 0.05));
    border-radius: 12px;
    border-left: 3px solid #ffc107;
    border: 1px solid rgba(255, 193, 7, 0.2);

    .info-text {
      font-size: 13px;
      color: #ff8f00;
      font-weight: 500;
      line-height: 1.4;
    }
  }
}

/* 视频消息样式 */
.video-bubble {
  padding: 12px !important;
  max-width: 320px !important;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.9)) !important;
  border: 1px solid rgba(138, 43, 226, 0.08) !important;
  backdrop-filter: blur(8px) !important;
  -webkit-backdrop-filter: blur(8px) !important;

  .video-container {
    width: 100%;

    .generated-video {
      width: 100%;
      max-width: 296px;
      height: 200px;
      border-radius: 16px;
      box-shadow:
        0 8px 24px rgba(0, 0, 0, 0.12),
        0 4px 8px rgba(138, 43, 226, 0.08),
        inset 0 1px 0 rgba(255, 255, 255, 0.8);
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      border: 1px solid rgba(255, 255, 255, 0.5);
      object-fit: cover;

      &:hover {
        transform: translateY(-2px);
        box-shadow:
          0 16px 40px rgba(0, 0, 0, 0.15),
          0 8px 16px rgba(138, 43, 226, 0.1),
          inset 0 1px 0 rgba(255, 255, 255, 0.9);
      }

      &:active {
        transform: translateY(-1px) scale(0.98);
        box-shadow:
          0 8px 24px rgba(0, 0, 0, 0.12),
          0 4px 8px rgba(138, 43, 226, 0.08);
      }
    }

    .video-prompt {
      margin-top: 12px;
      padding: 10px 14px;
      background: linear-gradient(135deg, rgba(138, 43, 226, 0.06), rgba(218, 112, 214, 0.04));
      border-radius: 12px;
      border-left: 3px solid #8a2be2;
      border: 1px solid rgba(138, 43, 226, 0.1);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);

      .prompt-text {
        font-size: 12px;
        color: #4a5568;
        line-height: 1.5;
        font-weight: 500;

        &::before {
          content: '🎬 ';
          opacity: 0.7;
        }
      }
    }
  }
}

/* 视频按钮闪烁动画 */
@keyframes videoBadgeSparkle {
  0%,
  70%,
  100% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
    box-shadow:
      0 2px 8px rgba(138, 43, 226, 0.3),
      0 0 0 2px rgba(255, 255, 255, 0.9);
  }

  15% {
    opacity: 0.8;
    transform: scale(1.1) rotate(12deg);
    box-shadow:
      0 4px 16px rgba(138, 43, 226, 0.5),
      0 0 0 2px rgba(255, 255, 255, 1),
      0 0 20px rgba(138, 43, 226, 0.2);
  }

  35% {
    opacity: 1;
    transform: scale(1.05) rotate(-8deg);
    box-shadow:
      0 3px 12px rgba(218, 112, 214, 0.4),
      0 0 0 2px rgba(255, 255, 255, 0.95),
      0 0 15px rgba(218, 112, 214, 0.3);
  }

  55% {
    opacity: 0.9;
    transform: scale(0.95) rotate(5deg);
    box-shadow:
      0 2px 8px rgba(138, 43, 226, 0.3),
      0 0 0 2px rgba(255, 255, 255, 0.9);
  }
}

/* 进度条闪烁动画 */
@keyframes progressShimmer {
  0% {
    transform: translateX(-100%);
    opacity: 0.6;
  }

  50% {
    transform: translateX(0);
    opacity: 1;
  }

  100% {
    transform: translateX(100%);
    opacity: 0.6;
  }
}

/* 顶部右侧动作按钮样式 */
.nav-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.nav-action {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.25);
}
</style>
