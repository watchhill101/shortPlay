<template>
	<view class="api-test-page">
		<view class="nav-bar">
			<view class="nav-left" @click="goBack">
				<text class="back-icon">←</text>
			</view>
			<view class="nav-title">API测试</view>
			<view class="nav-right"></view>
		</view>

		<view class="test-content">
			<view class="apis-section">
				<text class="section-title">🔧 API接口测试</text>
				
				<view class="api-list">
					<view v-for="api in apiList" :key="api.name" class="api-item">
						<view class="api-info">
							<text class="api-name">{{ api.name }}</text>
							<text class="api-method" :class="api.method.toLowerCase()">{{ api.method }}</text>
							<text class="api-url">{{ api.url }}</text>
						</view>
						<button class="test-api-btn" @click="testApi(api)">测试</button>
					</view>
				</view>
			</view>

			<view class="result-section" v-if="currentResult">
				<text class="section-title">📋 测试结果</text>
				<view class="result-content">
					<view class="result-header">
						<text class="result-api">{{ currentResult.api }}</text>
						<text class="result-status" :class="currentResult.success ? 'success' : 'failed'">
							{{ currentResult.success ? '成功' : '失败' }}
						</text>
					</view>
					<text class="result-data">{{ currentResult.data }}</text>
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
			apiList: [
				{ name: '健康检查', method: 'GET', url: '/api/health', auth: false },
				{ name: '用户信息', method: 'GET', url: '/api/users/me', auth: true },
				{ name: '好友列表', method: 'GET', url: '/api/friends/list', auth: true },
				{ name: '聊天会话', method: 'GET', url: '/api/chat/conversations', auth: true }
			],
			currentResult: null
		}
	},
	methods: {
		goBack() {
			uni.navigateBack();
		},

		async testApi(api) {
			this.currentResult = {
				api: api.name,
				success: false,
				data: '测试中...'
			};

			try {
				const requestConfig = {
					url: `http://localhost:3000${api.url}`,
					method: api.method
				};

				if (api.auth) {
					requestConfig.header = {
						'Authorization': `Bearer ${authService.getToken()}`
					};
				}

				// 特殊处理需要参数的API
				if (api.url.includes('/friends/list')) {
					const userInfo = authService.getCurrentUser();
					requestConfig.url = `http://localhost:3000/api/friends/list/${userInfo.id}`;
				}

				const response = await uni.request(requestConfig);

				this.currentResult = {
					api: api.name,
					success: response.statusCode === 200,
					data: JSON.stringify(response.data, null, 2)
				};

			} catch (error) {
				this.currentResult = {
					api: api.name,
					success: false,
					data: `错误: ${error.message}`
				};
			}
		}
	}
}
</script>

<style scoped>
.api-test-page {
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

.apis-section, .result-section {
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

.api-list {
	display: flex;
	flex-direction: column;
	gap: 16rpx;
}

.api-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 20rpx;
	background: #f8fafc;
	border-radius: 12rpx;
}

.api-info {
	flex: 1;
}

.api-name {
	font-size: 24rpx;
	color: #374151;
	font-weight: 600;
	display: block;
	margin-bottom: 4rpx;
}

.api-method {
	font-size: 18rpx;
	font-weight: 600;
	padding: 2rpx 8rpx;
	border-radius: 4rpx;
	margin-right: 8rpx;
}

.api-method.get {
	background: #dcfce7;
	color: #166534;
}

.api-method.post {
	background: #dbeafe;
	color: #1d4ed8;
}

.api-url {
	font-size: 20rpx;
	color: #6b7280;
}

.test-api-btn {
	background: #3b82f6;
	color: white;
	border: none;
	border-radius: 8rpx;
	padding: 16rpx 24rpx;
	font-size: 24rpx;
	font-weight: 500;
}

.result-content {
	background: #f8fafc;
	border-radius: 12rpx;
	padding: 20rpx;
}

.result-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 16rpx;
}

.result-api {
	font-size: 24rpx;
	color: #374151;
	font-weight: 600;
}

.result-status {
	font-size: 20rpx;
	font-weight: 600;
	padding: 4rpx 12rpx;
	border-radius: 8rpx;
}

.result-status.success {
	background: #dcfce7;
	color: #166534;
}

.result-status.failed {
	background: #fef2f2;
	color: #dc2626;
}

.result-data {
	font-size: 20rpx;
	color: #374151;
	line-height: 1.4;
	white-space: pre-wrap;
	word-break: break-all;
}
</style> 