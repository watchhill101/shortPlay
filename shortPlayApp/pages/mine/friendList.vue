<template>
	<view class="friend-list-page">
		<!-- 自定义导航栏 -->
		<view class="custom-navbar">
			<view class="navbar-left" @click="goBack">
				<u-icon name="arrow-left" color="#000000" :size="20"></u-icon>
			</view>
			<view class="navbar-title">好友列表</view>
			<view class="navbar-right" @click="goToAddFriend">
				<u-icon name="plus" color="#000000" :size="20"></u-icon>
			</view>
		</view>

		<!-- 顶部功能区 -->
		<view class="top-functions">
			<view class="function-item" @click="goToFriendRequests">
				<view class="function-icon friend-request-icon">
					<view class="icon-bg">
						<view class="mail-icon">
							<view class="mail-body"></view>
							<view class="mail-flap"></view>
						</view>
					</view>
					<view v-if="pendingRequestsCount > 0" class="badge">{{ pendingRequestsCount }}</view>
				</view>
				<text class="function-text">好友申请</text>
			</view>
			<view class="function-item" @click="goToAddFriend">
				<view class="function-icon add-friend-icon">
					<view class="icon-bg">
						<view class="search-glass">
							<view class="glass-circle"></view>
							<view class="glass-handle"></view>
						</view>
					</view>
				</view>
				<text class="function-text">添加好友</text>
			</view>
		</view>

		<!-- 搜索框 -->
		<view class="search-section">
			<view class="search-input-wrapper">
				<view class="search-icon">
					<view class="search-glass-mini">
						<view class="glass-circle-mini"></view>
						<view class="glass-handle-mini"></view>
					</view>
				</view>
				<input 
					v-model="searchKeyword"
					placeholder="搜索好友昵称或备注"
					class="search-input"
					@input="onSearchInput"
					confirm-type="search"
				/>
				<view v-if="searchKeyword" class="clear-icon" @click="onSearchClear">
					<view class="clear-x">
						<view class="x-line x-line1"></view>
						<view class="x-line x-line2"></view>
					</view>
				</view>
			</view>
		</view>

		<!-- 虚拟列表容器 -->
		<view class="virtual-list-container" @scroll="onScroll" :scroll-top="scrollTop">
			<view v-if="loading" class="loading-state">
				<view class="loading-spinner">
					<view class="spinner-ring"></view>
				</view>
				<text class="loading-text">加载中...</text>
			</view>
			
			<view v-else-if="friendList.length === 0" class="empty-state">
				<view class="empty-icon">
					<view class="empty-people">
						<view class="person person1">
							<view class="person-head"></view>
							<view class="person-body"></view>
						</view>
						<view class="person person2">
							<view class="person-head"></view>
							<view class="person-body"></view>
						</view>
					</view>
				</view>
				<view class="empty-text">暂无好友</view>
				<view class="empty-desc">快去添加一些好友吧</view>
				<view class="add-friend-btn" @click="goToAddFriend">
					<text class="btn-text">添加好友</text>
				</view>
			</view>
			
			<!-- 虚拟列表实现 -->
			<view v-else class="virtual-list">
				<!-- 占位容器，用于撑开滚动高度 -->
				<view class="virtual-placeholder" :style="{ height: totalHeight + 'rpx' }"></view>
				
				<!-- 可视区域容器 -->
				<view class="virtual-viewport" :style="{ transform: `translateY(${offsetY}rpx)` }">
					<view 
						v-for="friend in visibleFriends" 
						:key="friend._id"
						class="friend-item"
						@click="goToFriendChat(friend)"
					>
						<view class="friend-avatar">
							<image :src="friend.friendInfo.avatar || '/static/img/default-avatar.png'" class="avatar-img"></image>
							<view v-if="friend.friendInfo.status === 'active'" class="online-indicator">
								<view class="online-dot"></view>
								<view class="online-pulse"></view>
							</view>
						</view>
						<view class="friend-info">
							<view class="friend-name">
								{{ friend.remarkName || friend.friendInfo.nickname }}
							</view>
							<view v-if="friend.remarkName && friend.remarkName !== friend.friendInfo.nickname" class="real-name">
								{{ friend.friendInfo.nickname }}
							</view>
							<view class="friend-status">
								<view class="status-dot" :class="getStatusClass(friend.friendInfo.lastLoginAt)"></view>
								<text>{{ formatLastSeen(friend.friendInfo.lastLoginAt) }}</text>
							</view>
						</view>
						<view class="friend-actions" @click.stop>
							<view class="more-btn" @click="showFriendMenu(friend)">
								<view class="dot"></view>
								<view class="dot"></view>
								<view class="dot"></view>
							</view>
						</view>
					</view>
				</view>
			</view>
		</view>

		<!-- 加载更多 -->
		<view v-if="hasMore && !loading" class="load-more" @click="loadMoreFriends">
			<view class="load-more-content">
				<view class="load-more-icon">
					<view class="arrow-down"></view>
				</view>
				<text class="load-more-text">加载更多</text>
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
			friendList: [],
			searchKeyword: '',
			loading: false,
			hasMore: true,
			currentPage: 1,
			pageSize: 20,
			pendingRequestsCount: 0,
			currentUser: null,
			
			// 虚拟列表相关
			itemHeight: 160, // 每个好友项的高度(rpx)
			containerHeight: 0, // 容器高度
			scrollTop: 0, // 滚动位置
			visibleCount: 0, // 可视区域显示的项目数量
			bufferSize: 3 // 缓冲区大小
		}
	},
	computed: {
		// 总高度
		totalHeight() {
			return this.friendList.length * this.itemHeight;
		},
		
		// 开始索引
		startIndex() {
			const index = Math.floor(this.scrollTop / this.itemHeight);
			return Math.max(0, index - this.bufferSize);
		},
		
		// 结束索引
		endIndex() {
			const index = this.startIndex + this.visibleCount + this.bufferSize * 2;
			return Math.min(this.friendList.length, index);
		},
		
		// 可视区域的好友列表
		visibleFriends() {
			return this.friendList.slice(this.startIndex, this.endIndex);
		},
		
		// 偏移量
		offsetY() {
			return this.startIndex * this.itemHeight;
		}
	},
	
	onLoad() {
		this.currentUser = authService.getCurrentUser();
		this.initVirtualList();
		this.loadFriendList();
		this.loadPendingRequestsCount();
	},
	onShow() {
		// 页面显示时刷新数据
		this.refreshData();
	},
	onPullDownRefresh() {
		this.refreshData();
	},
	onReachBottom() {
		if (this.hasMore && !this.loading) {
			this.loadMoreFriends();
		}
	},
	onBackPress() {
		// 处理物理返回键
		this.goBack();
		return true; // 阻止默认返回行为
	},
	methods: {
		// 初始化虚拟列表
		initVirtualList() {
			// 获取系统信息计算容器高度
			const systemInfo = uni.getSystemInfoSync();
			// 减去导航栏、功能区、搜索框等高度，大约300rpx
			this.containerHeight = (systemInfo.windowHeight * 750 / systemInfo.windowWidth) - 300;
			// 计算可视区域能显示的项目数量
			this.visibleCount = Math.ceil(this.containerHeight / this.itemHeight) + 1;
		},
		
		// 滚动事件处理
		onScroll(e) {
			this.scrollTop = e.detail.scrollTop;
			
			// 检查是否需要加载更多数据
			const scrollBottom = this.scrollTop + this.containerHeight;
			const totalHeight = this.totalHeight;
			
			if (scrollBottom >= totalHeight - 200 && this.hasMore && !this.loading) {
				this.loadMoreFriends();
			}
		},
		
		// 刷新数据
		refreshData() {
			this.currentPage = 1;
			this.hasMore = true;
			this.friendList = [];
			this.scrollTop = 0; // 重置滚动位置
			this.loadFriendList();
			this.loadPendingRequestsCount();
			uni.stopPullDownRefresh();
		},

		// 加载好友列表 - 连接真实后端
		async loadFriendList() {
			if (this.loading || !this.currentUser) return;
			
			// 首次加载时尝试从缓存读取
			if (this.currentPage === 1 && !this.searchKeyword) {
				const cachedData = uni.getStorageSync('friendList_cache');
				if (cachedData && Date.now() - cachedData.timestamp < 300000) { // 5分钟缓存
					this.friendList = cachedData.data;
					return;
				}
			}
			
			this.loading = true;
			try {
				// 连接真实后端API获取好友列表
				const response = await friendService.getFriendList(this.currentUser.id, {
					page: this.currentPage,
					limit: this.pageSize,
					search: this.searchKeyword
				});

				if (response.success) {
					const newFriends = response.data.friends;
					if (this.currentPage === 1) {
						this.friendList = newFriends;
						// 缓存第一页数据
						if (!this.searchKeyword) {
							uni.setStorageSync('friendList_cache', {
								data: newFriends,
								timestamp: Date.now()
							});
						}
					} else {
						this.friendList.push(...newFriends);
					}
					
					this.hasMore = newFriends.length === this.pageSize;
				} else {
					throw new Error(response.message || '获取好友列表失败');
				}
				
			} catch (error) {
				console.error('加载好友列表失败:', error);
				uni.showToast({
					title: '加载失败，请检查网络连接',
					icon: 'none'
				});
			} finally {
				this.loading = false;
			}
		},

		// 移除模拟数据方法，现在完全使用真实数据库

		// 加载更多好友
		loadMoreFriends() {
			this.currentPage++;
			this.loadFriendList();
		},

		// 加载待处理申请数量 - 连接真实数据库
		async loadPendingRequestsCount() {
			if (!this.currentUser) return;
			
			try {
				const response = await uni.request({
					url: `http://localhost:3000/api/friends/requests/${this.currentUser.id}`,
					method: 'GET',
					data: { type: 'received' },
					header: {
						'Authorization': `Bearer ${authService.getToken()}`
					}
				});

				if (response.data && response.data.success) {
					this.pendingRequestsCount = response.data.data.requests.filter(req => req.status === 'pending').length;
				} else {
					this.pendingRequestsCount = 0;
				}
			} catch (error) {
				console.error('加载申请数量失败:', error);
				this.pendingRequestsCount = 0;
			}
		},

		// 搜索输入变化
		onSearchInput(e) {
			this.searchKeyword = e.detail.value;
			// 防抖搜索
			clearTimeout(this.searchTimer);
			this.searchTimer = setTimeout(() => {
				this.refreshData();
			}, 500);
		},

		// 清除搜索
		onSearchClear() {
			this.searchKeyword = '';
			this.refreshData();
		},

		// 显示好友菜单
		showFriendMenu(friend) {
			const itemList = ['发消息', '查看资料', '设置备注', '删除好友'];
			
			uni.showActionSheet({
				itemList,
				success: (res) => {
					switch (res.tapIndex) {
						case 0:
							this.goToFriendChat(friend);
							break;
						case 1:
							this.goToFriendProfile(friend);
							break;
						case 2:
							this.setRemark(friend);
							break;
						case 3:
							this.confirmDeleteFriend(friend);
							break;
					}
				}
			});
		},

		// 跳转到好友聊天页面
		goToFriendChat(friend) {
			const friendId = friend.friendInfo._id || friend.friendInfo.id;
			const friendName = friend.remarkName || friend.friendInfo.nickname || '好友';
			const friendAvatar = friend.friendInfo.avatar || '/static/img/default-avatar.png';
			
			if (!friendId) {
				uni.showToast({
					title: '好友信息异常',
					icon: 'none'
				});
				return;
			}
			
			uni.navigateTo({
				url: `/pages/mine/friendChatClean?friendId=${friendId}&friendName=${encodeURIComponent(friendName)}&friendAvatar=${encodeURIComponent(friendAvatar)}`
			});
		},

		// 设置备注
		setRemark(friend) {
			const currentRemark = friend.remarkName || friend.friendInfo.nickname;
			
			uni.showModal({
				title: '设置备注',
				content: `当前备注：${currentRemark}`,
				editable: true,
				placeholderText: '请输入备注名称',
				success: async (res) => {
					if (res.confirm && res.content.trim()) {
						await this.updateFriendRemark(friend._id, res.content.trim());
					}
				}
			});
		},

		// 更新好友备注
		async updateFriendRemark(friendId, remark) {
			try {
				const response = await friendService.setFriendRemark(friendId, this.currentUser.id, remark);

				if (response.success) {
					uni.showToast({
						title: '备注设置成功',
						icon: 'success'
					});
					this.refreshData();
				} else {
					throw new Error(response.message);
				}
			} catch (error) {
				console.error('设置备注失败:', error);
				uni.showToast({
					title: '设置失败',
					icon: 'none'
				});
			}
		},

		// 确认删除好友
		confirmDeleteFriend(friend) {
			const friendName = friend.remarkName || friend.friendInfo.nickname;
			
			uni.showModal({
				title: '删除好友',
				content: `确定要删除好友"${friendName}"吗？`,
				success: (res) => {
					if (res.confirm) {
						this.deleteFriend(friend._id);
					}
				}
			});
		},

		// 删除好友
		async deleteFriend(friendId) {
			try {
				const response = await friendService.deleteFriend(friendId, this.currentUser.id);

				if (response.success) {
					uni.showToast({
						title: '已删除好友',
						icon: 'success'
					});
					this.refreshData();
				} else {
					throw new Error(response.message);
				}
			} catch (error) {
				console.error('删除好友失败:', error);
				uni.showToast({
					title: '删除失败',
					icon: 'none'
				});
			}
		},

		// 跳转到好友资料页
		goToFriendProfile(friend) {
			uni.navigateTo({
				url: `/pages/mine/friendProfile?friendId=${friend.friendInfo._id}`
			});
		},

		// 跳转到好友申请页面
		goToFriendRequests() {
			uni.navigateTo({
				url: '/pages/mine/friendRequests'
			});
		},

		// 跳转到添加好友页面
		goToAddFriend() {
			uni.navigateTo({
				url: '/pages/mine/addFriend'
			});
		},

		// 返回上一页
		goBack() {
			// 检查页面栈，如果只有一个页面则跳转到个人中心
			const pages = getCurrentPages();
			if (pages.length <= 1) {
				uni.reLaunch({
					url: '/pages/mine/index'
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
				} else if (diff < 2592000000) { // 30天内
					return `${Math.floor(diff / 86400000)}天前在线`;
				} else {
					return '很久未登录';
				}
			} catch (error) {
				return '未知';
			}
		},
		
		// 新增方法：获取状态样式类
		getStatusClass(lastLoginAt) {
			if (!lastLoginAt) return 'offline';
			
			try {
				const time = new Date(lastLoginAt);
				const now = new Date();
				const diff = now - time;
				
				if (diff < 300000) { // 5分钟内
					return 'online';
				} else if (diff < 3600000) { // 1小时内
					return 'recent';
				} else {
					return 'offline';
				}
			} catch (error) {
				return 'offline';
			}
		}
	}
}
</script>

