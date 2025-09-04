<template>
	<view class="websocket-test-page">
		<view class="nav-bar">
			<view class="nav-left" @click="goBack">
				<text class="back-icon">←</text>
			</view>
			<view class="nav-title">WebSocket测试</view>
			<view class="nav-right"></view>
		</view>

		<view class="test-content">
			<view class="connection-section">
				<text class="section-title">⚡ WebSocket连接测试</text>
				
				<view class="connection-status">
					<text class="status-label">连接状态:</text>
					<text class="status-value" :class="isConnected ? 'connected' : 'disconnected'">
						{{ isConnected ? '已连接' : '未连接' }}
					</text>
				</view>

				<view class="test-buttons">
					<button class="test-btn" @click="connect" :disabled="isConnected">连接</button>
					<button class="test-btn" @click="disconnect" :disabled="!isConnected">断开</button>
					<button class="test-btn" @click="sendPing" :disabled="!isConnected">发送Ping</button>
				</view>
			</view>

			<view class="logs-section">
				<text class="section-title">📋 连接日志</text>
				<scroll-view class="logs-scroll" scroll-y>
					<view v-for="(log, index) in logs" :key="index" class="log-item">
						<text class="log-time">{{ formatTime(log.time) }}</text>
						<text class="log-content" :class="log.type">{{ log.message }}</text>
					</view>
				</scroll-view>
			</view>
		</view>
	</view>
</template>

<script>
import authService from '@/utils/authService'

export default {
	data() {
		return {
			websocket: null,
			isConnected: false,
			logs: []
		}
	},
	methods: {
		goBack() {
			uni.navigateBack();
		},

		connect() {
			try {
				this.addLog('正在连接WebSocket...', 'info');
				
				this.websocket = uni.connectSocket({
					url: 'ws://localhost:3000',
					header: {
						'Authorization': `Bearer ${authService.getToken()}`
					}
				});

				this.websocket.onOpen(() => {
					this.isConnected = true;
					this.addLog('WebSocket连接成功', 'success');
				});

				this.websocket.onMessage((res) => {
					this.addLog(`收到消息: ${res.data}`, 'message');
				});

				this.websocket.onClose(() => {
					this.isConnected = false;
					this.addLog('WebSocket连接已关闭', 'warning');
				});

				this.websocket.onError((error) => {
					this.isConnected = false;
					this.addLog(`WebSocket错误: ${JSON.stringify(error)}`, 'error');
				});
			} catch (error) {
				this.addLog(`连接失败: ${error.message}`, 'error');
			}
		},

		disconnect() {
			if (this.websocket) {
				this.websocket.close();
				this.addLog('主动断开连接', 'info');
			}
		},

		sendPing() {
			if (!this.isConnected) {
				this.addLog('请先连接WebSocket', 'error');
				return;
			}

			const pingData = {
				type: 'ping',
				timestamp: Date.now()
			};

			this.websocket.send({
				data: JSON.stringify(pingData)
			});
			
			this.addLog(`发送Ping: ${JSON.stringify(pingData)}`, 'info');
		},

		addLog(message, type = 'info') {
			this.logs.push({
				message,
				type,
				time: new Date()
			});
			
			// 限制日志数量
			if (this.logs.length > 100) {
				this.logs.shift();
			}
		},

		formatTime(time) {
			return time.toLocaleTimeString();
		}
	},
	
	onUnload() {
		if (this.websocket) {
			this.websocket.close();
		}
	}
}
</script>

<style scoped>
.websocket-test-page {
	width: 100%;
	min-height: 100vh;
	background: #f8fafc;
}

.nav-bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	height: 88rpx;
	padding: 0 24rpx;
	background: #ffffff;
	border-bottom: 1px solid #e5e7eb;
}

.nav-left {
	width: 80rpx;
}

.back-icon {
	font-size: 32rpx;
	color: #374151;
}

.nav-title {
	font-size: 32rpx;
	font-weight: 600;
	color: #1f2937;
}

.nav-right {
	width: 80rpx;
}

.test-content {
	padding: 32rpx 20rpx;
}

.connection-section, .logs-section {
	background: #ffffff;
	border-radius: 16rpx;
	padding: 32rpx;
	margin-bottom: 24rpx;
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.section-title {
	font-size: 32rpx;
	font-weight: 600;
	color: #1f2937;
	margin-bottom: 24rpx;
}

.connection-status {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 20rpx;
	background: #f8fafc;
	border-radius: 12rpx;
	margin-bottom: 24rpx;
}

.status-label {
	font-size: 28rpx;
	color: #374151;
}

.status-value {
	font-size: 24rpx;
	font-weight: 600;
	padding: 8rpx 16rpx;
	border-radius: 8rpx;
}

.status-value.connected {
	background: #dcfce7;
	color: #166534;
}

.status-value.disconnected {
	background: #fef2f2;
	color: #dc2626;
}

.test-buttons {
	display: flex;
	flex-direction: column;
	gap: 16rpx;
}

.test-btn {
	background: #3b82f6;
	color: white;
	border: none;
	border-radius: 12rpx;
	padding: 24rpx;
	font-size: 28rpx;
	font-weight: 500;
}

.test-btn:disabled {
	background: #d1d5db;
	color: #9ca3af;
}

.logs-scroll {
	height: 400rpx;
	border: 1px solid #e5e7eb;
	border-radius: 12rpx;
	padding: 16rpx;
}

.log-item {
	margin-bottom: 12rpx;
	padding: 12rpx;
	border-radius: 8rpx;
}

.log-time {
	font-size: 18rpx;
	color: #9ca3af;
	display: block;
	margin-bottom: 4rpx;
}

.log-content {
	font-size: 22rpx;
	line-height: 1.4;
}

.log-content.success {
	color: #166534;
	background: #dcfce7;
	padding: 8rpx;
	border-radius: 4rpx;
}

.log-content.error {
	color: #dc2626;
	background: #fef2f2;
	padding: 8rpx;
	border-radius: 4rpx;
}

.log-content.warning {
	color: #d97706;
	background: #fef3c7;
	padding: 8rpx;
	border-radius: 4rpx;
}

.log-content.info {
	color: #374151;
}

.log-content.message {
	color: #1d4ed8;
	background: #dbeafe;
	padding: 8rpx;
	border-radius: 4rpx;
}
</style> 