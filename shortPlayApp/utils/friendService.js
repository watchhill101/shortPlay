// 好友服务模块
class FriendService {
	constructor() {
		this.baseURL = 'http://localhost:3000/api/friends'
	}

	// 获取认证头
	getAuthHeader() {
		// 动态导入authService避免循环依赖
		const token = uni.getStorageSync('token');
		return {
			'Authorization': `Bearer ${token}`,
			'Content-Type': 'application/json'
		};
	}

	// 获取好友列表
	async getFriendList(userId, options = {}) {
		try {
			const { page = 1, limit = 20, search = '' } = options;
			
			const response = await uni.request({
				url: `${this.baseURL}/list/${userId}`,
				method: 'GET',
				data: { page, limit, search },
				header: this.getAuthHeader()
			});

			return response.data;
		} catch (error) {
			console.error('获取好友列表失败:', error);
			throw error;
		}
	}

	// 搜索用户
	async searchUsers(keyword, currentUserId, options = {}) {
		try {
			const { page = 1, limit = 20 } = options;
			
			const response = await uni.request({
				url: `${this.baseURL}/search/users`,
				method: 'GET',
				data: { keyword, currentUserId, page, limit },
				header: this.getAuthHeader()
			});

			return response.data;
		} catch (error) {
			console.error('搜索用户失败:', error);
			throw error;
		}
	}

	// 发送好友申请
	async sendFriendRequest(requesterId, recipientId, message = '我想加你为好友') {
		try {
			const response = await uni.request({
				url: `${this.baseURL}/request`,
				method: 'POST',
				data: { requesterId, recipientId, message },
				header: this.getAuthHeader()
			});

			return response.data;
		} catch (error) {
			console.error('发送好友申请失败:', error);
			throw error;
		}
	}

	// 获取好友申请列表
	async getFriendRequests(userId, type = 'received') {
		try {
			const response = await uni.request({
				url: `${this.baseURL}/requests/${userId}`,
				method: 'GET',
				data: { type },
				header: this.getAuthHeader()
			});

			return response.data;
		} catch (error) {
			console.error('获取好友申请失败:', error);
			throw error;
		}
	}

	// 处理好友申请
	async handleFriendRequest(requestId, action, userId) {
		try {
			const response = await uni.request({
				url: `${this.baseURL}/request/${requestId}`,
				method: 'PUT',
				data: { action, userId },
				header: this.getAuthHeader()
			});

			return response.data;
		} catch (error) {
			console.error('处理好友申请失败:', error);
			throw error;
		}
	}

	// 删除好友
	async deleteFriend(friendId, userId) {
		try {
			const response = await uni.request({
				url: `${this.baseURL}/${friendId}`,
				method: 'DELETE',
				data: { userId },
				header: this.getAuthHeader()
			});

			return response.data;
		} catch (error) {
			console.error('删除好友失败:', error);
			throw error;
		}
	}

	// 设置好友备注
	async setFriendRemark(friendId, userId, remark) {
		try {
			const response = await uni.request({
				url: `${this.baseURL}/${friendId}/remark`,
				method: 'PUT',
				data: { userId, remark },
				header: this.getAuthHeader()
			});

			return response.data;
		} catch (error) {
			console.error('设置好友备注失败:', error);
			throw error;
		}
	}

	// 获取好友数量
	async getFriendCount(userId) {
		try {
			const response = await this.getFriendList(userId, { page: 1, limit: 1 });
			return response.success ? (response.data.pagination.total || 0) : 0;
		} catch (error) {
			console.error('获取好友数量失败:', error);
			return 0;
		}
	}

	// 获取待处理申请数量
	async getPendingRequestsCount(userId) {
		try {
			const response = await this.getFriendRequests(userId, 'received');
			if (response.success) {
				return response.data.requests.filter(req => req.status === 'pending').length;
			}
			return 0;
		} catch (error) {
			console.error('获取待处理申请数量失败:', error);
			return 0;
		}
	}

	// 批量处理好友申请
	async batchHandleRequests(requests, action, userId) {
		try {
			const results = await Promise.all(
				requests.map(request => 
					this.handleFriendRequest(request._id, action, userId)
				)
			);
			
			const successCount = results.filter(result => result.success).length;
			return {
				success: true,
				successCount,
				totalCount: requests.length
			};
		} catch (error) {
			console.error('批量处理申请失败:', error);
			throw error;
		}
	}
}

export default new FriendService(); 