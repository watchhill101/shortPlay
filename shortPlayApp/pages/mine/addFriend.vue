<template>
	<view class="add-friend-page">
		<!-- 自定义导航栏 -->
		<view class="custom-navbar">
			<view class="navbar-left" @click="goBack">
				<text class="back-icon">←</text>
			</view>
			<view class="navbar-title">添加好友</view>
			<view class="navbar-right" @click="goToApiTest">
				<text class="test-icon">🔧</text>
			</view>
		</view>

		<!-- 搜索区域 -->
		<view class="search-section">
			<view class="search-input-wrapper">
				<input 
					v-model="searchKeyword"
					placeholder="输入手机号或昵称搜索用户"
					class="search-input"
					@confirm="searchUsers"
					@input="onInputChange"
					confirm-type="search"
				/>
				<view class="search-icon">🔍</view>
			</view>
			<view 
				:class="['search-btn', { 'disabled': searching }]"
				@tap.stop="handleSearchClick"
			>
				<text class="search-btn-text">{{ searching ? '搜索中...' : '搜索' }}</text>
			</view>
		</view>

		<!-- 搜索结果 -->
		<view class="search-results">
			<view v-if="searching" class="loading-state">
				<u-loading-icon></u-loading-icon>
				<text>搜索中...</text>
			</view>
			
			<view v-else-if="searchResults.length === 0 && hasSearched" class="empty-state">
				<view class="empty-icon">🔍</view>
				<view class="empty-text">未找到相关用户</view>
				<view class="empty-desc">请尝试其他关键词</view>
			</view>
			
			<view v-else-if="searchResults.length > 0">
				<view class="results-header">
					<text class="results-title">搜索结果</text>
					<text class="results-count">共{{ totalResults }}个用户</text>
				</view>
				
				<view 
					v-for="user in searchResults" 
					:key="user._id"
					class="user-item"
				>
					<view class="user-avatar">
						<image :src="user.avatar || '/static/img/default-avatar.png'" class="avatar-img"></image>
						<view v-if="user.status === 'active'" class="online-dot"></view>
					</view>
					<view class="user-info">
						<view class="user-name">{{ user.nickname }}</view>
						<view v-if="user.douyinProfile?.nickname && user.douyinProfile.nickname !== user.nickname" class="user-douyin">
							抖音: {{ user.douyinProfile.nickname }}
						</view>
						<view v-if="user.mobilePhoneNumber" class="user-phone">
							📱 {{ user.mobilePhoneNumber.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') }}
						</view>
						<view v-else class="user-phone">
							📱 仅抖音登录
						</view>
						<view v-if="user.douyinProfile?.city" class="user-location">
							📍 {{ user.douyinProfile.city }}
						</view>
						<view class="user-status">{{ formatLastSeen(user.lastLoginAt) }}</view>
					</view>
					<view class="user-actions">
						<u-button 
							v-if="!user.relationStatus"
							text="添加" 
							type="primary" 
							size="small"
							@click="sendFriendRequest(user)"
						></u-button>
						<u-button 
							v-else-if="user.relationStatus === 'pending'"
							text="已申请" 
							type="info" 
							size="small"
							:disabled="true"
						></u-button>
						<u-button 
							v-else-if="user.relationStatus === 'accepted'"
							text="已是好友" 
							type="success" 
							size="small"
							:disabled="true"
						></u-button>
						<u-button 
							v-else-if="user.relationStatus === 'rejected'"
							text="已拒绝" 
							type="error" 
							size="small"
							:disabled="true"
						></u-button>
					</view>
				</view>
				
				<!-- 加载更多 -->
				<view v-if="hasMoreResults" class="load-more" @click="loadMoreUsers">
					<text>加载更多</text>
				</view>
			</view>
		</view>

		<!-- 快速添加推荐 -->
		<view v-if="!hasSearched" class="recommendations-section">
			<view class="section-title">🌟 推荐用户</view>
			<view class="recommendation-list">
				<view 
					v-for="user in recommendedUsers" 
					:key="user.id"
					class="recommendation-item"
				>
					<view class="rec-avatar">
						<image :src="user.avatar" class="rec-avatar-img"></image>
					</view>
					<view class="rec-info">
						<view class="rec-name">{{ user.nickname }}</view>
						<view class="rec-desc">{{ user.description }}</view>
					</view>
					<view class="rec-action">
						<u-button 
							v-if="!user.added"
							text="添加" 
							type="primary" 
							size="mini"
							@click.stop="sendQuickFriendRequest(user)"
						></u-button>
						<u-button 
							v-else
							text="已申请" 
							type="info" 
							size="mini"
							:disabled="true"
						></u-button>
					</view>
				</view>
			</view>
		</view>

		<!-- 使用提示 -->
		<view v-if="!hasSearched" class="tips-section">
			<view class="tips-title">🔍 搜索提示</view>
			<view class="tips-list">
				<view class="tip-item">• 按昵称搜索: "小明"、"小红"、"王五"</view>
				<view class="tip-item">• 按手机号搜索: "138"、"18656630591"</view>
				<view class="tip-item">• 按抖音昵称搜索: "小明同学"、"王五同学"</view>
				<view class="tip-item">• 按城市搜索: "上海"、"广州"、"成都"</view>
			</view>
		</view>
	</view>
</template>

<script>
import authService from '@/utils/authService'
import friendService from '@/utils/friendService'

export default {
	data() {
		return {
			searchKeyword: '',
			searchResults: [],
			searching: false,
			hasSearched: false,
			currentPage: 1,
			pageSize: 20,
			hasMoreResults: false,
			totalResults: 0,
			currentUser: null,
			recommendedUsers: []
		}
	},
	onLoad() {
		this.currentUser = authService.getCurrentUser();
		this.loadRecommendedUsers();
	},
	onBackPress() {
		// 处理物理返回键
		this.goBack();
		return true; // 阻止默认返回行为
	},
	methods: {
		// 处理搜索按钮点击
		handleSearchClick() {
			console.log('搜索按钮被点击');
			
			// 如果正在搜索中，阻止重复点击
			if (this.searching) {
				return;
			}
			
			// 检查搜索关键词
			if (!this.searchKeyword.trim()) {
				uni.showToast({
					title: '请输入搜索内容',
					icon: 'none'
				});
				return;
			}
			
			// 执行搜索
			this.searchUsers();
		},

		// 搜索用户 - 连接真实后端
		async searchUsers() {
			// 如果正在搜索中，阻止重复搜索
			if (this.searching) {
				return;
			}
			
			const keyword = this.searchKeyword.trim();
			if (!keyword) {
				uni.showToast({
					title: '请输入搜索内容',
					icon: 'none'
				});
				return;
			}

			this.searching = true;
			this.currentPage = 1;
			this.searchResults = [];
			
			try {
				// 连接真实后端API
				const response = await uni.request({
					url: 'http://localhost:3000/api/friends/search/users',
					method: 'GET',
					data: {
						keyword,
						currentUserId: this.currentUser.id,
						page: this.currentPage,
						limit: this.pageSize
					},
					header: {
						'Authorization': `Bearer ${authService.getToken()}`
					}
				});

				if (response.data && response.data.success) {
					this.searchResults = response.data.data.users;
					this.totalResults = response.data.data.pagination.total;
					this.hasMoreResults = response.data.data.users.length === this.pageSize;
					this.hasSearched = true;

					if (this.searchResults.length === 0) {
						uni.showToast({
							title: '未找到相关用户',
							icon: 'none'
						});
					}
				} else {
					throw new Error(response.data?.message || '搜索失败');
				}
				
			} catch (error) {
				console.error('搜索用户失败:', error);
				
				// 如果后端连接失败，提示用户
				uni.showModal({
					title: '搜索失败',
					content: '无法连接到服务器，请检查网络连接或联系管理员',
					showCancel: false
				});
			} finally {
				this.searching = false;
			}
		},

		// 加载更多用户
		async loadMoreUsers() {
			if (this.searching || !this.hasMoreResults) return;
			
			this.currentPage++;
			this.searching = true;
			
			try {
				const response = await friendService.searchUsers(
					this.searchKeyword.trim(), 
					this.currentUser.id, 
					{
						page: this.currentPage,
						limit: this.pageSize
					}
				);

				if (response.success) {
					const newUsers = response.data.users;
					this.searchResults.push(...newUsers);
					this.hasMoreResults = newUsers.length === this.pageSize;
				}
			} catch (error) {
				console.error('加载更多失败:', error);
				this.currentPage--; // 回退页码
			} finally {
				this.searching = false;
			}
		},

		// 发送好友申请
		async sendFriendRequest(user) {
			uni.showModal({
				title: '添加好友',
				content: `确定要添加"${user.nickname}"为好友吗？`,
				editable: true,
				placeholderText: '请输入验证信息（可选）',
				success: async (res) => {
					if (res.confirm) {
						await this.doSendFriendRequest(user._id, res.content || '我想加你为好友', user);
					}
				}
			});
		},

		// 执行发送好友申请 - 连接真实后端
		async doSendFriendRequest(recipientId, message, user) {
			try {
				uni.showLoading({ title: '发送中...' });
				
				// 连接真实后端API
				const response = await uni.request({
					url: 'http://localhost:3000/api/friends/request',
					method: 'POST',
					data: {
						requesterId: this.currentUser.id,
						recipientId: recipientId,
						message: message
					},
					header: {
						'Authorization': `Bearer ${authService.getToken()}`,
						'Content-Type': 'application/json'
					}
				});

				uni.hideLoading();

				if (response.data && response.data.success) {
					uni.showToast({
						title: `已向${user.nickname}发送好友申请`,
						icon: 'success'
					});
					
					// 更新搜索结果中的状态
					const userIndex = this.searchResults.findIndex(u => u._id === recipientId);
					if (userIndex >= 0) {
						this.searchResults[userIndex].relationStatus = 'pending';
					}
				} else {
					throw new Error(response.data?.message || '发送失败');
				}
				
			} catch (error) {
				uni.hideLoading();
				console.error('发送好友申请失败:', error);
				
				uni.showModal({
					title: '发送失败',
					content: error.message || '无法连接到服务器，请检查网络连接',
					showCancel: false
				});
			}
		},

		// 快速发送好友申请（推荐用户） - 连接真实后端
		async sendQuickFriendRequest(user) {
			if (!this.currentUser) {
				uni.showToast({
					title: '请先登录',
					icon: 'none'
				});
				return;
			}

			try {
				uni.showLoading({ title: '添加中...' });
				
				// 连接真实后端API发送好友申请
				const response = await uni.request({
					url: 'http://localhost:3000/api/friends/request',
					method: 'POST',
					data: {
						requesterId: this.currentUser.id,
						recipientId: user.id,
						message: '通过推荐添加你为好友'
					},
					header: {
						'Authorization': `Bearer ${authService.getToken()}`,
						'Content-Type': 'application/json'
					}
				});
				
				uni.hideLoading();
				
				if (response.data && response.data.success) {
					uni.showToast({
						title: `已向${user.nickname}发送好友申请`,
						icon: 'success'
					});
					
					// 标记为已添加状态
					const userIndex = this.recommendedUsers.findIndex(u => u.id === user.id);
					if (userIndex >= 0) {
						this.recommendedUsers[userIndex].added = true;
					}
				} else {
					throw new Error(response.data?.message || '发送失败');
				}

			} catch (error) {
				uni.hideLoading();
				console.error('发送好友申请失败:', error);
				
				uni.showModal({
					title: '添加失败',
					content: error.message || '无法连接到服务器，请检查网络连接',
					showCancel: false
				});
			}
		},

		// 加载推荐用户 - 从真实数据库获取
		async loadRecommendedUsers() {
			try {
				// 获取最近注册的用户作为推荐
				const response = await uni.request({
					url: 'http://localhost:3000/api/friends/search/users',
					method: 'GET',
					data: {
						keyword: '', // 空关键词获取所有用户
						currentUserId: this.currentUser?.id || '',
						page: 1,
						limit: 3
					},
					header: {
						'Authorization': `Bearer ${authService.getToken()}`
					}
				});

				if (response.data && response.data.success) {
					this.recommendedUsers = response.data.data.users.map(user => ({
						id: user._id,
						nickname: user.nickname,
						avatar: user.avatar || '/static/img/default-avatar.png',
						description: this.getRecommendReason(user),
						mobilePhoneNumber: user.mobilePhoneNumber,
						douyinProfile: user.douyinProfile,
						added: user.relationStatus === 'pending'
					}));
				}
			} catch (error) {
				console.error('加载推荐用户失败:', error);
				// 如果后端连接失败，使用空数组
				this.recommendedUsers = [];
			}
		},

		// 获取推荐理由
		getRecommendReason(user) {
			if (user.douyinProfile?.city) {
				return `推荐好友 · ${user.douyinProfile.city}`;
			} else if (user.mobilePhoneNumber) {
				return '可能认识的人';
			} else {
				return '推荐用户';
			}
		},

		// 输入变化处理
		onInputChange(e) {
			this.searchKeyword = e.detail.value;
		},

		// 清除搜索
		clearSearch() {
			this.searchKeyword = '';
			this.searchResults = [];
			this.hasSearched = false;
		},

		// 跳转到API测试页面
		goToApiTest() {
			uni.navigateTo({
				url: '/pages/mine/quickTest'
			});
		},

		// 返回上一页
		goBack() {
			// 检查页面栈，如果只有一个页面则跳转到好友列表
			const pages = getCurrentPages();
			if (pages.length <= 1) {
				uni.reLaunch({
					url: '/pages/mine/friendList'
				});
			} else {
				uni.navigateBack({
					delta: 1
				});
			}
		},

		// 格式化最后在线时间
		formatLastSeen(lastLoginAt) {
			if (!lastLoginAt) return '从未登录';
			
			try {
				const time = new Date(lastLoginAt);
				const now = new Date();
				const diff = now - time;
				
				if (diff < 300000) { // 5分钟内
					return '在线';
				} else if (diff < 3600000) { // 1小时内
					return `${Math.floor(diff / 60000)}分钟前在线`;
				} else if (diff < 86400000) { // 1天内
					return `${Math.floor(diff / 3600000)}小时前在线`;
				} else {
					return `${Math.floor(diff / 86400000)}天前在线`;
				}
			} catch (error) {
				return '未知';
			}
		}
	}
}
</script>

<style scoped>
.add-friend-page {
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

.back-icon, .test-icon {
	font-size: 36rpx;
	font-weight: bold;
}

.navbar-title {
	font-size: 32rpx;
	font-weight: bold;
}

/* 搜索区域 */
.search-section {
	display: flex;
	align-items: center;
	padding: 30rpx 20rpx;
	background: white;
	margin: 20rpx;
	border-radius: 20rpx;
	gap: 20rpx;
}

.search-input-wrapper {
	flex: 1;
	position: relative;
	background: #f8f9fa;
	border-radius: 25rpx;
	border: 2rpx solid #e9ecef;
}

.search-input {
	width: 100%;
	height: 80rpx;
	padding: 0 50rpx 0 80rpx;
	border: none;
	border-radius: 25rpx;
	font-size: 28rpx;
	background: transparent;
}

.search-input::placeholder {
	color: #999;
}

.search-icon {
	position: absolute;
	left: 25rpx;
	top: 50%;
	transform: translateY(-50%);
	font-size: 32rpx;
	color: #666;
}

.search-btn {
	padding: 20rpx 30rpx;
	background: linear-gradient(45deg, #667eea, #764ba2);
	color: white;
	border-radius: 25rpx;
	transition: all 0.3s ease;
	user-select: none;
}

.search-btn:active:not(.disabled) {
	transform: scale(0.95);
	opacity: 0.8;
}

.search-btn.disabled {
	background: #ccc !important;
	color: #999 !important;
	pointer-events: none;
	opacity: 0.6;
}

.search-btn-text {
	font-size: 28rpx;
	font-weight: bold;
}

/* 搜索结果 */
.search-results {
	padding: 0 20rpx;
}

.results-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 20rpx 0;
}

.results-title {
	font-size: 28rpx;
	font-weight: bold;
	color: #333;
}

.results-count {
	font-size: 24rpx;
	color: #666;
}

.user-item {
	display: flex;
	align-items: center;
	padding: 30rpx;
	margin-bottom: 20rpx;
	background: white;
	border-radius: 20rpx;
	box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.1);
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

.online-dot {
	position: absolute;
	bottom: 5rpx;
	right: 5rpx;
	width: 20rpx;
	height: 20rpx;
	background: #52c41a;
	border: 3rpx solid white;
	border-radius: 50%;
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

.user-douyin {
	font-size: 24rpx;
	color: #1890ff;
	margin-bottom: 5rpx;
}

.user-phone {
	font-size: 26rpx;
	color: #666;
	margin-bottom: 5rpx;
}

.user-location {
	font-size: 24rpx;
	color: #52c41a;
	margin-bottom: 5rpx;
}

.user-status {
	font-size: 24rpx;
	color: #999;
}

.user-actions {
	padding: 0 20rpx;
}

/* 加载状态 */
.loading-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 100rpx 40rpx;
	color: #999;
	gap: 20rpx;
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

/* 使用提示 */
.tips-section {
	background: white;
	margin: 20rpx;
	border-radius: 20rpx;
	padding: 30rpx;
}

.tips-title {
	font-size: 28rpx;
	font-weight: bold;
	color: #333;
	margin-bottom: 20rpx;
}

.tips-list {
	padding-left: 20rpx;
}

.tip-item {
	font-size: 26rpx;
	color: #666;
	line-height: 2;
}

/* 推荐用户区域 */
.recommendations-section {
	background: white;
	margin: 20rpx;
	border-radius: 20rpx;
	padding: 30rpx;
}

.section-title {
	font-size: 28rpx;
	font-weight: bold;
	color: #333;
	margin-bottom: 20rpx;
}

.recommendation-list {
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}

.recommendation-item {
	display: flex;
	align-items: center;
	padding: 20rpx;
	background: #f8f9fa;
	border-radius: 15rpx;
	transition: all 0.3s ease;
}

.recommendation-item:active {
	background: #e9ecef;
}

.rec-avatar {
	margin-right: 20rpx;
}

.rec-avatar-img {
	width: 80rpx;
	height: 80rpx;
	border-radius: 50%;
	object-fit: cover;
}

.rec-info {
	flex: 1;
}

.rec-name {
	font-size: 28rpx;
	font-weight: bold;
	color: #333;
	margin-bottom: 5rpx;
}

.rec-desc {
	font-size: 24rpx;
	color: #666;
}

.rec-action {
	padding: 0 10rpx;
}

/* 加载更多 */
.load-more {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 40rpx;
	color: #666;
	font-size: 28rpx;
	background: white;
	margin: 20rpx;
	border-radius: 20rpx;
}
</style>