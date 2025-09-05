<template>
  <view class="chat-container">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar">
      <view class="navbar-content">
        <view class="navbar-left" @click="goBack">
          <u-icon name="arrow-left" color="#ffffff" :size="20"></u-icon>
        </view>
        <view class="navbar-title">AI客服</view>
        <view class="navbar-right">
          <u-icon name="more-dot-fill" color="#ffffff" :size="20"></u-icon>
        </view>
      </view>
    </view>

    <!-- 聊天内容区域 -->
    <scroll-view
      scroll-y
      class="chat-content"
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
              <view class="message-bubble ai-bubble">
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
    <view v-if="showEmojiPanel" class="emoji-panel">
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

    <!-- 快捷回复 -->
    <view v-if="showQuickReplies" class="quick-replies">
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
    <view class="input-container">
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
          <view class="send-btn" :class="{ active: inputText.trim() }" @click="sendMessage">
            <text class="send-text">发送</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue';
import tokenManager from '@/utils/tokenManager.js';
import io from 'socket.io-client';

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
const userInfo = ref({});
const currentSessionId = ref(null);
const userId = ref(null);
const isLoadingHistory = ref(false);
const hasMoreHistory = ref(true);
const currentPage = ref(1);
const pageSize = 20;
const refresherTriggered = ref(false);
const apiBaseUrl = getApiBaseUrl();
const quickReplies = reactive(['账户问题', '支付相关', '视频播放', '会员服务', '技术支持', '其他问题']);
const aiReplies = reactive({
  账户问题: '关于账户问题，我可以帮您解决登录、注册、密码重置等相关问题。请详细描述您遇到的具体情况。',
  支付相关: '支付问题我来帮您！我们支持微信支付、支付宝等多种支付方式。如遇到支付失败，请检查网络连接或联系客服。',
  视频播放: '视频播放遇到问题了吗？请尝试：1.检查网络连接 2.清除缓存 3.重启应用。如仍有问题请告诉我详细情况。',
  会员服务: '关于会员服务，我们提供月度、季度、年度会员套餐。会员可享受无广告观看、高清画质、专属内容等特权。',
  技术支持: '技术问题我来协助！请描述您遇到的具体技术问题，比如应用崩溃、功能异常等，我会尽力帮您解决。',
  其他问题: '请详细描述您遇到的问题，我会认真为您解答。您也可以通过意见反馈功能向我们提交建议。',
});
const emojiList = reactive([
  { char: '😊', name: '微笑' },
  { char: '😄', name: '开心' },
  { char: '🥰', name: '爱心' },
  { char: '😘', name: '飞吻' },
  { char: '🤔', name: '思考' },
  { char: '😅', name: '汗' },
  { char: '😂', name: '笑哭' },
  { char: '🥺', name: '可怜' },
  { char: '😭', name: '哭泣' },
  { char: '😤', name: '生气' },
  { char: '🤗', name: '拥抱' },
  { char: '👍', name: '赞' },
  { char: '👎', name: '踩' },
  { char: '👌', name: 'OK' },
  { char: '✌️', name: '胜利' },
  { char: '🤝', name: '握手' },
  { char: '👏', name: '鼓掌' },
  { char: '🙏', name: '祈祷' },
  { char: '❤️', name: '红心' },
  { char: '💔', name: '心碎' },
  { char: '💯', name: '100分' },
  { char: '🔥', name: '火' },
  { char: '⭐', name: '星星' },
  { char: '🎉', name: '庆祝' },
]);
let typingTimer = null;
let recordingTimer = null;
let recognition = null;

