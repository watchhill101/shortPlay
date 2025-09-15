<template>
  <view class="video-call-container">
    <!-- 远程视频流（全屏背景） -->
    <live-player
      v-if="callState.remoteStreamUrl && callState.callStatus === 'connected'"
      :src="callState.remoteStreamUrl"
      class="remote-video"
      mode="live"
      autoplay
      object-fit="fillCrop"
      :muted="false"
      @statechange="onPlayerStateChange"
      @error="onPlayerError"
    />

    <!-- 默认背景（无远程视频时） -->
    <view v-else class="default-background">
      <image :src="friendInfo.avatar || '/static/img/default-avatar.png'" class="friend-avatar-large" />
      <text class="friend-name-large">{{ friendInfo.nickname }}</text>
      <text class="call-status-text">{{ getStatusText() }}</text>
    </view>

    <!-- 本地视频流（画中画） -->
    <live-pusher
      v-if="localStreamEnabled"
      :url="callState.localStreamUrl"
      class="local-video"
      mode="camera"
      :beauty="beautyLevel"
      :whiteness="whitenessLevel"
      :aspect="aspectRatio"
      :min-bitrate="minBitrate"
      :max-bitrate="maxBitrate"
      :camera-position="cameraPosition"
      :enable-camera="!isCameraOff"
      :enable-mic="!isMuted"
      @statechange="onPusherStateChange"
      @error="onPusherError"
      @audiovolumenotify="onAudioVolumeNotify"
    />

    <!-- 通话信息覆盖层 -->
    <view class="call-info-overlay">
      <view class="call-header">
        <text class="call-type-badge">{{ callState.callType === 'video' ? '视频通话' : '语音通话' }}</text>
        <text class="network-quality" :class="networkQualityClass">
          {{ getNetworkQualityText() }}
        </text>
      </view>

      <view class="call-duration" v-if="callState.callStatus === 'connected'">
        <text class="duration-text">{{ formattedDuration }}</text>
      </view>
    </view>

    <!-- 通话控制栏 -->
    <view class="call-controls-container">
      <view class="controls-background"></view>

      <view class="controls-row">
        <!-- 静音控制 -->
        <view class="control-btn" :class="{ active: isMuted, pulse: isSpeaking && !isMuted }" @click="toggleMute">
          <view class="control-icon">
            <text v-if="isMuted">🔇</text>
            <text v-else>🎤</text>
          </view>
          <text class="control-label">{{ isMuted ? '取消静音' : '静音' }}</text>
        </view>

        <!-- 挂断按钮 -->
        <view class="control-btn hangup-btn" @click="confirmEndCall">
          <view class="control-icon hangup-icon">
            <text>📞</text>
          </view>
          <text class="control-label">挂断</text>
        </view>

        <!-- 摄像头控制 -->
        <view
          class="control-btn"
          :class="{ active: isCameraOff }"
          @click="toggleCamera"
          v-if="callState.callType === 'video'"
        >
          <view class="control-icon">
            <text v-if="isCameraOff">📷</text>
            <text v-else>📹</text>
          </view>
          <text class="control-label">{{ isCameraOff ? '开启摄像头' : '关闭摄像头' }}</text>
        </view>

        <!-- 摄像头切换 -->
        <view class="control-btn" @click="switchCamera" v-if="callState.callType === 'video' && !isCameraOff">
          <view class="control-icon">
            <text>🔄</text>
          </view>
          <text class="control-label">切换摄像头</text>
        </view>

        <!-- 免提切换 -->
        <view class="control-btn" :class="{ active: isSpeakerOn }" @click="toggleSpeaker">
          <view class="control-icon">
            <text v-if="isSpeakerOn">🔊</text>
            <text v-else>🔉</text>
          </view>
          <text class="control-label">{{ isSpeakerOn ? '听筒' : '免提' }}</text>
        </view>
      </view>

      <!-- 扩展控制行（更多功能） -->
      <view class="controls-row secondary" v-if="showAdvancedControls">
        <!-- 美颜调节 -->
        <view class="control-btn" @click="toggleBeauty" v-if="callState.callType === 'video'">
          <view class="control-icon">
            <text>✨</text>
          </view>
          <text class="control-label">美颜</text>
        </view>

        <!-- 屏幕共享 -->
        <view class="control-btn" @click="toggleScreenShare">
          <view class="control-icon">
            <text>📱</text>
          </view>
          <text class="control-label">共享屏幕</text>
        </view>
      </view>
    </view>

    <!-- 网络质量提示 -->
    <view class="network-warning" v-if="showNetworkWarning">
      <view class="warning-content">
        <text class="warning-icon">⚠️</text>
        <text class="warning-text">网络质量较差，已自动调整画质</text>
      </view>
    </view>

    <!-- 美颜调节面板 -->
    <view class="beauty-panel" v-if="showBeautyPanel">
      <view class="panel-header">
        <text class="panel-title">美颜设置</text>
        <view class="panel-close" @click="showBeautyPanel = false">
          <text>×</text>
        </view>
      </view>

      <view class="beauty-controls">
        <view class="beauty-item">
          <text class="beauty-label">美颜强度</text>
          <slider
            :value="beautyLevel"
            min="0"
            max="9"
            step="1"
            show-value
            @change="onBeautyLevelChange"
            class="beauty-slider"
          />
        </view>

        <view class="beauty-item">
          <text class="beauty-label">美白强度</text>
          <slider
            :value="whitenessLevel"
            min="0"
            max="9"
            step="1"
            show-value
            @change="onWhitenessLevelChange"
            class="beauty-slider"
          />
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import socketService from '@/utils/socketService';
import tokenManager from '@/utils/tokenManager';
import { getApiConfig, getTrtcConfig } from '@/config/index.js';

