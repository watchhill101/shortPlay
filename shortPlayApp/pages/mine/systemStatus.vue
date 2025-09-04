<template>
	<view class="status-page">
		<view class="nav-bar">
			<view class="nav-left" @click="goBack">
				<text class="back-icon">←</text>
			</view>
			<view class="nav-title">系统状态</view>
			<view class="nav-right">
				<text class="refresh-btn" @click="refreshStatus">刷新</text>
			</view>
		</view>

		<view class="status-content">
			<view class="status-section">
				<text class="section-title">🔍 系统运行状态</text>
				
				<view class="status-items">
					<view class="status-item">
						<text class="status-label">API服务</text>
						<text class="status-value" :class="systemStatus.api">{{ systemStatus.api }}</text>
					</view>
					
					<view class="status-item">
						<text class="status-label">数据库</text>
						<text class="status-value" :class="systemStatus.mongodb">{{ systemStatus.mongodb }}</text>
					</view>
					
					<view class="status-item">
						<text class="status-label">Redis</text>
						<text class="status-value" :class="systemStatus.redis">{{ systemStatus.redis }}</text>
					</view>
					
					<view class="status-item">
						<text class="status-label">运行时间</text>
						<text class="status-value">{{ uptime }}</text>
					</view>
				</view>
			</view>

			<view class="performance-section">
				<text class="section-title">📊 性能指标</text>
				<view class="performance-grid">
					<view class="performance-item">
						<text class="perf-label">内存使用</text>
						<text class="perf-value">{{ performance.memory }}</text>
					</view>
					<view class="performance-item">
						<text class="perf-label">CPU使用</text>
						<text class="perf-value">{{ performance.cpu }}</text>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			systemStatus: {
				api: 'unknown',
				mongodb: 'unknown',
				redis: 'unknown'
			},
			uptime: '0s',
			performance: {
				memory: '0MB',
				cpu: '0%'
			}
		}
	},
	onLoad() {
		this.loadSystemStatus();
	},
	methods: {
		goBack() {
			uni.navigateBack();
		},

		async loadSystemStatus() {
			try {
				const response = await uni.request({
					url: 'http://localhost:3000/api/health',
					method: 'GET'
				});

				if (response.data && response.data.success) {
					const data = response.data.data;
					this.systemStatus = {
						api: data.services.api,
						mongodb: data.services.mongodb,
						redis: data.services.redis
					};
					
					// 计算运行时间
					if (data.uptime) {
						this.uptime = this.formatUptime(data.uptime);
					}
				}
			} catch (error) {
				console.error('获取系统状态失败:', error);
			}
		},

		refreshStatus() {
			this.loadSystemStatus();
			uni.showToast({
				title: '已刷新',
				icon: 'success'
			});
		},

		formatUptime(seconds) {
			const hours = Math.floor(seconds / 3600);
			const minutes = Math.floor((seconds % 3600) / 60);
			const secs = Math.floor(seconds % 60);
			
			if (hours > 0) {
				return `${hours}h ${minutes}m ${secs}s`;
			} else if (minutes > 0) {
				return `${minutes}m ${secs}s`;
			} else {
				return `${secs}s`;
			}
		}
	}
}
</script>

<style scoped>
.status-page {
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
	display: flex;
	justify-content: flex-end;
}

.refresh-btn {
	font-size: 24rpx;
	color: #3b82f6;
	font-weight: 500;
}

.status-content {
	padding: 32rpx 20rpx;
}

.status-section, .performance-section {
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

.status-items {
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}

.status-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 20rpx;
	background: #f8fafc;
	border-radius: 12rpx;
}

.status-label {
	font-size: 28rpx;
	color: #374151;
	font-weight: 500;
}

.status-value {
	font-size: 24rpx;
	font-weight: 600;
	padding: 8rpx 16rpx;
	border-radius: 8rpx;
}

.status-value.healthy, .status-value.connected {
	background: #dcfce7;
	color: #166534;
}

.status-value.unknown, .status-value.disconnected {
	background: #fef2f2;
	color: #dc2626;
}

.performance-grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 16rpx;
}

.performance-item {
	background: #f8fafc;
	padding: 24rpx;
	border-radius: 12rpx;
	text-align: center;
}

.perf-label {
	font-size: 24rpx;
	color: #6b7280;
	display: block;
	margin-bottom: 8rpx;
}

.perf-value {
	font-size: 28rpx;
	color: #1f2937;
	font-weight: 600;
}
</style> 