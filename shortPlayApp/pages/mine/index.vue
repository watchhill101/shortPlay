<template>
	<view class="mine-page">
		<!-- 用户信息区域 -->
		<view class="user-info-card">
			<view class="top-icons">
				<view class="moon-icon">🌙</view>
				<view class="ai-service-btn" @click="goToAIService">🤖</view>
				<view class="settings-icon" @click="showSettingsMenu">⚙️</view>
			</view>
			<view class="user-content" @click="goToUserInfo">
				<view class="avatar">
					<image :src="userInfo.avatar || '/static/img/avatar.jpg'" class="avatar-img"></image>
				</view>
				<view class="user-info">
					<view class="username">{{ userInfo.nickname || '夜空中最亮的星' }}</view>
					<view class="uid">UID: {{ userInfo.id || '961307301' }}</view>
				</view>
				<view class="vip-badge">
					<text class="vip-text">成为VIP</text>
				</view>
			</view>
		</view>

		<!-- 功能菜单 -->
		<view class="function-menu">
			<view class="menu-item" @click="goToMessages">
				<view class="menu-icon">
					<view class="icon-bg orange">
						<text class="icon">📧</text>
					</view>
					<view class="red-dot"></view>
				</view>
				<text class="menu-text">我的消息</text>
			</view>
			<view class="menu-item">
				<view class="menu-icon">
					<view class="icon-bg red">
						<text class="icon">❤️</text>
					</view>
				</view>
				<text class="menu-text">我的点赞</text>
			</view>
			<view class="menu-item">
				<view class="menu-icon">
					<view class="icon-bg green">
						<text class="icon">💬</text>
					</view>
				</view>
				<text class="menu-text">我的评论</text>
			</view>
		</view>

		<!-- 播放历史 -->
		<view class="history-section">
			<view class="section-header">
				<text class="section-title">播放历史</text>
				<text class="more-btn">更多 ></text>
			</view>
			<scroll-view scroll-x class="history-scroll">
				<view class="history-list">
					<view class="history-item">
						<image src="/static/img/drama1.jpg" class="history-cover"></image>
						<text class="history-title">这外卖可以...</text>
					</view>
					<view class="history-item">
						<image src="/static/img/drama2.jpg" class="history-cover"></image>
						<text class="history-title">可左右滑动</text>
					</view>
					<view class="history-item">
						<image src="/static/img/drama3.jpg" class="history-cover"></image>
						<text class="history-title">我姓楚是大佬</text>
					</view>
					<view class="history-item">
						<image src="/static/img/drama4.jpg" class="history-cover"></image>
						<text class="history-title">我家马</text>
					</view>
				</view>
			</scroll-view>
		</view>

		<!-- 功能列表 -->
		<view class="feature-list">
			<view class="feature-item" @click="goToUserSwitch">
				<view class="feature-left">
					<text class="feature-icon">👥</text>
					<text class="feature-text">切换用户</text>
				</view>
				<view class="user-count-badge" v-if="savedUsersCount > 1">{{ savedUsersCount }}</view>
				<text class="arrow">></text>
			</view>
			<view class="feature-item">
				<view class="feature-left">
					<text class="feature-icon">⚙️</text>
					<text class="feature-text">看剧偏好</text>
				</view>
				<text class="arrow">></text>
			</view>
			<view class="feature-item" @click="goToFriendList">
				<view class="feature-left">
					<text class="feature-icon">👥</text>
					<text class="feature-text">好友列表</text>
				</view>
				<view class="friend-count-badge" v-if="friendCount > 0">{{ friendCount }}</view>
				<text class="arrow">></text>
			</view>
			<view class="feature-item">
				<view class="feature-left">
					<text class="feature-icon">🎁</text>
					<text class="feature-text">邀请好友</text>
				</view>
				<text class="arrow">></text>
			</view>
			<view class="feature-item">
				<view class="feature-left">
					<text class="feature-icon">📹</text>
					<text class="feature-text">上传视频</text>
				</view>
				<text class="arrow">></text>
			</view>
			<view class="feature-item">
				<view class="feature-left">
					<text class="feature-icon">💎</text>
					<text class="feature-text">会员中心</text>
				</view>
				<text class="arrow">></text>
			</view>
			<view class="feature-item">
				<view class="feature-left">
					<text class="feature-icon">✏️</text>
					<text class="feature-text">意见反馈</text>
				</view>
				<text class="arrow">></text>
			</view>
			<view class="feature-item">
				<view class="feature-left">
					<text class="feature-icon">ℹ️</text>
					<text class="feature-text">关于我们</text>
				</view>
				<text class="arrow">></text>
			</view>

		</view>

		<!-- 底部导航栏 -->
		<view class="bottom-nav">
			<view class="nav-item">
				<text class="nav-icon">🏠</text>
				<text class="nav-text">首页</text>
			</view>
			<view class="nav-item">
				<text class="nav-icon">📹</text>
				<text class="nav-text">创作</text>
			</view>
			<view class="nav-item">
				<text class="nav-icon">⭐</text>
				<text class="nav-text">追剧</text>
			</view>
			<view class="nav-item">
				<text class="nav-icon">📰</text>
				<text class="nav-text">资讯</text>
			</view>
			<view class="nav-item active">
				<text class="nav-icon">👤</text>
				<text class="nav-text">我的</text>
			</view>
		</view>
	</view>