<style scoped>
/* CSS变量定义 */
:root {
	--primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	--secondary-gradient: linear-gradient(45deg, #667eea, #764ba2);
	--success-color: #52c41a;
	--warning-color: #faad14;
	--error-color: #ff4d4f;
	--text-primary: #333333;
	--text-secondary: #666666;
	--text-tertiary: #999999;
	--bg-primary: #ffffff;
	--bg-secondary: #f5f5f5;
	--border-color: #e9ecef;
	--shadow-light: 0 2rpx 12rpx rgba(0, 0, 0, 0.08);
	--shadow-medium: 0 4rpx 20rpx rgba(0, 0, 0, 0.12);
	--border-radius: 20rpx;
	--border-radius-small: 12rpx;
}

.friend-list-page {
	min-height: 100vh;
	background: var(--bg-secondary);
}

/* 自定义导航栏 */
.custom-navbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	height: 88rpx;
	padding: 0 30rpx;
	padding-top: var(--status-bar-height); /* 添加状态栏高度适配 */
	background: #ffffff; /* 白色背景 */
	color: #000000; /* 黑色文字 */
	position: sticky;
	top: 0;
	z-index: 100;
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
	border-bottom: 1px solid #f0f0f0;
}

.navbar-left, .navbar-right {
	width: 80rpx;
	height: 60rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: var(--border-radius-small);
	transition: all 0.3s ease;
	background: rgba(0, 0, 0, 0.05);
	border: 1px solid rgba(0, 0, 0, 0.1);
}

