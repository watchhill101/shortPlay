// utils/trtcService.js - 腾讯云TRTC集成服务
// 注意：这个文件展示了如何集成腾讯云TRTC，需要先在HBuilderX中配置TRTC插件

import { getTrtcConfig } from '@/config/index.js';

class TRTCService {
  constructor() {
    this.trtc = null;
    this.isInitialized = false;
    // 从配置文件获取TRTC配置
    this.config = getTrtcConfig();

    this.roomInfo = {
      roomId: 0,
      userId: '',
      userSig: '',
      role: 'anchor', // 'anchor' | 'audience'
    };

    this.mediaState = {
      localAudio: false,
      localVideo: false,
      isMuted: false,
      isCameraOff: false,
      cameraPosition: 'front',
    };

    this.callbacks = {};
  }

  // 初始化TRTC
  async initialize(config = {}) {
    try {
      if (this.isInitialized) return;

      console.log('🚀 初始化TRTC服务...');

      // 配置参数
      this.config = { ...this.config, ...config };

      // 检查是否在uni-app环境且已配置原生插件
      if (typeof uni !== 'undefined' && uni.requireNativePlugin) {
        try {
          this.trtc = uni.requireNativePlugin('trtc-plugin');
          console.log('✅ TRTC原生插件加载成功');
        } catch (_error) {
          console.error('❌ TRTC原生插件加载失败，请检查manifest.json配置');
          throw new Error('TRTC插件未正确配置');
        }
      } else {
        throw new Error('当前环境不支持TRTC原生插件');
      }

      // 初始化TRTC实例
      await this.trtc.init({
        sdkAppId: this.config.sdkAppId,
      });

      // 设置事件监听
      this.setupEventListeners();

      this.isInitialized = true;
      console.log('✅ TRTC服务初始化完成');
    } catch (error) {
      console.error('❌ TRTC初始化失败:', error);
      throw error;
    }
  }

  // 设置事件监听
  setupEventListeners() {
    if (!this.trtc) return;

    // 进房回调
    this.trtc.setOnEnterRoomCallback(result => {
      console.log('🚪 进房结果:', result);
      if (result.result > 0) {
        this.emit('roomEntered', { roomId: this.roomInfo.roomId });
      } else {
        this.emit('roomEnterFailed', { error: result.result });
      }
    });

    // 远端用户进房
    this.trtc.setOnUserEnterCallback(userId => {
      console.log('👤 远端用户进房:', userId);
      this.emit('userEntered', { userId });
    });

    // 远端用户离房
    this.trtc.setOnUserExitCallback((userId, reason) => {
      console.log('👤 远端用户离房:', userId, reason);
      this.emit('userExited', { userId, reason });
    });

    // 远端视频流开始
    this.trtc.setOnUserVideoAvailableCallback((userId, available) => {
      console.log('📹 远端视频流状态变化:', userId, available);
      this.emit('userVideoAvailable', { userId, available });
    });

    // 远端音频流开始
    this.trtc.setOnUserAudioAvailableCallback((userId, available) => {
      console.log('🎤 远端音频流状态变化:', userId, available);
      this.emit('userAudioAvailable', { userId, available });
    });

    // 网络质量回调
    this.trtc.setOnNetworkQualityCallback(quality => {
      console.log('📶 网络质量变化:', quality);
      this.emit('networkQualityChanged', quality);
    });

    // 统计信息回调
    this.trtc.setOnStatisticsCallback(statistics => {
      this.emit('statisticsUpdated', statistics);
    });

    // 错误回调
    this.trtc.setOnErrorCallback(error => {
      console.error('❌ TRTC错误:', error);
      this.emit('error', error);
    });

    // 警告回调
    this.trtc.setOnWarningCallback(warning => {
      console.warn('⚠️ TRTC警告:', warning);
      this.emit('warning', warning);
    });
  }

  // 生成UserSig
  generateUserSig(userId, _expireTime = this.config.expireTime) {
    // 注意：生产环境中应该在服务端生成UserSig
    // 这里仅作示例，实际项目中请调用后端接口获取

    if (!this.config.secretKey) {
      throw new Error('请先配置SecretKey');
    }

    try {
      // 这里需要引入腾讯云的签名算法库
      // const genTestUserSig = require('./lib/GenerateTestUserSig.js');
      // return genTestUserSig(this.config.sdkAppId, this.config.secretKey, userId, expireTime);

      // 临时返回，实际使用时请替换为真实的UserSig生成
      console.warn('⚠️ 请实现真实的UserSig生成逻辑');
      return 'temp_user_sig';
    } catch (error) {
      console.error('生成UserSig失败:', error);
      throw error;
    }
  }

