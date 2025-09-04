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
            :style="{ animationDelay: (index * 0.1) + 's' }"
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
            <view 
              v-for="(emoji, index) in emojiList" 
              :key="index"
              class="emoji-item"
              @click="selectEmoji(emoji)"
            >
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
            <view 
              class="emoji-btn"
              :class="{ active: showEmojiPanel }"
              @click="toggleEmojiPanel"
            >
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
            <view 
              class="send-btn" 
              :class="{ active: inputText.trim() }"
              @click="sendMessage"
            >
              <text class="send-text">发送</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </template>
  
  <script>
  import authService from '@/utils/authService.js'
  
  export default {
    name: 'ChatAi',
    data() {
      return {
        inputText: '',
        messageList: [],
        scrollTop: 0,
        isTyping: false,
        showQuickReplies: true,
        isSending: false, // 控制发送状态
        canSend: false, // 控制发送按钮激活状态
        isRecording: false, // 语音录制状态
        recordingTime: 0, // 录制时长
        voiceText: '', // 语音转文字结果
        showEmojiPanel: false, // 表情面板显示状态
        
        // 用户信息
        userInfo: null, // 当前用户信息
        
        // 会话管理相关
        currentSessionId: null, // 当前会话ID
        userId: null, // 真实用户ID，从authService获取
        isLoadingHistory: false, // 是否正在加载历史消息
        hasMoreHistory: true, // 是否还有更多历史消息
        currentPage: 1, // 当前页码
        pageSize: 20, // 每页消息数
        
        // 下拉刷新（scroll-view 原生能力）
        refresherTriggered: false,
        
        // API基础URL配置
        apiBaseUrl: this.getApiBaseUrl(),
        quickReplies: [
          '账户问题',
          '支付相关',
          '视频播放',
          '会员服务',
          '技术支持',
          '其他问题'
        ],
        // AI回复模板
        aiReplies: {
          '账户问题': '关于账户问题，我可以帮您解决登录、注册、密码重置等相关问题。请详细描述您遇到的具体情况。',
          '支付相关': '支付问题我来帮您！我们支持微信支付、支付宝等多种支付方式。如遇到支付失败，请检查网络连接或联系客服。',
          '视频播放': '视频播放遇到问题了吗？请尝试：1.检查网络连接 2.清除缓存 3.重启应用。如仍有问题请告诉我详细情况。',
          '会员服务': '关于会员服务，我们提供月度、季度、年度会员套餐。会员可享受无广告观看、高清画质、专属内容等特权。',
          '技术支持': '技术问题我来协助！请描述您遇到的具体技术问题，比如应用崩溃、功能异常等，我会尽力帮您解决。',
          '其他问题': '请详细描述您遇到的问题，我会认真为您解答。您也可以通过意见反馈功能向我们提交建议。'
        },
        // 表情列表
        emojiList: [
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
          { char: '🎉', name: '庆祝' }
        ]
      }
    },
    async onLoad() {
      // 初始化用户信息
      await this.initUserInfo();
      // 初始化聊天会话
      await this.initChatSession();
      // 首次进入不加载历史，等待用户上拉触顶后再按需加载
      // await this.loadHistoryMessages();
      
      // 监听用户信息更新事件
      uni.$on('userInfoUpdated', this.handleUserInfoUpdate);
    },
    onShow() {
      // 刷新用户信息，确保获取最新数据
      this.refreshUserInfo();
      
      // 页面显示时不清空消息，保持会话连续性
      // 只重置UI状态
      this.showQuickReplies = this.messageList.length === 0;
      this.isTyping = false;
      this.showEmojiPanel = false;
      
      // 清除所有定时器
      if (this.typingTimer) {
        clearTimeout(this.typingTimer);
        this.typingTimer = null;
      }
    },
  
    onReady() {
      this.scrollToBottom();
    },
    
    onUnload() {
      // 移除事件监听器
      uni.$off('userInfoUpdated', this.handleUserInfoUpdate);
    },
    methods: {
      // 获取API基础URL
      getApiBaseUrl() {
        // #ifdef H5
        // H5环境下使用代理
        return '';
        // #endif
        
        // #ifdef MP-WEIXIN || MP-ALIPAY || MP-BAIDU || MP-TOUTIAO
        // 小程序环境下使用完整URL
        return 'http://localhost:3000';
        // #endif
        
        // #ifdef APP-PLUS
        // App环境下使用完整URL  
        return 'http://localhost:3000';
        // #endif
        
        // 默认值
        return '';
      },
      
      // 初始化用户信息
      async initUserInfo() {
        try {
          // 从authService获取当前用户信息
          this.userInfo = authService.getCurrentUser();
          
          if (this.userInfo && this.userInfo.id) {
            this.userId = this.userInfo.id;
            console.log('获取用户信息成功:', this.userInfo);
          } else {
            // 如果没有登录用户，使用默认用户或跳转登录
            console.warn('未找到登录用户信息');
            // 可以选择跳转到登录页面或使用临时用户
            this.userId = 'anonymous_' + Date.now();
          }
        } catch (error) {
          console.error('初始化用户信息失败:', error);
          // 降级处理：使用临时用户ID
          this.userId = 'anonymous_' + Date.now();
        }
       },
       
       // 刷新用户信息
       refreshUserInfo() {
         try {
           const latestUserInfo = authService.getCurrentUser();
           if (latestUserInfo && latestUserInfo.id) {
             // 检查用户信息是否有变化
             const hasChanged = !this.userInfo || 
               this.userInfo.id !== latestUserInfo.id ||
               this.userInfo.nickname !== latestUserInfo.nickname ||
               this.userInfo.avatar !== latestUserInfo.avatar;
               
             if (hasChanged) {
               this.userInfo = latestUserInfo;
               this.userId = latestUserInfo.id;
               console.log('用户信息已更新:', this.userInfo);
             }
           }
         } catch (error) {
           console.error('刷新用户信息失败:', error);
         }
       },
       
       // 处理用户信息更新事件
       handleUserInfoUpdate(updatedUserInfo) {
         console.log('收到用户信息更新事件:', updatedUserInfo);
         if (updatedUserInfo && updatedUserInfo.id) {
           this.userInfo = updatedUserInfo;
           this.userId = updatedUserInfo.id;
           console.log('聊天页面用户信息已同步更新:', this.userInfo);
         }
       },
  
      // 初始化聊天会话
      async initChatSession() {
        try {
          // 尝试从本地存储获取现有会话ID
          const savedSessionId = uni.getStorageSync('currentChatSession');
          
          if (savedSessionId) {
            // 验证会话是否还有效
            const isValid = await this.validateSession(savedSessionId);
            if (isValid) {
              this.currentSessionId = savedSessionId;
              console.log('恢复现有会话:', savedSessionId);
              return;
            }
          }
          
          // 创建新会话
          await this.createNewSession();
        } catch (error) {
          console.error('初始化会话失败:', error);
          // 降级处理：使用临时会话ID
          this.currentSessionId = 'temp_' + Date.now();
        }
      },
  
      // 创建新会话
      async createNewSession() {
        try {
          const response = await uni.request({
            url: `${this.apiBaseUrl}/api/ai/session/create`,
            method: 'POST',
            header: {
              'Content-Type': 'application/json'
            },
            data: {
              userId: this.userId,
              sessionData: {
                title: '新的对话',
                platform: 'mobile'
              }
            }
          });
  
          if (response.statusCode === 200 && response.data && response.data.success) {
            this.currentSessionId = response.data.sessionId;
            // 保存到本地存储
            uni.setStorageSync('currentChatSession', this.currentSessionId);
            console.log('创建新会话成功:', this.currentSessionId);
          } else {
            throw new Error(response.data?.error || '创建会话失败');
          }
        } catch (error) {
          console.error('创建会话失败:', error);
          console.error('错误详情:', {
            message: error.message,
            response: error.response || error.data,
            status: error.statusCode || error.status
          });
          // 使用临时会话ID
          this.currentSessionId = 'temp_' + Date.now();
        }
      },
  
      // 验证会话有效性
      async validateSession(sessionId) {
        try {
          const response = await uni.request({
            url: `${this.apiBaseUrl}/api/ai/session/${sessionId}/stats`,
            method: 'GET'
          });
  
          return response.statusCode === 200 && response.data && response.data.success;
        } catch (error) {
          return false;
        }
      },
  
      // 加载历史消息
      async loadHistoryMessages(options = {}) {
        const { fromUserScroll = false } = options;
        if (!this.currentSessionId || this.isLoadingHistory || !this.hasMoreHistory) {
          return;
        }

        try {
          this.isLoadingHistory = true;
          
          const response = await uni.request({
            url: `${this.apiBaseUrl}/api/ai/session/${this.currentSessionId}/messages`,
            method: 'GET',
            data: {
              page: this.currentPage,
              pageSize: this.pageSize
            }
          });

          if (response.statusCode === 200 && response.data && response.data.success) {
            const { messages, hasMore } = response.data;
            
            if (messages && messages.length > 0) {
              const isInitialPage = this.currentPage === 1;
              // 统一按时间升序（旧->新）排序，避免接口返回顺序不一致导致渲染反序
              const sorted = messages.slice().sort((a, b) => new Date(a.timestamp || a.createdAt) - new Date(b.timestamp || b.createdAt));
              const historyMessages = sorted.map(msg => ({
                type: msg.type,
                content: msg.content,
                time: this.formatTime(new Date(msg.timestamp || msg.createdAt)),
                id: msg.id
              }));

              if (isInitialPage && !fromUserScroll) {
                // 页面初次自动加载（当前已禁用），如启用则进入底部
                this.messageList = historyMessages;
                this.$nextTick(() => this.scrollToBottom());
              } else {
                // 用户上拉触顶加载或后续分页，前置拼接
                this.messageList = [...historyMessages, ...this.messageList];
              }

              this.currentPage++;
              this.hasMoreHistory = hasMore;
              
              console.log(`加载了${messages.length}条历史消息`);
            } else {
              this.hasMoreHistory = false;
            }
          }
        } catch (error) {
          console.error('加载历史消息失败:', error);
          this.hasMoreHistory = false;
        } finally {
          this.isLoadingHistory = false;
        }
      },
  
      // 监听滚动，实时记录 scrollTop
      onScroll(e) {
        const top = e?.detail?.scrollTop ?? 0;
        this.scrollTop = top;
      },

      // 手动点击加载历史（当内容不足以触发触顶或下拉刷新时）
      async manualLoadHistory() {
        if (this.isLoadingHistory || !this.hasMoreHistory) return;
        try {
          await this.loadHistoryMessages({ fromUserScroll: true });
        } catch (err) {
          console.error('手动加载历史失败:', err);
          uni.showToast({ title: '加载失败，请稍后重试', icon: 'none' });
        }
      },

      // 返回上一页
      goBack() {
        uni.navigateBack();
      },
  
      // 发送消息（更新为使用会话上下文）
      async sendMessage() {
        if (!this.inputText.trim() || this.isSending) return;
        
        this.isSending = true;
        
        const userMessage = {
          type: 'user',
          content: this.inputText.trim(),
          time: this.getCurrentTime(),
          id: Date.now().toString(),
          userId: this.userId, // 关联真实用户ID
          userInfo: this.userInfo // 包含用户信息用于显示
        };
        
        this.messageList.push(userMessage);
        this.showQuickReplies = false;
        
        const userInput = this.inputText.trim();
        this.inputText = '';
        
        // 滚动到底部
        this.$nextTick(() => {
          this.scrollToBottom();
        });
        
        // 显示打字效果
        this.isTyping = true;
        
        try {
          // 使用带上下文的AI接口
          await this.getAIReplyWithContext(userInput);
        } catch (error) {
          console.error('AI回复失败:', error);
          // 降级到本地回复
          this.fallbackToLocalReply(userInput);
        } finally {
          this.isSending = false;
        }
      },
  
      // 快捷回复
      sendQuickReply(reply) {
        this.inputText = reply;
        this.sendMessage();
      },
  
      // 获取带上下文的AI回复
      async getAIReplyWithContext(userInput) {
        try {
          if (!this.currentSessionId) {
            await this.createNewSession();
          }
  
          const response = await uni.request({
            url: `${this.apiBaseUrl}/api/ai/chat-with-context`,
            method: 'POST',
            header: {
              'Content-Type': 'application/json'
            },
            data: {
              sessionId: this.currentSessionId,
              userId: this.userId,
              message: userInput,
              model: 'THUDM/GLM-4-9B-0414',
              contextSize: 10
            },
            timeout: 30000
          });
  
          this.isTyping = false;
  
          if (response.statusCode === 200 && response.data && response.data.success) {
            const aiContent = response.data.content;
            
            // 创建AI消息对象
            const aiMessage = {
              type: 'ai',
              content: '',
              time: this.getCurrentTime(),
              id: response.data.message?.id || Date.now().toString()
            };
            
            this.messageList.push(aiMessage);
            
            // 使用流式效果显示AI回复
            this.simulateStreamResponse(aiMessage, aiContent);
          } else {
            throw new Error(response.data?.error || 'AI服务响应异常');
          }
        } catch (error) {
          console.error('带上下文的AI回复失败:', error);
          console.error('错误详情:', {
            message: error.message,
            response: error.response || error.data,
            status: error.statusCode || error.status
          });
          this.isTyping = false;
          throw error;
        }
      },
  
      // 原有的获取AI回复方法（作为备用）
      async getAIReply(userInput) {
        try {
          // 首先尝试使用带上下文的API
          await this.getAIReplyWithContext(userInput);
        } catch (error) {
          console.error('上下文AI回复失败，降级到简单模式:', error);
          
          // 降级到原有的简单AI接口
          const contextMessages = this.getContextMessages(userInput);
          await this.callAIStreamAPI(contextMessages);
        }
      },
  
      // 滚动到顶部时加载更多历史消息
      async onScrollToUpper() {
        if (this.isLoadingHistory || !this.hasMoreHistory) {
          return;
        }
        
        console.log('触发上拉加载历史消息');
        
        const hadMessages = this.messageList && this.messageList.length > 0;
        // 记录当前滚动位置
        const currentScrollTop = this.scrollTop;
        
        await this.loadHistoryMessages({ fromUserScroll: true });
        
        // 加载完成后调整滚动位置，避免跳动（仅在已有消息基础上加载才需要）
        this.$nextTick(() => {
          if (hadMessages) {
            // 保持相对位置
            this.scrollTop = currentScrollTop + 100;
          }
        });
      },
  
      // 下拉刷新触发（scroll-view 原生下拉）
      async onRefresherRefresh() {
        if (this.isLoadingHistory || !this.hasMoreHistory) {
          this.refresherTriggered = false;
          if (!this.hasMoreHistory) {
            uni.showToast({ title: '没有更多历史了', icon: 'none' });
          }
          return;
        }
        this.refresherTriggered = true;
        try {
          await this.loadHistoryMessages({ fromUserScroll: true });
        } catch (e) {
          console.error('下拉刷新加载历史失败:', e);
          uni.showToast({ title: '加载失败，请稍后重试', icon: 'none' });
        } finally {
          // 稍作延迟以展示下拉刷新完成动画
          setTimeout(() => {
            this.refresherTriggered = false;
          }, 400);
        }
      },
  
      // 保存当前会话到本地存储
      saveSessionToLocal() {
        try {
          const sessionData = {
            sessionId: this.currentSessionId,
            userId: this.userId,
            lastUpdated: Date.now()
          };
          uni.setStorageSync('currentChatSession', this.currentSessionId);
          uni.setStorageSync('chatSessionData', sessionData);
        } catch (error) {
          console.error('保存会话到本地失败:', error);
        }
      },
  
      // 从本地存储恢复会话
      restoreSessionFromLocal() {
        try {
          const sessionData = uni.getStorageSync('chatSessionData');
          if (sessionData && sessionData.sessionId) {
            // 检查会话是否在24小时内
            const now = Date.now();
            const lastUpdated = sessionData.lastUpdated || 0;
            const timeDiff = now - lastUpdated;
            const twentyFourHours = 24 * 60 * 60 * 1000;
            
            if (timeDiff < twentyFourHours) {
              this.currentSessionId = sessionData.sessionId;
              this.userId = sessionData.userId;
              return true;
            }
          }
        } catch (error) {
          console.error('从本地恢复会话失败:', error);
        }
        return false;
      },
  
      // 清理过期的本地会话数据
      cleanExpiredLocalSessions() {
        try {
          uni.removeStorageSync('currentChatSession');
          uni.removeStorageSync('chatSessionData');
          uni.removeStorageSync('chatMessages');
          uni.removeStorageSync('messageList');
          uni.removeStorageSync('chatHistory');
        } catch (error) {
          console.error('清理本地会话数据失败:', error);
        }
      },
  
      // 获取对话上下文
      getContextMessages(currentInput) {
        const systemPrompt = {
          role: "system",
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
  - 其他使用问题`
        };
  
        // 获取最近5条对话作为上下文（增加上下文长度）
        const recentMessages = this.messageList.slice(-5).map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content
        }));
  
        // 添加当前用户输入
        const currentMessage = {
          role: 'user',
          content: currentInput
        };
  
        return [systemPrompt, ...recentMessages, currentMessage];
      },
  
      // 调用AI接口 - 使用uni.request
      async callAIStreamAPI(messages) {
        this.isTyping = false;
        
        // 创建AI消息对象
        const aiMessage = {
          type: 'ai',
          content: '',
          time: this.getCurrentTime(),
          id: Date.now() // 添加唯一ID用于调试
        };
        
        this.messageList.push(aiMessage);
        
        // 显示打字效果
        this.showTypingEffect(aiMessage);
        
        return new Promise((resolve, reject) => {
          const apiUrl = `${this.apiBaseUrl}/api/ai/simple-chat`;
          
  
          
          uni.request({
            url: apiUrl,
            method: 'POST',
            header: {
              'Content-Type': 'application/json'
            },
            data: {
              messages: messages,
              model: 'THUDM/GLM-4-9B-0414'
            },
            timeout: 30000,
            success: (res) => {
              if (res.statusCode === 200) {
                // 检查是否有AI回复内容
                let aiContent = res.data?.content || res.data?.message || '';
                
                // 清理内容：去除前后空白字符和换行符
                aiContent = aiContent.trim();
                
                if (aiContent && aiContent.length > 0) {
                  // 模拟流式效果，逐字显示
                  this.simulateStreamResponse(aiMessage, aiContent);
                  resolve(aiContent);
                } else {
                  this.simulateStreamResponse(aiMessage, '抱歉，我现在无法回答您的问题，请稍后再试。');
                  resolve('抱歉，我现在无法回答您的问题，请稍后再试。');
                }
              } else {
                // 移除未完成的AI消息
                const index = this.messageList.indexOf(aiMessage);
                if (index > -1) {
                  this.messageList.splice(index, 1);
                }
                reject(new Error(res.data?.message || 'AI服务响应异常'));
              }
            },
            fail: (error) => {
              // 移除未完成的AI消息
              const index = this.messageList.indexOf(aiMessage);
              if (index > -1) {
                this.messageList.splice(index, 1);
              }
              
              // 显示用户友好的错误提示
              uni.showToast({
                title: 'AI服务暂时不可用',
                icon: 'none',
                duration: 2000
              });
              
              reject(error);
            }
          });
        });
      },
  
      // 显示打字效果
      showTypingEffect(aiMessage) {
        const dots = ['', '.', '..', '...'];
        let dotIndex = 0;
        
        const typingInterval = setInterval(() => {
          const typingText = `正在思考中${dots[dotIndex]}`;
          // 使用Vue.set确保响应式更新
          this.$set(aiMessage, 'content', typingText);
          dotIndex = (dotIndex + 1) % dots.length;
          
          this.$nextTick(() => {
            this.scrollToBottom();
          });
        }, 500);
        
        // 保存定时器ID，用于清除
        aiMessage.typingInterval = typingInterval;
      },
  
              // 模拟流式响应效果
      simulateStreamResponse(aiMessage, fullContent) {
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
            
            // 重建消息数组来更新内容
            const newMessageList = [];
            for (let i = 0; i < this.messageList.length; i++) {
              const msg = this.messageList[i];
              if (msg.id === aiMessage.id) {
                // 更新目标消息的内容
                newMessageList.push({
                  type: 'ai',
                  content: currentContent,
                  time: msg.time,
                  id: msg.id
                });
              } else {
                newMessageList.push(msg);
              }
            }
            
            // 替换整个消息数组
            this.messageList = newMessageList;
            
            currentIndex++;
            
            this.$nextTick(() => {
              this.scrollToBottom();
            });
          } else {
            clearInterval(displayInterval);
          }
        }, 80); // 每80ms显示一个字符，稍微慢一点更有打字效果
      },
  
      // 备用的本地AI回复（当API不可用时使用）
      getLocalAIReply(userInput) {
        this.isTyping = false;
        
        let replyContent = '';
        
        // 根据用户输入匹配回复
        if (userInput.includes('账户') || userInput.includes('登录') || userInput.includes('注册')) {
          replyContent = this.aiReplies['账户问题'];
        } else if (userInput.includes('支付') || userInput.includes('付费') || userInput.includes('充值')) {
          replyContent = this.aiReplies['支付相关'];
        } else if (userInput.includes('视频') || userInput.includes('播放') || userInput.includes('卡顿')) {
          replyContent = this.aiReplies['视频播放'];
        } else if (userInput.includes('会员') || userInput.includes('VIP')) {
          replyContent = this.aiReplies['会员服务'];
        } else if (userInput.includes('技术') || userInput.includes('bug') || userInput.includes('问题')) {
          replyContent = this.aiReplies['技术支持'];
        } else {
          // 默认智能回复
          const responses = [
            '我理解您的问题，让我为您详细解答...',
            '这是一个很好的问题，根据我的了解...',
            '关于这个问题，我建议您可以尝试以下方法...',
            '感谢您的咨询，针对您提到的情况...'
          ];
          replyContent = responses[Math.floor(Math.random() * responses.length)];
        }
        
        // 创建新的AI消息对象
        const aiMessage = {
          type: 'ai',
          content: '',
          time: this.getCurrentTime()
        };
        
        // 添加到消息列表
        this.messageList.push(aiMessage);
        
        // 使用模拟流式效果显示内容
        this.simulateStreamResponse(aiMessage, replyContent);
      },
  
      // 滚动到底部
      scrollToBottom() {
        this.$nextTick(() => {
          this.scrollTop = 999999;
        });
      },
  
      // 输入框获得焦点
      onInputFocus() {
        this.showQuickReplies = false;
        this.showEmojiPanel = false;
        setTimeout(() => {
          this.scrollToBottom();
        }, 300);
      },
  
      // 输入框失去焦点
      onInputBlur() {
        if (this.messageList.length <= 2) {
          this.showQuickReplies = true;
        }
      },
  
      // WebSocket连接管理
      initWebSocket() {
        // 暂时保留HTTP方式，WebSocket可作为未来优化
        // 这里可以添加WebSocket连接逻辑
        console.log('WebSocket功能预留位置');
      },
  
      // 消息压缩（用于大量历史消息）
      compressMessage(message) {
        try {
          // 简单的消息压缩：移除不必要的字段
          return {
            t: message.type,
            c: message.content,
            tm: message.time,
            id: message.id
          };
        } catch (error) {
          return message;
        }
      },
  
      // 消息解压缩
      decompressMessage(compressedMessage) {
        try {
          if (compressedMessage.t !== undefined) {
            return {
              type: compressedMessage.t,
              content: compressedMessage.c,
              time: compressedMessage.tm,
              id: compressedMessage.id
            };
          }
          return compressedMessage;
        } catch (error) {
          return compressedMessage;
        }
      },
  
      // 批量处理消息（性能优化）
      batchProcessMessages(messages) {
        const batchSize = 10;
        const batches = [];
        
        for (let i = 0; i < messages.length; i += batchSize) {
          batches.push(messages.slice(i, i + batchSize));
        }
        
        return batches;
      },
  
      // 懒加载消息渲染（性能优化）
      async lazyRenderMessages(messages) {
        const batches = this.batchProcessMessages(messages);
        
        for (let i = 0; i < batches.length; i++) {
          await new Promise(resolve => {
            setTimeout(() => {
              this.messageList.push(...batches[i]);
              resolve();
            }, i * 50); // 每批次延迟50ms
          });
        }
      },
  
      // 内存管理：清理过多的消息
      manageMemory() {
        const maxMessages = 200; // 最多保留200条消息在内存中
        
        if (this.messageList.length > maxMessages) {
          // 保留最新的消息，移除最旧的
          const messagesToRemove = this.messageList.length - maxMessages;
          this.messageList.splice(0, messagesToRemove);
          console.log(`清理了${messagesToRemove}条旧消息以释放内存`);
        }
      },
  
      // 开始录音
      async startRecording() {
        if (this.isRecording) return;
        
        // 请求麦克风权限
        try {
          // #ifdef H5
          await navigator.mediaDevices.getUserMedia({ audio: true });
          // #endif
        } catch (error) {
          uni.showModal({
            title: '权限申请',
            content: '需要访问您的麦克风才能使用语音输入功能，请在浏览器设置中允许麦克风权限。',
            showCancel: false
          });
          return;
        }
        
        this.isRecording = true;
        this.recordingTime = 0;
        this.inputText = ''; // 清空输入框准备接收语音文字
        
        // 开始录音计时
        this.recordingTimer = setInterval(() => {
          this.recordingTime++;
          if (this.recordingTime >= 60) {
            this.stopRecording();
          }
        }, 1000);
        
        // 触觉反馈
        uni.vibrateShort && uni.vibrateShort();
        
        // 启动真实的语音识别
        this.startVoiceRecognition();
      },
  
      // 停止录音
      stopRecording() {
        if (!this.isRecording) return;
        
        // 如果是Web Speech Recognition，直接停止
        if (this.recognition) {
          this.recognition.stop();
          return;
        }
        
        this.isRecording = false;
        
        if (this.recordingTimer) {
          clearInterval(this.recordingTimer);
          this.recordingTimer = null;
        }
        
        // 检查录音时长
        if (this.recordingTime >= 1) {
          // 根据平台处理语音识别
          // #ifdef MP-WEIXIN
          // 微信小程序会在recorderManager.onStop中处理
          // #endif
          
          // #ifdef APP-PLUS
          // APP环境下的处理
          this.processAppVoiceResult();
          // #endif
          
          // #ifdef H5
          // H5环境下已经在recognition.onresult中处理
          // #endif
        } else {
          uni.showToast({
            title: '录音时间太短',
            icon: 'none'
          });
        }
      },
  
      // 取消录音
      cancelRecording() {
        this.isRecording = false;
        this.recordingTime = 0;
        this.voiceText = '';
        
        if (this.recordingTimer) {
          clearInterval(this.recordingTimer);
          this.recordingTimer = null;
        }
      },
  
      // 开始语音识别
      startVoiceRecognition() {
        // 检查平台并调用相应的语音识别API
        // #ifdef H5
        this.startWebSpeechRecognition();
        // #endif
        
        // #ifdef MP-WEIXIN
        this.startWechatVoiceRecognition();
        // #endif
        
        // #ifdef APP-PLUS
        this.startAppVoiceRecognition();
        // #endif
      },
  
      // H5环境下的语音识别
      startWebSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
          uni.showToast({
            title: '浏览器不支持语音识别',
            icon: 'none'
          });
          this.cancelRecording();
          return;
        }
  
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'zh-CN';
        
        this.recognition.onresult = (event) => {
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
          this.inputText = finalTranscript || interimTranscript;
        };
        
        this.recognition.onend = () => {
          this.isRecording = false;
          if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
          }
          
          if (this.inputText.trim()) {
            uni.showToast({
              title: '语音识别完成',
              icon: 'success',
              duration: 1000
            });
          }
        };
        
        this.recognition.onerror = (event) => {
          console.error('语音识别错误:', event.error);
          this.cancelRecording();
          uni.showToast({
            title: '语音识别失败',
            icon: 'none'
          });
        };
        
        try {
          this.recognition.start();
        } catch (error) {
          console.error('启动语音识别失败:', error);
          this.cancelRecording();
          uni.showToast({
            title: '无法启动语音识别',
            icon: 'none'
          });
        }
      },
  
      // 微信小程序语音识别
      startWechatVoiceRecognition() {
        const recorderManager = uni.getRecorderManager();
        
        recorderManager.onStart(() => {
          console.log('开始录音');
        });
        
        recorderManager.onStop((res) => {
          console.log('录音结束', res);
          
          // 调用微信语音识别API
          uni.request({
            url: 'https://api.weixin.qq.com/cgi-bin/media/voice/translatecontent',
            method: 'POST',
            data: {
              // 这里需要配置微信语音识别的参数
              media_id: res.tempFilePath,
              format: 'mp3',
              voice_id: Date.now().toString()
            },
            success: (result) => {
              if (result.data && result.data.result) {
                this.inputText = result.data.result;
                uni.showToast({
                  title: '语音识别完成',
                  icon: 'success'
                });
              }
            },
            fail: (error) => {
              console.error('语音识别失败:', error);
              uni.showToast({
                title: '语音识别失败',
                icon: 'none'
              });
            }
          });
        });
        
        recorderManager.onError((error) => {
          console.error('录音错误:', error);
          this.cancelRecording();
          uni.showToast({
            title: '录音失败',
            icon: 'none'
          });
        });
        
        // 开始录音
        recorderManager.start({
          duration: 60000,
          sampleRate: 16000,
          numberOfChannels: 1,
          encodeBitRate: 96000,
          format: 'mp3'
        });
      },
  
      // APP环境下的语音识别
      startAppVoiceRecognition() {
        // 使用uni-app的语音识别插件
        uni.startSoterAuthentication({
          requestAuthModes: ['speech'],
          challenge: '语音识别',
          authContent: '请说话',
          success: (result) => {
            // 这里需要调用具体的语音识别服务
            this.simulateVoiceToText(); // 临时使用模拟
          },
          fail: (error) => {
            console.error('语音识别失败:', error);
            this.cancelRecording();
            uni.showToast({
              title: '语音识别不可用',
              icon: 'none'
            });
          }
        });
      },
  
      // 模拟语音转文字
      simulateVoiceToText() {
        const mockTexts = [
          '你好，我想咨询一下会员服务',
          '视频播放有点卡顿怎么办',
          '如何修改我的账户信息',
          '支付失败了怎么处理',
          '有什么新功能吗'
        ];
        
        const recognizedText = mockTexts[Math.floor(Math.random() * mockTexts.length)];
        
        // 逐字显示在输入框中
        this.typeTextInInput(recognizedText);
      },
  
      // 逐字显示文字到输入框
      typeTextInInput(text) {
        this.inputText = '';
        let currentIndex = 0;
        
        const typeInterval = setInterval(() => {
          if (currentIndex < text.length) {
            this.inputText += text[currentIndex];
            currentIndex++;
          } else {
            clearInterval(typeInterval);
            
            // 显示成功提示
            uni.showToast({
              title: '语音识别完成',
              icon: 'success',
              duration: 1000
            });
            
            // 触觉反馈
            uni.vibrateShort && uni.vibrateShort();
          }
        }, 100); // 每100ms显示一个字符
      },
  
      // 切换表情面板
      toggleEmojiPanel() {
        this.showEmojiPanel = !this.showEmojiPanel;
        if (this.showEmojiPanel) {
          this.showQuickReplies = false;
        }
      },
  
      // 选择表情
      selectEmoji(emoji) {
        this.inputText += emoji.char;
        // 不自动关闭面板，让用户可以连续选择表情
        // this.showEmojiPanel = false;
      },
  
  
  
      // 获取当前时间
      getCurrentTime() {
        return this.formatTime(new Date());
      },
  
      // 格式化时间
      formatTime(date) {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
      },
  
      // 测试AI连接
      async testAIConnection() {
        try {
          const healthUrl = `${this.apiBaseUrl}/api/ai/health`;
          
          uni.request({
            url: healthUrl,
            method: 'GET',
            timeout: 10000,
            success: (res) => {
              // AI服务连接正常，无需显示信息
            },
            fail: (error) => {
              // 静默失败
            }
          });
        } catch (error) {
          // 静默处理连接测试错误
        }
      },
  
      // 降级到本地回复
      fallbackToLocalReply(userInput) {
        this.isTyping = false;
        
        // 延迟一点时间，让用户感觉是AI在思考
        setTimeout(() => {
          this.getLocalAIReply(userInput);
        }, 1000);
      }
    }
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

      .navbar-left, .navbar-right {
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
      background: linear-gradient(60deg, rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.02) 60%, rgba(255, 255, 255, 0));
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
          
          &:nth-child(1) { animation-delay: -0.32s; }
          &:nth-child(2) { animation-delay: -0.16s; }
        }
      }
    }
  }
  
  @keyframes typing {
    0%, 80%, 100% {
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
    0%, 100% {
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
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  </style>
  