onMounted(() => {
  // 获取用户信息
  userInfo.value = tokenManager.getUserInfo();
  if (!userInfo.value || !userInfo.value.id) {
    userId.value = 'anonymous_' + Date.now();
  } else {
    userId.value = userInfo.value.id;
  }

  // 初始化Socket.IO客户端
  socket.value = io(`${apiBaseUrl}/chat`, {
    query: {
      userId: userId.value,
      sessionId: currentSessionId.value || 'temp_' + Date.now(),
    },
    transports: ['websocket'],
  });

  socket.value.on('connect', () => {
    console.log('Socket.IO connected');
    // 尝试加载历史消息
    loadHistoryMessages();
  });

  socket.value.on('message', data => {
    if (data.type === 'ai') {
      const aiMessage = {
        type: 'ai',
        content: data.content,
        time: formatTime(new Date(data.timestamp)),
        id: data.id,
      };
      messageList.value.push(aiMessage);
      simulateStreamResponse(aiMessage, data.content);
    } else if (data.type === 'user') {
      const userMessage = {
        type: 'user',
        content: data.content,
        time: formatTime(new Date(data.timestamp)),
        id: data.id,
        userId: data.userId,
        userInfo: data.userInfo,
      };
      messageList.value.push(userMessage);
      showQuickReplies.value = false;
      nextTick(() => scrollToBottom());
    }
  });

  socket.value.on('typing', isTyping => {
    isTyping.value = isTyping;
  });

  socket.value.on('error', error => {
    console.error('Socket.IO error:', error);
    uni.showToast({ title: '连接失败，请稍后重试', icon: 'none' });
    socket.value.disconnect();
  });

  socket.value.on('disconnect', () => {
    console.log('Socket.IO disconnected');
    // 尝试重新连接
    setTimeout(() => {
      socket.value = io(`${apiBaseUrl}/chat`, {
        query: {
          userId: userId.value,
          sessionId: currentSessionId.value || 'temp_' + Date.now(),
        },
        transports: ['websocket'],
      });
      socket.value.on('connect', () => {
        console.log('Socket.IO reconnected');
        loadHistoryMessages();
      });
    }, 5000);
  });

  // 监听用户信息更新
  uni.$on('userInfoUpdated', handleUserInfoUpdate);
  scrollToBottom();
});

onUnmounted(() => {
  uni.$off('userInfoUpdated', handleUserInfoUpdate);
  if (typingTimer) {
    clearTimeout(typingTimer);
    typingTimer = null;
  }
  if (socket.value) {
    socket.value.disconnect();
  }
});

function getApiBaseUrl() {
  // #ifdef H5
  return '';
  // #endif
  // #ifdef MP-WEIXIN || MP-ALIPAY || MP-BAIDU || MP-TOUTIAO
  return 'http://localhost:3000';
  // #endif
  // #ifdef APP-PLUS
  return 'http://localhost:3000';
  // #endif
  return '';
}

async function initUserInfo() {
  try {
    userInfo.value = tokenManager.getUserInfo();
    if (userInfo.value && userInfo.value.id) {
      userId.value = userInfo.value.id;
      console.log('获取用户信息成功:', userInfo.value);
    } else {
      console.warn('未找到登录用户信息');
      userId.value = 'anonymous_' + Date.now();
    }
  } catch (error) {
    console.error('初始化用户信息失败:', error);
    userId.value = 'anonymous_' + Date.now();
  }
}