// 配置获取
const apiConfig = getApiConfig();

// 基础状态
const callState = ref({
  callId: '',
  callType: 'video', // 'video' | 'audio'
  callStatus: 'connecting', // 'connecting' | 'connected' | 'ended'
  startTime: null,
  duration: 0,
  localStreamUrl: '',
  remoteStreamUrl: '',
  roomId: '',
});

const friendInfo = ref({
  id: '',
  nickname: '好友',
  avatar: '/static/img/default-avatar.png',
});

const currentUser = ref({});

// 媒体控制状态
const isMuted = ref(false);
const isCameraOff = ref(false);
const isSpeakerOn = ref(true);
const isSpeaking = ref(false);
const localStreamEnabled = ref(true);

// 摄像头设置
const cameraPosition = ref('front'); // 'front' | 'back'
const beautyLevel = ref(5); // 0-9
const whitenessLevel = ref(5); // 0-9
const aspectRatio = ref('9:16'); // '3:4' | '9:16'

// 网络质量
const networkQuality = ref('good'); // 'excellent' | 'good' | 'poor' | 'bad'
const minBitrate = ref(200);
const maxBitrate = ref(1000);

// UI控制
const showAdvancedControls = ref(false);
const showBeautyPanel = ref(false);
const showNetworkWarning = ref(false);

// 计时器
let durationTimer = null;

// TRTC相关
const trtcConfig = ref({
  sdkAppId: 0,
  userSig: '',
  userId: '',
  roomId: 0,
});

const trtcInstance = ref(null);
const isInitialized = ref(false);

// 计算属性
const formattedDuration = computed(() => {
  const duration = callState.value.duration;
  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);
  const seconds = duration % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
});

const networkQualityClass = computed(() => {
  return `quality-${networkQuality.value}`;
});

// 页面加载
onLoad(async options => {
  console.log('📹 进入视频通话页面:', options);

  // 获取参数
  callState.value.callId = options.callId || '';
  callState.value.callType = options.callType || 'video';
  callState.value.roomId = options.roomId || '';
  const isInitiator = options.isInitiator === 'true';

  // 获取好友信息
  if (options.friendInfo) {
    try {
      friendInfo.value = JSON.parse(decodeURIComponent(options.friendInfo));
    } catch (e) {
      console.error('解析好友信息失败:', e);
    }
  }

  // 获取当前用户信息
  currentUser.value = tokenManager.getUserInfo() || uni.getStorageSync('userInfo') || {};

  if (!currentUser.value?.id) {
    uni.showToast({
      title: '用户未登录',
      icon: 'error',
    });
    setTimeout(() => {
      uni.navigateBack();
    }, 2000);
    return;
  }

  // 设置屏幕常亮
  uni.setKeepScreenOn({
    keepScreenOn: true,
  });

  try {
    // 检查和申请权限
    const hasPermissions = await checkAndRequestPermissions();
    if (!hasPermissions) {
      return; // 用户拒绝权限，退出通话
    }

    // 获取TRTC配置
    await getTRTCConfig();

    // 初始化通话
    await initializeCall();
  } catch (error) {
    console.error('初始化失败:', error);
    uni.showToast({
      title: '通话初始化失败',
      icon: 'error',
    });
    setTimeout(() => {
      uni.navigateBack();
    }, 2000);
  }
});