  // 进入房间
  async enterRoom(roomId, userId, role = 'anchor') {
    try {
      if (!this.isInitialized) {
        throw new Error('TRTC未初始化');
      }

      console.log('🚪 进入TRTC房间:', { roomId, userId, role });

      // 生成UserSig
      const userSig = this.generateUserSig(userId);

      // 保存房间信息
      this.roomInfo = {
        roomId,
        userId,
        userSig,
        role,
      };

      // 进房参数
      const params = {
        roomId: roomId,
        userId: userId,
        userSig: userSig,
        role: role === 'anchor' ? 20 : 21, // 20=主播，21=观众
        privateMapKey: '', // 可选
      };

      // 执行进房
      await this.trtc.enterRoom(params);
    } catch (error) {
      console.error('进入房间失败:', error);
      throw error;
    }
  }

  // 离开房间
  async exitRoom() {
    try {
      if (!this.isInitialized || !this.roomInfo.roomId) {
        return;
      }

      console.log('🚪 离开TRTC房间');

      // 停止音视频
      await this.stopLocalAudio();
      await this.stopLocalVideo();

      // 离开房间
      await this.trtc.exitRoom();

      // 重置房间信息
      this.roomInfo = {
        roomId: 0,
        userId: '',
        userSig: '',
        role: 'anchor',
      };
    } catch (error) {
      console.error('离开房间失败:', error);
      throw error;
    }
  }

  // 开启本地音频
  async startLocalAudio() {
    try {
      if (!this.trtc) return;

      console.log('🎤 开启本地音频');

      await this.trtc.startLocalAudio();
      this.mediaState.localAudio = true;

      this.emit('localAudioStateChanged', { enabled: true });
    } catch (error) {
      console.error('开启本地音频失败:', error);
      throw error;
    }
  }

  // 停止本地音频
  async stopLocalAudio() {
    try {
      if (!this.trtc) return;

      console.log('🔇 停止本地音频');

      await this.trtc.stopLocalAudio();
      this.mediaState.localAudio = false;

      this.emit('localAudioStateChanged', { enabled: false });
    } catch (error) {
      console.error('停止本地音频失败:', error);
    }
  }

  // 开启本地视频
  async startLocalVideo(frontCamera = true) {
    try {
      if (!this.trtc) return;

      console.log('📹 开启本地视频');

      await this.trtc.startLocalVideo(frontCamera);
      this.mediaState.localVideo = true;
      this.mediaState.cameraPosition = frontCamera ? 'front' : 'back';

      this.emit('localVideoStateChanged', { enabled: true, frontCamera });
    } catch (error) {
      console.error('开启本地视频失败:', error);
      throw error;
    }
  }

  // 停止本地视频
  async stopLocalVideo() {
    try {
      if (!this.trtc) return;

      console.log('📷 停止本地视频');

      await this.trtc.stopLocalVideo();
      this.mediaState.localVideo = false;

      this.emit('localVideoStateChanged', { enabled: false });
    } catch (error) {
      console.error('停止本地视频失败:', error);
    }
  }

  // 切换摄像头
  async switchCamera() {
    try {
      if (!this.trtc || !this.mediaState.localVideo) return;

      console.log('🔄 切换摄像头');

      await this.trtc.switchCamera();
      this.mediaState.cameraPosition = this.mediaState.cameraPosition === 'front' ? 'back' : 'front';

      this.emit('cameraSwitched', { position: this.mediaState.cameraPosition });
    } catch (error) {
      console.error('切换摄像头失败:', error);
      throw error;
    }
  }

  // 静音/取消静音
  async muteLocalAudio(mute) {
    try {
      if (!this.trtc) return;

      console.log('🔇 设置静音状态:', mute);

      await this.trtc.muteLocalAudio(mute);
      this.mediaState.isMuted = mute;

      this.emit('localAudioMuted', { muted: mute });
    } catch (error) {
      console.error('设置静音失败:', error);
      throw error;
    }
  }

