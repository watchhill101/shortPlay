<template>
	<view class="test-page">
		<view class="nav-bar">
			<view class="nav-left" @click="goBack">
				<text class="back-icon">←</text>
			</view>
			<view class="nav-title">API测试</view>
			<view class="nav-right"></view>
		</view>

		<view class="test-content">
			<view class="test-section">
				<text class="section-title">🔧 API快速测试</text>
				
				<view class="test-buttons">
					<button class="test-btn" @click="testHealthAPI">测试健康检查</button>
					<button class="test-btn" @click="testUserAPI">测试用户API</button>
					<button class="test-btn" @click="testFriendAPI">测试好友API</button>
					<button class="test-btn" @click="testChatAPI">测试聊天API</button>
				</view>
			</view>

			<view class="result-section" v-if="testResult">
				<text class="result-title">测试结果：</text>
				<view class="result-content">
					<text class="result-text">{{ testResult }}</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import authService from '@/utils/authService'

export default {
	data() {
		return {
			testResult: ''
		}
	},
	methods: {
		goBack() {
			uni.navigateBack();
		},

		async testHealthAPI() {
			try {
				const response = await uni.request({
					url: 'http://localhost:3000/api/health',
					method: 'GET'
				});
				
				this.testResult = `✅ 健康检查成功: ${JSON.stringify(response.data, null, 2)}`;
			} catch (error) {
				this.testResult = `❌ 健康检查失败: ${error.message}`;
			}
		},

		async testUserAPI() {
			try {
				const response = await uni.request({
					url: 'http://localhost:3000/api/users/me',
					method: 'GET',
					header: {
						'Authorization': `Bearer ${authService.getToken()}`
					}
				});
				
				this.testResult = `✅ 用户API测试成功: ${JSON.stringify(response.data, null, 2)}`;
			} catch (error) {
				this.testResult = `❌ 用户API测试失败: ${error.message}`;
			}
		},

		async testFriendAPI() {
			try {
				const userInfo = authService.getCurrentUser();
				const response = await uni.request({
					url: `http://localhost:3000/api/friends/list/${userInfo.id}`,
					method: 'GET',
					header: {
						'Authorization': `Bearer ${authService.getToken()}`
					}
				});
				
				this.testResult = `✅ 好友API测试成功: ${JSON.stringify(response.data, null, 2)}`;
			} catch (error) {
				this.testResult = `❌ 好友API测试失败: ${error.message}`;
			}
		},

		async testChatAPI() {
			try {
				const response = await uni.request({
					url: 'http://localhost:3000/api/chat/conversations',
					method: 'GET',
					header: {
						'Authorization': `Bearer ${authService.getToken()}`
					}
				});
				
				this.testResult = `✅ 聊天API测试成功: ${JSON.stringify(response.data, null, 2)}`;
			} catch (error) {
				this.testResult = `❌ 聊天API测试失败: ${error.message}`;
			}
		}
	}
}
</script>

<style scoped>
.test-page {
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

.test-section {
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

.result-section {
	background: #ffffff;
	border-radius: 16rpx;
	padding: 32rpx;
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.result-title {
	font-size: 28rpx;
	font-weight: 600;
	color: #1f2937;
	margin-bottom: 16rpx;
}

.result-content {
	background: #f8fafc;
	border-radius: 8rpx;
	padding: 20rpx;
}

.result-text {
	font-size: 24rpx;
	color: #374151;
	line-height: 1.5;
	white-space: pre-wrap;
}
</style> 