</template>

<script>
import authService from '@/utils/authService'

export default {
	data() {
		return {
			userInfo: {
				nickname: '夜空中最亮的星',
				avatar: '/static/img/avatar.jpg',
				mobilePhoneNumber: '',
				id: ''
			},
			savedUsersCount: 0,
			friendCount: 0
		}
	},
	onLoad() {
		this.loadUserInfo();
	},
	onShow() {
		// 每次显示页面时重新加载用户信息
		this.loadUserInfo();
	},
	methods: {
		// 加载用户信息
		loadUserInfo() {
			try {
				const storedUserInfo = uni.getStorageSync('userInfo');
				if (storedUserInfo) {
					this.userInfo = {
						...this.userInfo,
						...storedUserInfo
					};
				}
				
				// 获取保存的用户数量
				const savedUsers = authService.getSavedUsers();
				this.savedUsersCount = savedUsers.length;
				
				// 获取好友数量（模拟数据，实际应该调用API）
				this.loadFriendCount();
			} catch (error) {
				console.error('获取用户信息失败:', error);
			}
		},

		// 跳转到用户切换页面
		goToUserSwitch() {
			uni.navigateTo({
				url: '/pages/mine/userSwitch'
			});
		},

		// 跳转到好友列表页面
		goToFriendList() {
			uni.navigateTo({
				url: '/pages/mine/friendList'
			});
		},

		// 加载好友数量 - 连接真实数据库
		async loadFriendCount() {
			if (!this.userInfo.id) return;
			
			try {
				const response = await uni.request({
					url: `http://localhost:3000/api/friends/list/${this.userInfo.id}`,
					method: 'GET',
					data: { page: 1, limit: 1 }, // 只获取分页信息
					header: {
						'Authorization': `Bearer ${authService.getToken()}`
					}
				});

				if (response.data && response.data.success) {
					this.friendCount = response.data.data.pagination.total || 0;
				} else {
					this.friendCount = 0;
				}
			} catch (error) {
				console.error('获取好友数量失败:', error);
				this.friendCount = 0;
			}
		},


		// AI客服跳转方法
		goToAIService() {
			uni.navigateTo({
				url: '/pages/mine/chatAi'
			});
		},
		// 跳转到我的信息页面
		goToUserInfo() {
			uni.navigateTo({
				url: '/pages/mine/info'
			});
		},
		// 跳转到我的消息页面
		goToMessages() {
			uni.navigateTo({
				url: '/pages/mine/messages'
			});
		},
		// 显示设置菜单
		showSettingsMenu() {
			const savedUsers = authService.getSavedUsers();
			const itemList = savedUsers.length > 1 ? ['切换用户', '退出登录'] : ['退出登录'];
			
			uni.showActionSheet({
				itemList,
				success: (res) => {
					if (savedUsers.length > 1 && res.tapIndex === 0) {
						this.goToUserSwitch();
					} else if (res.tapIndex === (savedUsers.length > 1 ? 1 : 0)) {
						this.logout();
					}
				}
			});
		},
		// 退出登录
		logout() {
			uni.showModal({
				title: '确认退出',
				content: '确定要退出登录吗？',
				success: (res) => {
					if (res.confirm) {
						// 清除本地存储的用户信息和token
						uni.removeStorageSync('token');
						uni.removeStorageSync('userInfo');
						
						// 跳转到登录页面
						uni.reLaunch({
							url: '/pages/login/index'
						});
						
						uni.showToast({
							title: '已退出登录',
							icon: 'success'
						});
					}
				}
			});
		}
	}
}
</script>

<style scoped>
.mine-page {
	width: 100%;
	min-height: 100vh;
	background: #f8fafc;
	position: relative;
	font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
}

/* 用户信息卡片 - 简约设计 */
.user-info-card {
	margin: 20rpx;
	padding: 40rpx 32rpx;
	background: #ffffff;
	border-radius: 16rpx;
	position: relative;
	color: #1f2937;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
	border: 1px solid #e5e7eb;
}

.top-icons {
	display: flex;
	justify-content: flex-end;
	gap: 24rpx;
	margin-bottom: 32rpx;
}

.moon-icon, .settings-icon, .ai-service-btn {
	font-size: 32rpx;
	cursor: pointer;
	transition: all 0.2s ease;
	padding: 12rpx;
	border-radius: 8rpx;
	background: #f3f4f6;
	color: #6b7280;
}

.moon-icon:hover, .settings-icon:hover, .ai-service-btn:hover {
	background: #e5e7eb;
	color: #374151;
}

.user-content {
	display: flex;
	align-items: center;
	gap: 24rpx;
}