  // 暂停/恢复本地视频
  async muteLocalVideo(mute) {
    try {
      if (!this.trtc) return;

      console.log('📹 设置视频状态:', mute ? '暂停' : '恢复');

      await this.trtc.muteLocalVideo(mute);
      this.mediaState.isCameraOff = mute;

      this.emit('localVideoMuted', { muted: mute });
    } catch (error) {
      console.error('设置视频状态失败:', error);
      throw error;
    }
  }

  // 设置视频编码参数
  async setVideoEncoderParam(param) {
    try {
      if (!this.trtc) return;

      const defaultParam = {
        videoBitrate: 550, // 视频码率
        videoFps: 15, // 视频帧率
        videoResolution: 1, // 视频分辨率 (1=160x120, 3=320x240, 5=640x480, 6=960x540, 7=1280x720)
        resMode: 1, // 分辨率模式 (1=横屏, 2=竖屏)
      };

      const finalParam = { ...defaultParam, ...param };

      await this.trtc.setVideoEncoderParam(finalParam);
      console.log('📹 设置视频编码参数:', finalParam);
    } catch (error) {
      console.error('设置视频编码参数失败:', error);
      throw error;
    }
  }

  // 设置美颜效果
  async setBeautyStyle(beautyLevel, whitenessLevel, ruddiness) {
    try {
      if (!this.trtc) return;

      await this.trtc.setBeautyStyle(beautyLevel, whitenessLevel, ruddiness);
      console.log('✨ 设置美颜效果:', { beautyLevel, whitenessLevel, ruddiness });
    } catch (error) {
      console.error('设置美颜效果失败:', error);
      throw error;
    }
  }

  // 开始播放远端视频
  async startRemoteView(userId) {
    try {
      if (!this.trtc) return;

      console.log('📺 开始播放远端视频:', userId);

      await this.trtc.startRemoteView(userId);
    } catch (error) {
      console.error('播放远端视频失败:', error);
      throw error;
    }
  }

  // 停止播放远端视频
  async stopRemoteView(userId) {
    try {
      if (!this.trtc) return;

      console.log('📺 停止播放远端视频:', userId);

      await this.trtc.stopRemoteView(userId);
    } catch (error) {
      console.error('停止播放远端视频失败:', error);
    }
  }

  // 获取当前状态
  getState() {
    return {
      isInitialized: this.isInitialized,
      roomInfo: { ...this.roomInfo },
      mediaState: { ...this.mediaState },
    };
  }

  // 事件监听
  on(event, callback) {
    if (!this.callbacks[event]) {
      this.callbacks[event] = [];
    }
    this.callbacks[event].push(callback);
  }

  // 移除事件监听
  off(event, callback) {
    if (this.callbacks[event]) {
      const index = this.callbacks[event].indexOf(callback);
      if (index > -1) {
        this.callbacks[event].splice(index, 1);
      }
    }
  }

  // 触发事件
  emit(event, data) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('TRTC事件回调执行失败:', error);
        }
      });
    }
  }

  // 销毁服务
  async destroy() {
    try {
      if (this.isInitialized) {
        await this.exitRoom();
      }

      this.callbacks = {};
      this.isInitialized = false;
      this.trtc = null;

      console.log('🗑️ TRTC服务已销毁');
    } catch (error) {
      console.error('销毁TRTC服务失败:', error);
    }
  }
}

// 单例模式
const trtcService = new TRTCService();

export default trtcService;

/* 
=== 使用说明 ===

1. 在HBuilderX中配置TRTC原生插件：
   - manifest.json -> App原生插件配置 -> 选择腾讯云TRTC插件
   - 获取插件：https://ext.dcloud.net.cn/plugin?id=7174

2. 腾讯云控制台配置：
   - 创建TRTC应用获取SDKAppID
   - 生成密钥用于UserSig签名

3. 基本使用流程：
   ```javascript
   import trtcService from '@/utils/trtcService.js';
   
   // 初始化
   await trtcService.initialize({
     sdkAppId: YOUR_SDK_APP_ID,
     secretKey: YOUR_SECRET_KEY
   });
   
   // 进入房间
   await trtcService.enterRoom(roomId, userId, 'anchor');
   
   // 开启音视频
   await trtcService.startLocalAudio();
   await trtcService.startLocalVideo();
   
   // 监听事件
   trtcService.on('userEntered', (data) => {
     console.log('新用户进房:', data.userId);
   });
   ```

4. 注意事项：
   - UserSig建议在服务端生成，客户端生成仅用于调试
   - 生产环境需要配置防火墙和权限
   - 音视频功能需要真机测试，模拟器无法使用

*/