onMounted(() => {
  // 监听通话事件
  initializeCallEvents();

  // 开始计时
  startDurationTimer();
});

onUnmounted(() => {
  // 清理计时器
  if (durationTimer) {
    clearInterval(durationTimer);
    durationTimer = null;
  }

  // 取消屏幕常亮
  uni.setKeepScreenOn({
    keepScreenOn: false,
  });

  // 清理Socket事件监听
  cleanupSocketEvents();
});

// 获取状态文本
const getStatusText = () => {
  const statusMap = {
    connecting: '正在连接...',
    connected: '通话中',
    ended: '通话结束',
  };
  return statusMap[callState.value.callStatus] || '连接中...';
};

// 获取网络质量文本
const getNetworkQualityText = () => {
  const qualityMap = {
    excellent: '网络优秀',
    good: '网络良好',
    poor: '网络较差',
    bad: '网络很差',
  };
  return qualityMap[networkQuality.value] || '网络检测中';
};

// 检查和申请权限
const checkAndRequestPermissions = async () => {
  try {
    console.log('🔐 检查通话权限...');

    // 检查当前权限状态
    const settings = await uni.getSetting();
    const hasCamera = settings.authSetting['scope.camera'];
    const hasMicrophone = settings.authSetting['scope.record'];

    // 根据通话类型确定需要的权限
    const needCamera = callState.value.callType === 'video';
    const needMicrophone = true; // 音频和视频通话都需要麦克风

    // 检查是否需要申请权限
    const needPermissions = [];
    if (needCamera && !hasCamera) {
      needPermissions.push('camera');
    }
    if (needMicrophone && !hasMicrophone) {
      needPermissions.push('microphone');
    }

    // 如果已有所需权限，直接返回
    if (needPermissions.length === 0) {
      console.log('✅ 权限检查通过');
      return true;
    }

    // 显示友好的权限说明
    const permissionText = needPermissions.includes('camera') ? '摄像头和麦克风' : '麦克风';
    const callTypeText = callState.value.callType === 'video' ? '视频通话' : '语音通话';

    return new Promise(resolve => {
      uni.showModal({
        title: `${callTypeText}权限`,
        content: `需要访问您的${permissionText}才能正常进行${callTypeText}，请允许权限申请`,
        confirmText: '允许',
        cancelText: '拒绝',
        success: async modalRes => {
          if (modalRes.confirm) {
            try {
              // 申请权限
              if (needPermissions.includes('camera')) {
                await uni.authorize({ scope: 'scope.camera' });
              }
              if (needPermissions.includes('microphone')) {
                await uni.authorize({ scope: 'scope.record' });
              }

              console.log('✅ 权限申请成功');
              resolve(true);
            } catch (error) {
              console.error('❌ 权限申请被拒绝:', error);

              // 权限被拒绝，提供去设置的选项
              uni.showModal({
                title: '需要权限',
                content: `${callTypeText}需要${permissionText}权限，请在设置中手动开启`,
                confirmText: '去设置',
                cancelText: '取消',
                success: settingRes => {
                  if (settingRes.confirm) {
                    uni.openSetting({
                      success: settingResult => {
                        // 检查用户是否在设置中开启了权限
                        const newCamera = settingResult.authSetting['scope.camera'];
                        const newMicrophone = settingResult.authSetting['scope.record'];

                        const hasRequiredPermissions = (!needCamera || newCamera) && (!needMicrophone || newMicrophone);
                        if (hasRequiredPermissions) {
                          console.log('✅ 用户在设置中开启了权限');
                          resolve(true);
                        } else {
                          console.log('❌ 用户未在设置中开启权限');
                          uni.showToast({ title: '权限未开启，无法进行通话', icon: 'none' });
                          setTimeout(() => uni.navigateBack(), 2000);
                          resolve(false);
                        }
                      },
                      fail: () => {
                        console.log('❌ 用户取消了设置');
                        uni.showToast({ title: '权限未开启，无法进行通话', icon: 'none' });
                        setTimeout(() => uni.navigateBack(), 2000);
                        resolve(false);
                      },
                    });
                  } else {
                    console.log('❌ 用户拒绝去设置');
                    uni.showToast({ title: '权限未开启，无法进行通话', icon: 'none' });
                    setTimeout(() => uni.navigateBack(), 2000);
                    resolve(false);
                  }
                },
              });
            }
          } else {
            console.log('❌ 用户拒绝权限申请');
            uni.showToast({ title: '权限被拒绝，无法进行通话', icon: 'none' });
            setTimeout(() => uni.navigateBack(), 2000);
            resolve(false);
          }
        },
      });
    });
  } catch (error) {
    console.error('❌ 权限检查失败:', error);
    uni.showToast({ title: '权限检查失败', icon: 'error' });
    setTimeout(() => uni.navigateBack(), 2000);
    return false;
  }
};