.navbar-left:active, .navbar-right:active {
	background: rgba(0, 0, 0, 0.1);
	transform: scale(0.95);
}

.back-icon, .add-icon {
	font-size: 36rpx;
	font-weight: bold;
}

.navbar-title {
	font-size: 32rpx;
	font-weight: bold;
	letter-spacing: 1rpx;
	color: #000000;
}

/* 顶部功能区 */
.top-functions {
	display: flex;
	background: var(--bg-primary);
	margin: 20rpx;
	border-radius: var(--border-radius);
	padding: 40rpx 30rpx;
	gap: 80rpx;
	justify-content: center;
	box-shadow: var(--shadow-light);
}

.function-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 20rpx;
	transition: all 0.3s ease;
}

.function-item:active {
	transform: translateY(2rpx);
}

.function-icon {
	position: relative;
	width: 100rpx;
	height: 100rpx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: all 0.3s ease;
	box-shadow: var(--shadow-light);
}

.friend-request-icon .icon-bg {
	background: linear-gradient(135deg, #ff6b6b, #ee5a24);
	width: 100%;
	height: 100%;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
}

.add-friend-icon .icon-bg {
	background: linear-gradient(135deg, #4834d4, #686de0);
	width: 100%;
	height: 100%;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
}

/* 邮件图标 */
.mail-icon {
	position: relative;
	width: 40rpx;
	height: 30rpx;
}

.mail-body {
	width: 100%;
	height: 100%;
	background: white;
	border-radius: 4rpx;
}

.mail-flap {
	position: absolute;
	top: 0;
	left: 50%;
	transform: translateX(-50%);
	width: 0;
	height: 0;
	border-left: 20rpx solid transparent;
	border-right: 20rpx solid transparent;
	border-top: 15rpx solid white;
}

/* 搜索图标 */
.search-glass {
	position: relative;
	width: 40rpx;
	height: 40rpx;
}

.glass-circle {
	width: 28rpx;
	height: 28rpx;
	border: 4rpx solid white;
	border-radius: 50%;
	position: absolute;
	top: 0;
	left: 0;
}

.glass-handle {
	width: 3rpx;
	height: 12rpx;
	background: white;
	position: absolute;
	bottom: 0;
	right: 0;
	transform: rotate(45deg);
	border-radius: 2rpx;
}

.badge {
	position: absolute;
	top: -8rpx;
	right: -8rpx;
	background: var(--error-color);
	color: white;
	font-size: 20rpx;
	padding: 6rpx 10rpx;
	border-radius: 12rpx;
	min-width: 32rpx;
	text-align: center;
	border: 3rpx solid white;
	box-shadow: var(--shadow-light);
	animation: pulse 2s infinite;
}

@keyframes pulse {
	0% { transform: scale(1); }
	50% { transform: scale(1.1); }
	100% { transform: scale(1); }
}

.function-text {
	font-size: 26rpx;
	color: var(--text-primary);
	font-weight: 500;
}

/* 搜索区域 */
.search-section {
	padding: 20rpx;
}

.search-input-wrapper {
	position: relative;
	background: var(--bg-primary);
	border-radius: 30rpx;
	border: 2rpx solid var(--border-color);
	box-shadow: var(--shadow-light);
	transition: all 0.3s ease;
}

.search-input-wrapper:focus-within {
	border-color: #667eea;
	box-shadow: 0 0 0 6rpx rgba(102, 126, 234, 0.1);
}

.search-input {
	width: 100%;
	height: 80rpx;
	padding: 0 100rpx 0 80rpx;
	border: none;
	border-radius: 30rpx;
	font-size: 28rpx;
	background: transparent;
	color: var(--text-primary);
}

.search-input::placeholder {
	color: var(--text-tertiary);
}

.search-icon {
	position: absolute;
	left: 25rpx;
	top: 50%;
	transform: translateY(-50%);
	color: var(--text-secondary);
}

/* 搜索框内的小搜索图标 */
.search-glass-mini {
	position: relative;
	width: 32rpx;
	height: 32rpx;
}

.glass-circle-mini {
	width: 20rpx;
	height: 20rpx;
	border: 3rpx solid var(--text-secondary);
	border-radius: 50%;
	position: absolute;
	top: 0;
	left: 0;
}

.glass-handle-mini {
	width: 2rpx;
	height: 8rpx;
	background: var(--text-secondary);
	position: absolute;
	bottom: 2rpx;
	right: 2rpx;
	transform: rotate(45deg);
	border-radius: 1rpx;
}

.clear-icon {
	position: absolute;
	right: 25rpx;
	top: 50%;
	transform: translateY(-50%);
	width: 40rpx;
	height: 40rpx;
	border-radius: 50%;
	background: var(--text-tertiary);
	display: flex;
	align-items: center;
	justify-content: center;
	transition: all 0.3s ease;
}

.clear-icon:active {
	background: var(--text-secondary);
	transform: translateY(-50%) scale(0.9);
}

.clear-x {
	position: relative;
	width: 20rpx;
	height: 20rpx;
}

.x-line {
	position: absolute;
	width: 20rpx;
	height: 2rpx;
	background: white;
	top: 50%;
	left: 50%;
	border-radius: 1rpx;
}

.x-line1 {
	transform: translate(-50%, -50%) rotate(45deg);
}

.x-line2 {
	transform: translate(-50%, -50%) rotate(-45deg);
}

/* 虚拟列表容器 */
.virtual-list-container {
	height: calc(100vh - 300rpx);
	overflow-y: auto;
	padding: 0 20rpx;
}

.virtual-list {
	position: relative;
	width: 100%;
}

.virtual-placeholder {
	width: 100%;
	pointer-events: none;
}

.virtual-viewport {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	will-change: transform;
}

.friend-item {
	display: flex;
	align-items: center;
	padding: 30rpx;
	margin-bottom: 20rpx;
	background: var(--bg-primary);
	border-radius: var(--border-radius);
	box-shadow: var(--shadow-light);
	transition: all 0.3s ease;
	position: relative;
	overflow: hidden;
}

.friend-item::before {
	content: '';
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	background: linear-gradient(135deg, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.05));
	opacity: 0;
	transition: opacity 0.3s ease;
}

.friend-item:active::before {
	opacity: 1;
}

.friend-item:active {
	transform: translateY(2rpx);
	box-shadow: var(--shadow-medium);
}

.friend-avatar {
	position: relative;
	margin-right: 30rpx;
}

.avatar-img {
	width: 100rpx;
	height: 100rpx;
	border-radius: 50%;
	object-fit: cover;
	border: 3rpx solid var(--border-color);
	transition: all 0.3s ease;
}

.online-indicator {
	position: absolute;
	bottom: 5rpx;
	right: 5rpx;
	width: 24rpx;
	height: 24rpx;
}

.online-dot {
	width: 100%;
	height: 100%;
	background: var(--success-color);
	border: 3rpx solid white;
	border-radius: 50%;
	position: relative;
	z-index: 2;
}

.online-pulse {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	background: var(--success-color);
	border-radius: 50%;
	animation: pulse-ring 2s infinite;
}

@keyframes pulse-ring {
	0% {
		transform: scale(1);
		opacity: 1;
	}
	100% {
		transform: scale(2);
		opacity: 0;
	}
}

.friend-info {
	flex: 1;
}

.friend-name {
	font-size: 32rpx;
	font-weight: 600;
	color: var(--text-primary);
	margin-bottom: 8rpx;
	line-height: 1.3;
}

.real-name {
	font-size: 24rpx;
	color: var(--text-tertiary);
	margin-bottom: 8rpx;
	line-height: 1.2;
}

.friend-status {
	display: flex;
	align-items: center;
	gap: 8rpx;
	font-size: 24rpx;
	color: var(--text-secondary);
}

.status-dot {
	width: 12rpx;
	height: 12rpx;
	border-radius: 50%;
	transition: all 0.3s ease;
}

.status-dot.online {
	background: var(--success-color);
	box-shadow: 0 0 8rpx rgba(82, 196, 26, 0.5);
}

.status-dot.recent {
	background: var(--warning-color);
}

.status-dot.offline {
	background: var(--text-tertiary);
}

.friend-actions {
	padding: 20rpx;
}

.more-btn {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 4rpx;
	padding: 8rpx;
	border-radius: 8rpx;
	transition: all 0.3s ease;
}

.more-btn:active {
	background: rgba(102, 126, 234, 0.1);
}

.more-btn .dot {
	width: 6rpx;
	height: 6rpx;
	background: var(--text-secondary);
	border-radius: 50%;
}

/* 加载状态 */
.loading-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 100rpx 40rpx;
	gap: 30rpx;
}

