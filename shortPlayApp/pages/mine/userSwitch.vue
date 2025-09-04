<template>
	<view class="user-switch-page">
		<!-- 自定义导航栏 -->
		<view class="custom-navbar">
			<view class="navbar-left" @click="goBack">
				<text class="back-icon">←</text>
			</view>
			<view class="navbar-title">切换用户</view>
			<view class="navbar-right" @click="addNewUser">
				<text class="add-icon">+</text>
			</view>
		</view>

		<!-- 用户列表 -->
		<view class="user-list">
			<view 
				v-for="user in savedUsers" 
				:key="user.id"
				class="user-item"
				:class="{ 'current': user.id === currentUserId }"
				@click="switchUser(user.id)"
			>
				<view class="user-avatar">
					<image :src="user.avatar || '/static/img/default-avatar.png'" class="avatar-img"></image>
					<view v-if="user.id === currentUserId" class="current-badge">当前</view>
				</view>
				<view class="user-info">
					<view class="user-name">{{ user.nickname || user.username }}</view>
					<view class="user-phone">{{ user.mobilePhoneNumber || '未绑定手机' }}</view>
					<view class="last-login">最后登录: {{ formatTime(user.lastLoginTime) }}</view>
				</view>
				<view class="user-actions">
					<view v-if="user.id !== currentUserId" class="switch-btn" @click.stop="switchUser(user.id)">
						切换
					</view>
					<view class="delete-btn" @click.stop="confirmDeleteUser(user.id)">
						删除
					</view>
				</view>
			</view>
		</view>

		<!-- 空状态 -->
		<view v-if="savedUsers.length === 0" class="empty-state">
			<view class="empty-icon">👤</view>
			<view class="empty-text">暂无保存的用户</view>
			<view class="empty-desc">登录后会自动保存用户信息</view>
		</view>

		<!-- 底部操作 -->
		<view class="bottom-actions">
			<view class="action-btn logout-all" @click="confirmLogoutAll">
				清除所有用户
			</view>
		</view>
	</view>
</template>

<script>
import authService from '@/utils/authService'

export default {
	data() {
		return {
			savedUsers: [],
			currentUserId: null
		}
	},
	onLoad() {
		this.loadUserList();
	},
	onShow() {
		this.loadUserList();
	},
	methods: {
		// 加载用户列表
		loadUserList() {
			this.savedUsers = authService.getSavedUsers();
			this.currentUserId = authService.getCurrentUserId();
		},

		// 切换用户
		switchUser(userId) {
			if (userId === this.currentUserId) {
				uni.showToast({
					title: '已经是当前用户',
					icon: 'none'
				});
				return;
			}

			uni.showLoading({
				title: '切换中...'
			});

			try {
				const success = authService.switchToUser(userId);
				if (success) {
					uni.hideLoading();
					uni.showToast({
						title: '切换成功',
						icon: 'success'
					});
					
					// 更新当前用户ID
					this.currentUserId = userId;
					
					// 延迟返回，让用户看到成功提示
					setTimeout(() => {
						this.goBack();
					}, 1500);
				} else {
					throw new Error('切换失败');
				}
			} catch (error) {
				uni.hideLoading();
				uni.showToast({
					title: error.message || '切换失败',
					icon: 'error'
				});
			}
		},

		// 确认删除用户
		confirmDeleteUser(userId) {
			const user = this.savedUsers.find(u => u.id === userId);
			if (!user) return;

			uni.showModal({
				title: '确认删除',
				content: `确定要删除用户"${user.nickname || user.username}"吗？`,
				success: (res) => {
					if (res.confirm) {
						this.deleteUser(userId);
					}
				}
			});
		},

		// 删除用户
		deleteUser(userId) {
			try {
				const success = authService.removeUserFromList(userId);
				if (success) {
					uni.showToast({
						title: '删除成功',
						icon: 'success'
					});
					this.loadUserList();
				} else {
					throw new Error('删除失败');
				}
			} catch (error) {
				uni.showToast({
					title: error.message || '删除失败',
					icon: 'error'
				});
			}
		},

		// 确认清除所有用户
		confirmLogoutAll() {
			uni.showModal({
				title: '确认清除',
				content: '确定要清除所有用户信息吗？清除后需要重新登录。',
				success: (res) => {
					if (res.confirm) {
						this.logoutAll();
					}
				}
			});
		},

		// 清除所有用户
		logoutAll() {
			try {
				const success = authService.logoutAll();
				if (success) {
					uni.showToast({
						title: '已清除所有用户',
						icon: 'success'
					});
					
					setTimeout(() => {
						uni.reLaunch({
							url: '/pages/login/index'
						});
					}, 1500);
				} else {
					throw new Error('清除失败');
				}
			} catch (error) {
				uni.showToast({
					title: error.message || '清除失败',
					icon: 'error'
				});
			}
		},

		// 添加新用户
		addNewUser() {
			uni.navigateTo({
				url: '/pages/login/index?from=switch'
			});
		},

		// 返回上一页
		goBack() {
			uni.navigateBack();
		},

		// 格式化时间
		formatTime(timeStr) {
			if (!timeStr) return '未知';
			
			try {
				const time = new Date(timeStr);
				const now = new Date();
				const diff = now - time;
				
				if (diff < 60000) { // 1分钟内
					return '刚刚';
				} else if (diff < 3600000) { // 1小时内
					return `${Math.floor(diff / 60000)}分钟前`;
				} else if (diff < 86400000) { // 1天内
					return `${Math.floor(diff / 3600000)}小时前`;
				} else if (diff < 2592000000) { // 30天内
					return `${Math.floor(diff / 86400000)}天前`;
				} else {
					return time.toLocaleDateString();
				}
			} catch (error) {
				return '未知';
			}
		}
	}
}
</script>

