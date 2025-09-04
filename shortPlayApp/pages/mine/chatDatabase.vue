<template>
	<view class="database-page">
		<view class="nav-bar">
			<view class="nav-left" @click="goBack">
				<text class="back-icon">←</text>
			</view>
			<view class="nav-title">聊天数据库</view>
			<view class="nav-right">
				<text class="refresh-btn" @click="loadData">刷新</text>
			</view>
		</view>

		<view class="database-content">
			<view class="stats-section">
				<text class="section-title">💾 数据库统计</text>
				<view class="stats-grid">
					<view class="stat-item">
						<text class="stat-value">{{ stats.totalMessages }}</text>
						<text class="stat-label">总消息数</text>
					</view>
					<view class="stat-item">
						<text class="stat-value">{{ stats.totalUsers }}</text>
						<text class="stat-label">用户数</text>
					</view>
					<view class="stat-item">
						<text class="stat-value">{{ stats.totalConversations }}</text>
						<text class="stat-label">会话数</text>
					</view>
				</view>
			</view>

			<view class="messages-section">
				<text class="section-title">📝 最近消息</text>
				<scroll-view class="messages-scroll" scroll-y>
					<view v-for="(msg, index) in recentMessages" :key="index" class="message-item">
						<view class="message-header">
							<text class="message-sender">{{ msg.fromUser?.nickname || 'Unknown' }}</text>
							<text class="message-time">{{ formatTime(msg.createdAt) }}</text>
						</view>
						<text class="message-content">{{ msg.content }}</text>
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
			stats: {
				totalMessages: 0,
				totalUsers: 0,
				totalConversations: 0
			},
			recentMessages: []
		}
	},
	onLoad() {
		this.loadData();
	},
	methods: {
		goBack() {
			uni.navigateBack();
		},

		async loadData() {
			await Promise.all([
				this.loadStats(),
				this.loadRecentMessages()
			]);
		},

		async loadStats() {
			try {
				// 这里可以调用后端API获取统计数据
				// 暂时使用模拟数据
				this.stats = {
					totalMessages: 156,
					totalUsers: 23,
					totalConversations: 12
				};
			} catch (error) {
				console.error('加载统计数据失败:', error);
			}
		},

		async loadRecentMessages() {
			try {
				const response = await uni.request({
					url: 'http://localhost:3000/api/chat/conversations',
					method: 'GET',
					header: {
						'Authorization': `Bearer ${authService.getToken()}`
					}
				});

				if (response.data && response.data.success) {
					this.recentMessages = response.data.data.slice(0, 20);
				}
			} catch (error) {
				console.error('加载最近消息失败:', error);
			}
		},

		formatTime(timeString) {
			if (!timeString) return '';
			const date = new Date(timeString);
			return date.toLocaleString();
		}
	}
}
</script>

<style scoped>
.database-page {
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

.database-content {
	padding: 32rpx 20rpx;
}

.stats-section, .messages-section {
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

.stats-grid {
	display: grid;
	grid-template-columns: 1fr 1fr 1fr;
	gap: 16rpx;
}

.stat-item {
	background: #f8fafc;
	padding: 24rpx;
	border-radius: 12rpx;
	text-align: center;
}

.stat-value {
	font-size: 36rpx;
	font-weight: 700;
	color: #3b82f6;
	display: block;
	margin-bottom: 8rpx;
}

.stat-label {
	font-size: 20rpx;
	color: #6b7280;
}

.messages-scroll {
	height: 400rpx;
	border: 1px solid #e5e7eb;
	border-radius: 12rpx;
	padding: 16rpx;
}

.message-item {
	margin-bottom: 16rpx;
	padding: 16rpx;
	background: #f8fafc;
	border-radius: 8rpx;
	border-left: 4rpx solid #3b82f6;
}

.message-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 8rpx;
}

.message-sender {
	font-size: 22rpx;
	color: #3b82f6;
	font-weight: 600;
}

.message-time {
	font-size: 18rpx;
	color: #9ca3af;
}

.message-content {
	font-size: 24rpx;
	color: #374151;
	line-height: 1.4;
}
</style> 