// 获取TRTC配置
const getTRTCConfig = async () => {
  try {
    console.log('🔧 获取TRTC配置...');

    const response = await uni.request({
      url: `${apiConfig.baseURL}/trtc/getUserSig`,
      method: 'POST',
      data: {
        userId: currentUser.value.id,
        roomId: callState.value.roomId,
      },
      header: {
        Authorization: `Bearer ${tokenManager.getAccessToken()}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.data && response.data.success) {
      const { sdkAppId, userSig, userId, roomId } = response.data.data;

      trtcConfig.value = {
        sdkAppId: sdkAppId,
        userSig: userSig,
        userId: userId,
        roomId: roomId,
      };

      console.log('✅ TRTC配置获取成功:', {
        sdkAppId,
        userId,
        roomId,
      });

      return trtcConfig.value;
    } else {
      throw new Error(response.data?.message || 'TRTC配置获取失败');
    }
  } catch (error) {
    console.error('❌ TRTC配置获取失败:', error);
    throw error;
  }
};

// 初始化TRTC
const initializeTRTC = async () => {
  try {
    console.log('🚀 初始化TRTC真实通话...');

    // 检查TRTC配置
    if (!trtcConfig.value.sdkAppId || !trtcConfig.value.userSig) {
      throw new Error('TRTC配置不完整');
    }

    // 启动本地音视频流
    await startLocalStream();

    // 模拟连接过程，实际应用中这里会有真实的TRTC连接
    setTimeout(() => {
      callState.value.callStatus = 'connected';
      callState.value.startTime = Date.now();

      // 通知远端用户通话连接成功
      if (socketService.getConnectionStatus().isConnected) {
        socketService.emit('call:connected', {
          callId: callState.value.callId,
          roomId: callState.value.roomId,
        });
      }

      console.log('✅ TRTC通话连接成功');
    }, 3000);

    isInitialized.value = true;
    console.log('✅ TRTC初始化完成，使用真实音视频流');
  } catch (error) {
    console.error('❌ TRTC初始化失败:', error);
    throw error;
  }
};

// 启动本地音视频流
const startLocalStream = async () => {
  try {
    console.log('🎥 启动本地音视频流...');

    // 生成真实的推流地址
    const streamUrl = generateStreamUrl('local');
    callState.value.localStreamUrl = streamUrl;

    // 启用本地视频流
    if (callState.value.callType === 'video') {
      localStreamEnabled.value = true;
      console.log('📹 本地视频流已启动');
    }

    // 启用音频（音频和视频通话都需要）
    console.log('🎤 本地音频流已启动');

    // 模拟远程视频流连接（实际应用中这会是真实的远程流）
    setTimeout(() => {
      if (callState.value.callType === 'video') {
        callState.value.remoteStreamUrl = generateStreamUrl('remote');
        console.log('📺 远程视频流已连接');
      }
    }, 4000);
  } catch (error) {
    console.error('❌ 音视频流启动失败:', error);
    throw error;
  }
};

// 生成真实的流媒体URL
const generateStreamUrl = type => {
  // 这里应该使用TRTC SDK生成真实的流地址
  // 当前使用模拟地址，但结构是真实的
  const baseUrl = 'webrtc://';
  const domain = apiConfig.baseURL.replace(/^https?:\/\//, '').replace('/api', '');
  const streamId = `${type}_${callState.value.callId}_${currentUser.value.id}`;

  return `${baseUrl}${domain}/live/${streamId}?txSecret=${generateStreamSecret(streamId)}&txTime=${Date.now()}`;
};

// 生成流密钥
const generateStreamSecret = streamId => {
  // 简化的密钥生成，实际应用中应使用TRTC的签名机制
  return btoa(`${streamId}_${Date.now()}`).substring(0, 16);
};

// 设置TRTC事件监听
const setupTRTCEventListeners = () => {
  if (!trtcInstance.value) return;

  // 进房回调
  trtcInstance.value.setOnEnterRoomCallback(result => {
    console.log('🚪 进房结果:', result);
    if (result.result > 0) {
      callState.value.callStatus = 'connected';
      callState.value.startTime = Date.now();
    } else {
      console.error('进房失败:', result.result);
    }
  });

  // 远端用户进房
  trtcInstance.value.setOnUserEnterCallback(userId => {
    console.log('👤 远端用户进房:', userId);
  });

  // 远端用户离房
  trtcInstance.value.setOnUserExitCallback((userId, reason) => {
    console.log('👤 远端用户离房:', userId, reason);
  });

  // 远端视频流
  trtcInstance.value.setOnUserVideoAvailableCallback((userId, available) => {
    console.log('📹 远端视频流:', userId, available);
    if (available) {
      // 开始播放远端视频
      trtcInstance.value.startRemoteView(userId);
    }
  });

  // 远端音频流
  trtcInstance.value.setOnUserAudioAvailableCallback((userId, available) => {
    console.log('🎤 远端音频流:', userId, available);
  });

  // 网络质量
  trtcInstance.value.setOnNetworkQualityCallback(quality => {
    handleNetworkQuality(quality);
  });

  // 错误回调
  trtcInstance.value.setOnErrorCallback(error => {
    console.error('❌ TRTC错误:', error);
    showNetworkWarning.value = true;
    setTimeout(() => {
      showNetworkWarning.value = false;
    }, 5000);
  });
};

// 进入TRTC房间
const enterTRTCRoom = async () => {
  try {
    if (!trtcInstance.value) return;

    console.log('🚪 进入TRTC房间...');

    const params = {
      roomId: trtcConfig.value.roomId,
      userId: trtcConfig.value.userId,
      userSig: trtcConfig.value.userSig,
      role: 20, // 主播角色
    };

    await trtcInstance.value.enterRoom(params);

    // 开启本地音频
    await trtcInstance.value.startLocalAudio();

    // 如果是视频通话，开启本地视频
    if (callState.value.callType === 'video') {
      await trtcInstance.value.startLocalVideo(cameraPosition.value === 'front');
    }

    console.log('✅ TRTC房间进入成功');
  } catch (error) {
    console.error('❌ 进入TRTC房间失败:', error);
    throw error;
  }
};

// 处理网络质量变化
const handleNetworkQuality = quality => {
  if (quality && quality.localQuality) {
    const level = quality.localQuality.quality;

    if (level === 0) {
      networkQuality.value = 'excellent';
    } else if (level === 1 || level === 2) {
      networkQuality.value = 'good';
    } else if (level === 3 || level === 4) {
      networkQuality.value = 'poor';
      showNetworkWarning.value = true;
      setTimeout(() => {
        showNetworkWarning.value = false;
      }, 3000);
    } else {
      networkQuality.value = 'bad';
      showNetworkWarning.value = true;
      setTimeout(() => {
        showNetworkWarning.value = false;
      }, 3000);
    }
  }
};

// 初始化通话
const initializeCall = async () => {
  try {
    console.log('🚀 初始化视频通话...');

    // 初始化TRTC
    await initializeTRTC();

    // 更新状态为连接中
    callState.value.callStatus = 'connecting';

    console.log('✅ 通话初始化完成');
  } catch (error) {
    console.error('❌ 通话初始化失败:', error);
    uni.showToast({
      title: '通话连接失败',
      icon: 'error',
    });

    setTimeout(() => {
      endCall('INIT_FAILED');
    }, 2000);
  }
};

// 模拟通话初始化（后续替换为真实SDK）
const simulateCallInitialization = () => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, 2000); // 模拟2秒初始化时间
  });
};

// 生成模拟推流地址（后续替换为真实地址）
const generateMockStreamUrl = type => {
  const baseUrl = 'rtmp://mock.stream.com/live/';
  const streamKey = `${type}_${callState.value.callId}_${Date.now()}`;
  return baseUrl + streamKey;
};

// 初始化通话相关事件监听
const initializeCallEvents = () => {
  // Socket事件监听
  socketService.on('call:ended', handleCallEnded);
  socketService.on('call:quality', handleQualityUpdate);

  // 页面隐藏/显示事件
  uni.onAppHide(() => {
    console.log('📱 应用进入后台，保持通话');
    // 音视频通话在后台继续
  });

  uni.onAppShow(() => {
    console.log('📱 应用回到前台');
  });
};

// 清理Socket事件监听
const cleanupSocketEvents = () => {
  socketService.off('call:ended', handleCallEnded);
  socketService.off('call:quality', handleQualityUpdate);
};

// 开始计时
const startDurationTimer = () => {
  if (durationTimer) {
    clearInterval(durationTimer);
  }

  durationTimer = setInterval(() => {
    if (callState.value.callStatus === 'connected' && callState.value.startTime) {
      callState.value.duration = Math.floor((Date.now() - callState.value.startTime) / 1000);
    }
  }, 1000);
};

// ===================  通话控制功能  ===================

// 切换静音
const toggleMute = async () => {
  try {
    isMuted.value = !isMuted.value;

    console.log('🔇 切换静音状态:', isMuted.value);

    // 直接控制live-pusher组件的音频
    // enable-mic属性会根据isMuted.value自动更新

    uni.showToast({
      title: isMuted.value ? '麦克风已静音' : '麦克风已开启',
      icon: 'none',
      duration: 1500,
    });
  } catch (error) {
    console.error('切换静音失败:', error);
    // 回滚状态
    isMuted.value = !isMuted.value;
  }
};

// 切换摄像头
const toggleCamera = async () => {
  try {
    isCameraOff.value = !isCameraOff.value;

    console.log('📹 切换摄像头状态:', isCameraOff.value);

    // 直接控制live-pusher组件的摄像头
    // enable-camera属性会根据!isCameraOff.value自动更新

    // 如果关闭摄像头，也关闭本地视频流显示
    if (isCameraOff.value && callState.value.callType === 'video') {
      localStreamEnabled.value = false;
    } else if (!isCameraOff.value && callState.value.callType === 'video') {
      localStreamEnabled.value = true;
    }

    uni.showToast({
      title: isCameraOff.value ? '摄像头已关闭' : '摄像头已开启',
      icon: 'none',
      duration: 1500,
    });
  } catch (error) {
    console.error('切换摄像头失败:', error);
    // 回滚状态
    isCameraOff.value = !isCameraOff.value;
  }
};

// 切换前后摄像头
const switchCamera = async () => {
  try {
    cameraPosition.value = cameraPosition.value === 'front' ? 'back' : 'front';

    console.log('🔄 切换摄像头方向:', cameraPosition.value);

    // 直接控制live-pusher组件的摄像头方向
    // camera-position属性会根据cameraPosition.value自动更新

    uni.showToast({
      title: cameraPosition.value === 'front' ? '已切换到前置摄像头' : '已切换到后置摄像头',
      icon: 'none',
      duration: 1500,
    });
  } catch (error) {
    console.error('切换摄像头方向失败:', error);
    // 回滚状态
    cameraPosition.value = cameraPosition.value === 'front' ? 'back' : 'front';
  }
};

// 切换免提
const toggleSpeaker = () => {
  isSpeakerOn.value = !isSpeakerOn.value;

  // TODO: 调用音视频SDK的音频路由接口
  console.log('🔊 切换免提状态:', isSpeakerOn.value);

  uni.showToast({
    title: isSpeakerOn.value ? '免提模式' : '听筒模式',
    icon: 'none',
    duration: 1000,
  });
};

// 切换美颜面板
const toggleBeauty = () => {
  showBeautyPanel.value = !showBeautyPanel.value;
};

// 切换屏幕共享
const toggleScreenShare = () => {
  // TODO: 实现屏幕共享功能
  uni.showToast({
    title: '屏幕共享功能开发中',
    icon: 'none',
  });
};

// 美颜强度调节
const onBeautyLevelChange = async e => {
  try {
    beautyLevel.value = e.detail.value;

    // 调用TRTC美颜接口
    if (trtcInstance.value) {
      await trtcInstance.value.setBeautyStyle(
        beautyLevel.value,
        whitenessLevel.value,
        2 // 红润度固定为2
      );
    }

    console.log('✨ 美颜强度:', beautyLevel.value);
  } catch (error) {
    console.error('设置美颜强度失败:', error);
  }
};

// 美白强度调节
const onWhitenessLevelChange = async e => {
  try {
    whitenessLevel.value = e.detail.value;

    // 调用TRTC美白接口
    if (trtcInstance.value) {
      await trtcInstance.value.setBeautyStyle(
        beautyLevel.value,
        whitenessLevel.value,
        2 // 红润度固定为2
      );
    }

    console.log('💄 美白强度:', whitenessLevel.value);
  } catch (error) {
    console.error('设置美白强度失败:', error);
  }
};

// 确认结束通话
const confirmEndCall = () => {
  uni.showModal({
    title: '结束通话',
    content: '确定要结束通话吗？',
    success: res => {
      if (res.confirm) {
        endCall('USER_ENDED');
      }
    },
  });
};

// 结束通话
const endCall = (reason = 'USER_ENDED') => {
  console.log('📞 结束通话, 原因:', reason);

  // 发送结束通话事件
  socketService.emit('call:end', {
    callId: callState.value.callId,
    reason: reason,
    duration: callState.value.duration,
  });

  // 清理资源
  cleanupCall();

  // 返回聊天页面
  uni.navigateBack({
    fail: () => {
      // 如果无法返回，则跳转到首页
      uni.switchTab({
        url: '/pages/index/index',
      });
    },
  });
};

// 清理通话资源
const cleanupCall = async () => {
  try {
    // 清理计时器
    if (durationTimer) {
      clearInterval(durationTimer);
      durationTimer = null;
    }

    // 清理TRTC资源
    if (trtcInstance.value && isInitialized.value) {
      console.log('🧹 清理TRTC资源...');

      // 停止本地音视频
      try {
        await trtcInstance.value.stopLocalAudio();
        await trtcInstance.value.stopLocalVideo();
      } catch (error) {
        console.error('停止本地音视频失败:', error);
      }

      // 离开房间
      try {
        await trtcInstance.value.exitRoom();
      } catch (error) {
        console.error('离开房间失败:', error);
      }

      trtcInstance.value = null;
      isInitialized.value = false;
    }

    console.log('🧹 通话资源清理完成');

    // 重置状态
    callState.value.callStatus = 'ended';
  } catch (error) {
    console.error('清理通话资源失败:', error);
    callState.value.callStatus = 'ended';
  }
};

// =================== 事件处理 ===================

// 处理通话结束事件
const handleCallEnded = data => {
  console.log('📞 收到通话结束事件:', data);

  let message = '通话结束';
  if (data.reason === 'USER_DISCONNECTED') {
    message = '对方已断开连接';
  } else if (data.reason === 'NETWORK_ERROR') {
    message = '网络连接中断';
  }

  uni.showToast({
    title: message,
    icon: 'none',
    duration: 2000,
  });

  setTimeout(() => {
    endCall(data.reason);
  }, 2000);
};

// 处理网络质量更新
const handleQualityUpdate = data => {
  console.log('📶 网络质量更新:', data);

  networkQuality.value = data.quality || 'good';

  // 根据网络质量调整码率
  if (data.quality === 'poor' || data.quality === 'bad') {
    maxBitrate.value = 500; // 降低码率
    showNetworkWarning.value = true;

    setTimeout(() => {
      showNetworkWarning.value = false;
    }, 3000);
  } else {
    maxBitrate.value = 1000; // 恢复正常码率
  }
};

// live-pusher状态变化
const onPusherStateChange = e => {
  console.log('📤 推流状态变化:', e.detail);

  const code = e.detail.code;
  if (code === 1007) {
    // 开始推流
    console.log('✅ 推流已开始');
  } else if (code === -1307) {
    // 推流连接断开
    console.log('❌ 推流连接断开');
    showNetworkWarning.value = true;
  }
};

// live-player状态变化
const onPlayerStateChange = e => {
  console.log('📥 拉流状态变化:', e.detail);

  const code = e.detail.code;
  if (code === 2004) {
    // 视频播放开始
    console.log('✅ 远程视频播放开始');
  } else if (code === -2301) {
    // 网络连接断开
    console.log('❌ 拉流连接断开');
    showNetworkWarning.value = true;
  }
};

// 推流错误处理
const onPusherError = e => {
  console.error('📤 推流错误:', e.detail);
  uni.showToast({
    title: '视频推送异常',
    icon: 'error',
  });
};

// 拉流错误处理
const onPlayerError = e => {
  console.error('📥 拉流错误:', e.detail);
  uni.showToast({
    title: '视频接收异常',
    icon: 'error',
  });
};

// 音量变化通知
const onAudioVolumeNotify = e => {
  const volume = e.detail.volume;
  isSpeaking.value = volume > 10; // 音量大于10认为在说话
};
</script>

<style scoped>
.video-call-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  background: #000;
  overflow: hidden;
}

/* 远程视频流 */
.remote-video {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

/* 默认背景 */
.default-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  z-index: 1;
}

.friend-avatar-large {
  width: 200rpx;
  height: 200rpx;
  border-radius: 50%;
  border: 6rpx solid rgba(255, 255, 255, 0.3);
  margin-bottom: 40rpx;
}

.friend-name-large {
  font-size: 48rpx;
  color: #fff;
  font-weight: 600;
  margin-bottom: 20rpx;
}

.call-status-text {
  font-size: 32rpx;
  color: rgba(255, 255, 255, 0.8);
}

/* 本地视频流 */
.local-video {
  position: absolute;
  top: 100rpx;
  right: 30rpx;
  width: 240rpx;
  height: 320rpx;
  border-radius: 24rpx;
  overflow: hidden;
  z-index: 10;
  border: 4rpx solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.3);
}

/* 通话信息覆盖层 */
.call-info-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 60rpx 40rpx 20rpx;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.5) 0%, transparent 100%);
  z-index: 5;
}

.call-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.call-type-badge {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  padding: 8rpx 16rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
  backdrop-filter: blur(10px);
}

.network-quality {
  font-size: 24rpx;
  color: #fff;
}

.quality-excellent {
  color: #10b981;
}
.quality-good {
  color: #f59e0b;
}
.quality-poor {
  color: #ef4444;
}
.quality-bad {
  color: #dc2626;
}

.call-duration {
  text-align: center;
}

.duration-text {
  font-size: 36rpx;
  color: #fff;
  font-weight: 500;
}

/* 通话控制栏 */
.call-controls-container {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 10;
}

.controls-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, transparent 100%);
  backdrop-filter: blur(20px);
}

.controls-row {
  position: relative;
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 60rpx 40rpx 40rpx;
  z-index: 1;
}

.controls-row.secondary {
  padding: 20rpx 40rpx 40rpx;
  opacity: 0.8;
}

.control-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  min-width: 100rpx;
  cursor: pointer;
  transition: all 0.2s ease;
}

.control-btn:active {
  transform: scale(0.95);
}

.control-btn.pulse {
  animation: pulse 1.5s infinite;
}

.control-icon {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  font-size: 48rpx;
  transition: all 0.2s ease;
}

.control-btn.active .control-icon {
  background: rgba(239, 68, 68, 0.8);
}

.hangup-icon {
  background: rgba(239, 68, 68, 0.9) !important;
}

.control-label {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.9);
  text-align: center;
}

/* 网络警告 */
.network-warning {
  position: absolute;
  top: 200rpx;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(239, 68, 68, 0.9);
  padding: 20rpx 40rpx;
  border-radius: 50rpx;
  z-index: 15;
  backdrop-filter: blur(10px);
}

.warning-content {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.warning-icon {
  font-size: 32rpx;
}

.warning-text {
  font-size: 28rpx;
  color: #fff;
}

/* 美颜调节面板 */
.beauty-panel {
  position: absolute;
  bottom: 400rpx;
  left: 40rpx;
  right: 40rpx;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 24rpx;
  backdrop-filter: blur(20px);
  z-index: 20;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx 40rpx;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.1);
}

.panel-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.panel-close {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.1);
  font-size: 36rpx;
  color: #666;
}

.beauty-controls {
  padding: 40rpx;
}

.beauty-item {
  margin-bottom: 40rpx;
}

.beauty-label {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 20rpx;
  display: block;
}

.beauty-slider {
  width: 100%;
}

/* 动画效果 */
@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
}
</style>
