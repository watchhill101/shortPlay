<template>
	<view class="connection-test-page">
		<view class="nav-bar">
			<view class="nav-left" @click="goBack">
				<text class="back-icon">←</text>
			</view>
			<view class="nav-title">连接测试</view>
			<view class="nav-right"></view>
		</view>

		<view class="test-content">
			<view class="test-section">
				<text class="section-title">🔗 网络连接测试</text>
				
				<view class="test-buttons">
					<button class="test-btn" @click="testBackendConnection">测试后端连接</button>
					<button class="test-btn" @click="testDatabaseConnection">测试数据库连接</button>
					<button class="test-btn" @click="testRedisConnection">测试Redis连接</button>
					<button class="test-btn" @click="testAllConnections">测试所有连接</button>
				</view>
			</view>

			<view class="results-section">
				<text class="section-title">📊 测试结果</text>
				<scroll-view class="results-scroll" scroll-y>
					<view v-for="(result, index) in testResults" :key="index" class="result-item">
						<view class="result-header">
							<text class="result-name">{{ result.name }}</text>
							<text class="result-status" :class="result.status">{{ result.status }}</text>
						</view>
						<text class="result-message">{{ result.message }}</text>
						<text class="result-time">{{ formatTime(result.time) }}</text>
					</view>
				</scroll-view>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			testResults: []
		}
	},
	methods: {
		goBack() {
			uni.navigateBack();
		},

		async testBackendConnection() {
			const testName = '后端API服务';
			this.addResult(testName, 'testing', '正在测试...');

			try {
				const response = await uni.request({
					url: 'http://localhost:3000/api/health',
					method: 'GET',
					timeout: 5000
				});

				if (response.statusCode === 200) {
					this.updateResult(testName, 'success', '连接成功');
				} else {
					this.updateResult(testName, 'failed', `HTTP ${response.statusCode}`);
				}
			} catch (error) {
				this.updateResult(testName, 'failed', error.message || '连接失败');
			}
		},

		async testDatabaseConnection() {
			const testName = '数据库连接';
			this.addResult(testName, 'testing', '正在测试...');

			try {
				const response = await uni.request({
					url: 'http://localhost:3000/api/health',
					method: 'GET'
				});

				if (response.data?.data?.services?.mongodb === 'connected') {
					this.updateResult(testName, 'success', 'MongoDB连接正常');
				} else {
					this.updateResult(testName, 'failed', 'MongoDB连接异常');
				}
			} catch (error) {
				this.updateResult(testName, 'failed', error.message || '测试失败');
			}
		},

		async testRedisConnection() {
			const testName = 'Redis连接';
			this.addResult(testName, 'testing', '正在测试...');

			try {
				const response = await uni.request({
					url: 'http://localhost:3000/api/health',
					method: 'GET'
				});

				if (response.data?.data?.services?.redis === 'connected') {
					this.updateResult(testName, 'success', 'Redis连接正常');
				} else {
					this.updateResult(testName, 'failed', 'Redis连接异常');
				}
			} catch (error) {
				this.updateResult(testName, 'failed', error.message || '测试失败');
			}
		},

		async testAllConnections() {
			this.testResults = [];
			await Promise.all([
				this.testBackendConnection(),
				this.testDatabaseConnection(),
				this.testRedisConnection()
			]);
		},

		addResult(name, status, message) {
			this.testResults.push({
				name,
				status,
				message,
				time: new Date()
			});
		},

		updateResult(name, status, message) {
			const index = this.testResults.findIndex(r => r.name === name);
			if (index >= 0) {
				this.testResults[index].status = status;
				this.testResults[index].message = message;
				this.testResults[index].time = new Date();
			}
		},

		formatTime(time) {
			return time.toLocaleTimeString();
		}
	}
}
</script>

<style scoped>
.connection-test-page {
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

.test-section, .results-section {
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

.results-scroll {
	height: 400rpx;
	border: 1px solid #e5e7eb;
	border-radius: 12rpx;
	padding: 16rpx;
}

.result-item {
	margin-bottom: 16rpx;
	padding: 16rpx;
	background: #f8fafc;
	border-radius: 8rpx;
}

.result-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 8rpx;
}

.result-name {
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

.result-status.testing {
	background: #dbeafe;
	color: #1d4ed8;
}

.result-message {
	font-size: 22rpx;
	color: #6b7280;
	margin-bottom: 4rpx;
}

.result-time {
	font-size: 18rpx;
	color: #9ca3af;
}
</style> 