function refreshUserInfo() {
  try {
    const latestUserInfo = tokenManager.getUserInfo();
    if (latestUserInfo && latestUserInfo.id) {
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
}

function handleUserInfoUpdate(updatedUserInfo) {
  console.log('收到用户信息更新事件:', updatedUserInfo);
  if (updatedUserInfo && updatedUserInfo.id) {
    userInfo.value = updatedUserInfo;
    userId.value = updatedUserInfo.id;
    console.log('聊天页面用户信息已同步更新:', userInfo.value);
  }
}

async function initChatSession() {
  try {
    const savedSessionId = uni.getStorageSync('currentChatSession');
    if (savedSessionId) {
      const isValid = await validateSession(savedSessionId);
      if (isValid) {
        currentSessionId.value = savedSessionId;
        console.log('恢复现有会话:', savedSessionId);
        return;
      }
    }
    await createNewSession();
  } catch (error) {
    console.error('初始化会话失败:', error);
    currentSessionId.value = 'temp_' + Date.now();
  }
}

async function createNewSession() {
  try {
    const response = await uni.request({
      url: `${apiBaseUrl}/api/ai/session/create`,
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: {
        userId: userId.value,
        sessionData: { title: '新的对话', platform: 'mobile' },
      },
    });
    if (response.statusCode === 200 && response.data && response.data.success) {
      currentSessionId.value = response.data.sessionId;
      uni.setStorageSync('currentChatSession', currentSessionId.value);
      console.log('创建新会话成功:', currentSessionId.value);
    } else {
      throw new Error(response.data?.error || '创建会话失败');
    }
  } catch (error) {
    console.error('创建会话失败:', error);
    currentSessionId.value = 'temp_' + Date.now();
  }
}

async function validateSession(sessionId) {
  try {
    const response = await uni.request({
      url: `${apiBaseUrl}/api/ai/session/${sessionId}/stats`,
      method: 'GET',
    });
    return response.statusCode === 200 && response.data && response.data.success;
  } catch (error) {
    return false;
  }
}

async function loadHistoryMessages(options = {}) {
  const { fromUserScroll = false } = options;
  if (!currentSessionId.value || isLoadingHistory.value || !hasMoreHistory.value) {
    return;
  }
  try {
    isLoadingHistory.value = true;
    const response = await uni.request({
      url: `${apiBaseUrl}/api/ai/session/${currentSessionId.value}/messages`,
      method: 'GET',
      data: { page: currentPage.value, pageSize: pageSize },
    });
    if (response.statusCode === 200 && response.data && response.data.success) {
      const { messages, hasMore } = response.data;
      if (messages && messages.length > 0) {
        const sorted = messages
          .slice()
          .sort((a, b) => new Date(a.timestamp || a.createdAt) - new Date(b.timestamp || b.createdAt));
        const historyMessages = sorted.map(msg => ({
          type: msg.type,
          content: msg.content,
          time: formatTime(new Date(msg.timestamp || msg.createdAt)),
          id: msg.id,
        }));
        if (currentPage.value === 1 && !fromUserScroll) {
          messageList.value = historyMessages;
          nextTick(() => scrollToBottom());
        } else {
          messageList.value = [...historyMessages, ...messageList.value];
        }
        currentPage.value++;
        hasMoreHistory.value = hasMore;
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
}

function onScroll(e) {
  scrollTop.value = e?.detail?.scrollTop ?? 0;
}

async function onScrollToUpper() {
  if (isLoadingHistory.value || !hasMoreHistory.value) return;
  const currentScrollTop = scrollTop.value;
  await loadHistoryMessages({ fromUserScroll: true });
  nextTick(() => {
    if (messageList.value.length > 0) {
      scrollTop.value = currentScrollTop + 100;
    }
  });
}

async function onRefresherRefresh() {
  if (isLoadingHistory.value || !hasMoreHistory.value) {
    refresherTriggered.value = false;
    if (!hasMoreHistory.value) uni.showToast({ title: '没有更多历史了', icon: 'none' });
    return;
  }
  refresherTriggered.value = true;
  try {
    await loadHistoryMessages({ fromUserScroll: true });
  } catch (e) {
    console.error('下拉刷新加载历史失败:', e);
    uni.showToast({ title: '加载失败，请稍后重试', icon: 'none' });
  } finally {
    setTimeout(() => {
      refresherTriggered.value = false;
    }, 400);
  }
}

function goBack() {
  uni.navigateBack();
}

async function sendMessage() {
  if (!inputText.value.trim() || isSending.value) return;
  isSending.value = true;
  const userMessage = {
    type: 'user',
    content: inputText.value.trim(),
    time: getCurrentTime(),
    id: Date.now().toString(),
    userId: userId.value,
    userInfo: userInfo.value,
  };
  messageList.value.push(userMessage);
  showQuickReplies.value = false;
  const userInput = inputText.value.trim();
  inputText.value = '';
  nextTick(() => scrollToBottom());
  isTyping.value = true;
  try {
    await getAIReplyWithContext(userInput);
  } catch (error) {
    console.error('AI回复失败:', error);
    fallbackToLocalReply(userInput);
  } finally {
    isSending.value = false;
  }
}

function sendQuickReply(reply) {
  inputText.value = reply;
  sendMessage();
}

async function getAIReplyWithContext(userInput) {
  try {
    if (!currentSessionId.value) await createNewSession();
    const response = await uni.request({
      url: `${apiBaseUrl}/api/ai/chat-with-context`,
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
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
      const aiMessage = {
        type: 'ai',
        content: '',
        time: getCurrentTime(),
        id: response.data.message?.id || Date.now().toString(),
      };
      messageList.value.push(aiMessage);
      simulateStreamResponse(aiMessage, aiContent);
    } else {
      throw new Error(response.data?.error || 'AI服务响应异常');
    }
  } catch (error) {
    console.error('带上下文的AI回复失败:', error);
    isTyping.value = false;
    throw error;
  }
}

function simulateStreamResponse(aiMessage, fullContent) {
  if (aiMessage.typingInterval) {
    clearInterval(aiMessage.typingInterval);
    delete aiMessage.typingInterval;
  }
  if (!fullContent || fullContent.trim() === '') {
    fullContent = '抱歉，我现在无法回答您的问题，请稍后再试。';
  }
  let currentIndex = 0;
  const chars = fullContent.split('');
  const displayInterval = setInterval(() => {
    if (currentIndex < chars.length) {
      const currentContent = chars.slice(0, currentIndex + 1).join('');
      const msgIndex = messageList.value.findIndex(msg => msg.id === aiMessage.id);
      if (msgIndex !== -1) {
        messageList.value[msgIndex].content = currentContent;
      }
      currentIndex++;
      nextTick(() => scrollToBottom());
    } else {
      clearInterval(displayInterval);
    }
  }, 80);
}

function getLocalAIReply(userInput) {
  isTyping.value = false;
  let replyContent = '';
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
    const responses = [
      '我理解您的问题，让我为您详细解答...',
      '这是一个很好的问题，根据我的了解...',
      '关于这个问题，我建议您可以尝试以下方法...',
      '感谢您的咨询，针对您提到的情况...',
    ];
    replyContent = responses[Math.floor(Math.random() * responses.length)];
  }
  const aiMessage = {
    type: 'ai',
    content: '',
    time: getCurrentTime(),
  };
  messageList.value.push(aiMessage);
  simulateStreamResponse(aiMessage, replyContent);
}

function scrollToBottom() {
  nextTick(() => {
    scrollTop.value = 999999;
  });
}

function onInputFocus() {
  showQuickReplies.value = false;
  showEmojiPanel.value = false;
  setTimeout(() => scrollToBottom(), 300);
}

function onInputBlur() {
  if (messageList.value.length <= 2) {
    showQuickReplies.value = true;
  }
}

async function startRecording() {
  if (isRecording.value) return;
  try {
    // #ifdef H5
    await navigator.mediaDevices.getUserMedia({ audio: true });
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
  inputText.value = '';
  recordingTimer = setInterval(() => {
    recordingTime.value++;
    if (recordingTime.value >= 60) {
      stopRecording();
    }
  }, 1000);
  uni.vibrateShort && uni.vibrateShort();
  startVoiceRecognition();
}

function stopRecording() {
  if (!isRecording.value) return;
  if (recognition) {
    recognition.stop();
    return;
  }
  isRecording.value = false;
  if (recordingTimer) {
    clearInterval(recordingTimer);
    recordingTimer = null;
  }
  if (recordingTime.value < 1) {
    uni.showToast({ title: '录音时间太短', icon: 'none' });
  }
}

function cancelRecording() {
  isRecording.value = false;
  recordingTime.value = 0;
  voiceText.value = '';
  if (recordingTimer) {
    clearInterval(recordingTimer);
    recordingTimer = null;
  }
}

function startVoiceRecognition() {
  // #ifdef H5
  startWebSpeechRecognition();
  // #endif
}

function startWebSpeechRecognition() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    uni.showToast({ title: '浏览器不支持语音识别', icon: 'none' });
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
    inputText.value = finalTranscript || interimTranscript;
  };
  recognition.onend = () => {
    isRecording.value = false;
    if (recordingTimer) {
      clearInterval(recordingTimer);
      recordingTimer = null;
    }
    if (inputText.value.trim()) {
      uni.showToast({ title: '语音识别完成', icon: 'success', duration: 1000 });
    }
  };
  recognition.onerror = event => {
    console.error('语音识别错误:', event.error);
    cancelRecording();
    uni.showToast({ title: '语音识别失败', icon: 'none' });
  };
  try {
    recognition.start();
  } catch (error) {
    console.error('启动语音识别失败:', error);
    cancelRecording();
    uni.showToast({ title: '无法启动语音识别', icon: 'none' });
  }
}

function toggleEmojiPanel() {
  showEmojiPanel.value = !showEmojiPanel.value;
  if (showEmojiPanel.value) {
    showQuickReplies.value = false;
  }
}

function selectEmoji(emoji) {
  inputText.value += emoji.char;
}

function getCurrentTime() {
  return formatTime(new Date());
}

function formatTime(date) {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function fallbackToLocalReply(userInput) {
  isTyping.value = false;
  setTimeout(() => {
    getLocalAIReply(userInput);
  }, 1000);
}
</script>

<style lang="scss" scoped>
.chat-container {
  height: 100vh;
  background-color: #f5f7fa;
  display: flex;
  flex-direction: column;
}

/* 自定义导航栏 */
.custom-navbar {
  position: sticky;
  top: 0;
  z-index: 999;
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
  padding: 10px 15px;
  background: #ffffff;
  border-top: 1px solid #f0f0f0;

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
  background: #ffffff;
  border-top: 1px solid #f0f0f0;
  height: 200px;
  animation: slideUpIn 0.3s ease-out;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);

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
  background: #ffffff;
  border-top: 1px solid #f0f0f0;
  padding: 10px 15px;
  padding-bottom: calc(10px + env(safe-area-inset-bottom));

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
</style>