.loading-spinner {
	position: relative;
	width: 80rpx;
	height: 80rpx;
}

.spinner-ring {
	width: 100%;
	height: 100%;
	border: 6rpx solid var(--border-color);
	border-top: 6rpx solid #667eea;
	border-radius: 50%;
	animation: spin 1s linear infinite;
}

@keyframes spin {
	0% { transform: rotate(0deg); }
	100% { transform: rotate(360deg); }
}

.loading-text {
	font-size: 28rpx;
	color: var(--text-secondary);
}

/* 空状态 */
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 100rpx 40rpx;
}

.empty-icon {
	margin-bottom: 40rpx;
}

.empty-people {
	position: relative;
	width: 120rpx;
	height: 80rpx;
}

.person {
	position: absolute;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.person1 {
	left: 0;
	top: 0;
	z-index: 1;
}

.person2 {
	right: 0;
	top: 10rpx;
	z-index: 0;
}

.person-head {
	width: 40rpx;
	height: 40rpx;
	background: var(--text-tertiary);
	border-radius: 50%;
	margin-bottom: 8rpx;
}

.person-body {
	width: 50rpx;
	height: 30rpx;
	background: var(--text-tertiary);
	border-radius: 15rpx 15rpx 0 0;
}

.empty-text {
	font-size: 32rpx;
	color: var(--text-secondary);
	margin-bottom: 15rpx;
	font-weight: 500;
}

.empty-desc {
	font-size: 26rpx;
	color: var(--text-tertiary);
	text-align: center;
	line-height: 1.5;
	margin-bottom: 40rpx;
}

.add-friend-btn {
	background: var(--secondary-gradient);
	color: white;
	padding: 20rpx 40rpx;
	border-radius: 30rpx;
	box-shadow: var(--shadow-light);
	transition: all 0.3s ease;
}

.add-friend-btn:active {
	transform: translateY(2rpx);
	box-shadow: var(--shadow-medium);
}

.btn-text {
	font-size: 28rpx;
	font-weight: 500;
}

/* 加载更多 */
.load-more {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 40rpx;
	transition: all 0.3s ease;
}

.load-more:active {
	transform: translateY(2rpx);
}

.load-more-content {
	display: flex;
	align-items: center;
	gap: 15rpx;
	padding: 20rpx 30rpx;
	background: var(--bg-primary);
	border-radius: 30rpx;
	box-shadow: var(--shadow-light);
}

.load-more-icon {
	width: 24rpx;
	height: 24rpx;
	position: relative;
}

.arrow-down {
	width: 0;
	height: 0;
	border-left: 8rpx solid transparent;
	border-right: 8rpx solid transparent;
	border-top: 12rpx solid var(--text-secondary);
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
}

.load-more-text {
	font-size: 28rpx;
	color: var(--text-secondary);
	font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 750rpx) {
	.top-functions {
		gap: 60rpx;
		padding: 30rpx 20rpx;
	}
	
	.function-icon {
		width: 80rpx;
		height: 80rpx;
	}
	
	.friend-item {
		padding: 25rpx;
	}
	
	.avatar-img {
		width: 80rpx;
		height: 80rpx;
	}
}
</style>