.avatar {
	width: 100rpx;
	height: 100rpx;
	border-radius: 50%;
	overflow: hidden;
	border: 2px solid #e5e7eb;
}

.avatar-img {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.user-info {
	flex: 1;
}

.username {
	font-size: 32rpx;
	font-weight: 600;
	margin-bottom: 8rpx;
	color: #1f2937;
}

.uid {
	font-size: 24rpx;
	color: #6b7280;
	font-weight: 400;
}

.vip-badge {
	background: #3b82f6;
	color: white;
	padding: 8rpx 16rpx;
	border-radius: 12rpx;
	font-size: 22rpx;
	font-weight: 500;
}

/* 功能菜单 - 简化设计 */
.function-menu {
	display: flex;
	justify-content: space-around;
	padding: 32rpx 24rpx;
	background: #ffffff;
	margin: 16rpx 20rpx;
	border-radius: 16rpx;
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
	border: 1px solid #e5e7eb;
}

.menu-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 12rpx;
	transition: all 0.2s ease;
}

.menu-item:active {
	transform: scale(0.95);
}

.menu-icon {
	position: relative;
	width: 80rpx;
	height: 80rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.icon-bg {
	width: 64rpx;
	height: 64rpx;
	border-radius: 12rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 28rpx;
	transition: all 0.2s ease;
}

.icon-bg.orange {
	background: #f97316;
	color: white;
}

.icon-bg.red {
	background: #ef4444;
	color: white;
}

.icon-bg.green {
	background: #10b981;
	color: white;
}

.red-dot {
	position: absolute;
	top: 4rpx;
	right: 4rpx;
	width: 16rpx;
	height: 16rpx;
	background: #ef4444;
	border-radius: 50%;
	border: 2px solid white;
}

.menu-text {
	font-size: 24rpx;
	color: #6b7280;
	font-weight: 400;
}

/* 播放历史 - 简化设计 */
.history-section {
	background: #ffffff;
	margin: 16rpx 20rpx;
	border-radius: 16rpx;
	padding: 24rpx;
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
	border: 1px solid #e5e7eb;
}

.section-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 24rpx;
}

.section-title {
	font-size: 28rpx;
	font-weight: 600;
	color: #1f2937;
}

.more-btn {
	font-size: 24rpx;
	color: #6b7280;
	font-weight: 400;
}

.more-btn:active {
	color: #3b82f6;
}

.history-scroll {
	white-space: nowrap;
}

.history-list {
	display: flex;
	gap: 16rpx;
	padding: 4rpx 0;
}

.history-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 12rpx;
	min-width: 100rpx;
	transition: all 0.2s ease;
}

.history-item:active {
	transform: scale(0.95);
}

.history-cover {
	width: 100rpx;
	height: 140rpx;
	border-radius: 12rpx;
	object-fit: cover;
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
}

.history-title {
	font-size: 20rpx;
	color: #6b7280;
	text-align: center;
	width: 100rpx;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-weight: 400;
}

/* 功能列表 - 简化设计 */
.feature-list {
	background: #ffffff;
	margin: 16rpx 20rpx 140rpx;
	border-radius: 16rpx;
	overflow: hidden;
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
	border: 1px solid #e5e7eb;
}

.feature-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 24rpx 32rpx;
	border-bottom: 1px solid #f3f4f6;
	transition: all 0.2s ease;
	position: relative;
}

.feature-item:last-child {
	border-bottom: none;
}

.feature-item:active {
	background: #f9fafb;
}

.feature-left {
	display: flex;
	align-items: center;
	gap: 20rpx;
}

.feature-icon {
	font-size: 28rpx;
	width: 40rpx;
	text-align: center;
	color: #6b7280;
}

.feature-text {
	font-size: 28rpx;
	color: #374151;
	font-weight: 400;
}

.arrow {
	font-size: 24rpx;
	color: #d1d5db;
	font-weight: 400;
}

.user-count-badge, .friend-count-badge {
	background: #ef4444;
	color: white;
	font-size: 18rpx;
	padding: 4rpx 8rpx;
	border-radius: 8rpx;
	margin-left: auto;
	margin-right: 16rpx;
	min-width: 24rpx;
	text-align: center;
	font-weight: 500;
}

/* 底部导航栏 - 简化设计 */
.bottom-nav {
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	height: 100rpx;
	background: #ffffff;
	display: flex;
	border-top: 1px solid #e5e7eb;
	padding-bottom: env(safe-area-inset-bottom);
}

.nav-item {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 4rpx;
	transition: all 0.2s ease;
	color: #9ca3af;
}

.nav-item.active {
	color: #3b82f6;
}

.nav-item:active {
	transform: scale(0.95);
}

.nav-icon {
	font-size: 32rpx;
	transition: all 0.2s ease;
}

.nav-text {
	font-size: 20rpx;
	font-weight: 400;
}

.nav-item.active .nav-icon {
	transform: scale(1.05);
}
</style>