<style scoped>
.user-switch-page {
	min-height: 100vh;
	background-color: #f5f5f5;
}

/* 自定义导航栏 */
.custom-navbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	height: 88rpx;
	padding: 0 30rpx;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: white;
	position: sticky;
	top: 0;
	z-index: 100;
}

.navbar-left, .navbar-right {
	width: 80rpx;
	height: 60rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.back-icon, .add-icon {
	font-size: 36rpx;
	font-weight: bold;
}

.navbar-title {
	font-size: 32rpx;
	font-weight: bold;
}

/* 用户列表 */
.user-list {
	padding: 20rpx;
}

.user-item {
	display: flex;
	align-items: center;
	padding: 30rpx;
	margin-bottom: 20rpx;
	background: white;
	border-radius: 20rpx;
	box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.1);
	transition: all 0.3s ease;
}

.user-item.current {
	border: 4rpx solid #667eea;
	box-shadow: 0 4rpx 20rpx rgba(102, 126, 234, 0.3);
}

.user-avatar {
	position: relative;
	margin-right: 30rpx;
}

.avatar-img {
	width: 100rpx;
	height: 100rpx;
	border-radius: 50%;
	object-fit: cover;
}

.current-badge {
	position: absolute;
	bottom: -5rpx;
	right: -5rpx;
	background: #667eea;
	color: white;
	font-size: 20rpx;
	padding: 4rpx 8rpx;
	border-radius: 10rpx;
	border: 2rpx solid white;
}

.user-info {
	flex: 1;
}

.user-name {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
	margin-bottom: 8rpx;
}

.user-phone {
	font-size: 26rpx;
	color: #666;
	margin-bottom: 5rpx;
}

.last-login {
	font-size: 22rpx;
	color: #999;
}

.user-actions {
	display: flex;
	flex-direction: column;
	gap: 15rpx;
}

.switch-btn, .delete-btn {
	padding: 10rpx 20rpx;
	border-radius: 30rpx;
	font-size: 24rpx;
	text-align: center;
	min-width: 80rpx;
}

.switch-btn {
	background: linear-gradient(45deg, #667eea, #764ba2);
	color: white;
}

.delete-btn {
	background: #ff4757;
	color: white;
}

/* 空状态 */
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 100rpx 40rpx;
	color: #999;
}

.empty-icon {
	font-size: 120rpx;
	margin-bottom: 30rpx;
}

.empty-text {
	font-size: 32rpx;
	margin-bottom: 15rpx;
}

.empty-desc {
	font-size: 26rpx;
	text-align: center;
	line-height: 1.5;
}

/* 底部操作 */
.bottom-actions {
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	padding: 30rpx;
	background: white;
	border-top: 1rpx solid #f0f0f0;
	padding-bottom: calc(30rpx + env(safe-area-inset-bottom));
}

.action-btn {
	width: 100%;
	height: 80rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 40rpx;
	font-size: 30rpx;
	font-weight: bold;
}

.logout-all {
	background: #ff4757;
	color: white;
}
</style> 