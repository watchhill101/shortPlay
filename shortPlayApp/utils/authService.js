// 认证服务模块
class AuthService {
	constructor() {
		this.baseURL = 'http://localhost:3000/api/auth'
		this.usersKey = 'savedUsers' // 存储多个用户账号
		this.currentUserKey = 'currentUser' // 当前用户标识
	}

	// 发送短信验证码
	async sendSmsCode(phone) {
		try {
			const response = await uni.request({
				url: `${this.baseURL}/send-sms`,
				method: 'POST',
				data: { phone },
				header: {
					'Content-Type': 'application/json'
				}
			})
			return response.data
		} catch (error) {
			console.error('发送验证码失败:', error)
			throw error
		}
	}

	// 手机号验证码登录
	async loginWithPhone(phone, code) {
		try {
			const response = await uni.request({
				url: `${this.baseURL}/login-phone`,
				method: 'POST',
				data: { phone, code },
				header: {
					'Content-Type': 'application/json'
				}
			})
			
			if (response.data.success) {
				// 保存用户信息和token
				this.setToken(response.data.token)
				this.setUserInfo(response.data.user)
				// 保存到用户列表
				this.saveUserToList(response.data.user, response.data.token)
			}
			
			return response.data
		} catch (error) {
			console.error('登录失败:', error)
			throw error
		}
	}

	// 保存token
	setToken(token) {
		uni.setStorageSync('token', token)
	}

	// 获取token
	getToken() {
		return uni.getStorageSync('token')
	}

	// 检查是否已登录
	isLoggedIn() {
		try {
			const token = this.getToken()
			const userInfo = uni.getStorageSync('userInfo');
			return !!(token && userInfo && userInfo.id);
		} catch (e) {
			console.error('检查登录状态失败:', e);
			return false;
		}
	}

	// 设置默认测试用户
	setDefaultUser() {
		const defaultUser = {
			userId: '1',
			username: 'testuser',
			name: '测试用户',
			avatar: '/static/img/default-avatar.png'
		};
		this.setUserInfo(defaultUser);
	}

	// 获取当前用户信息
	getCurrentUser() {
		try {
			const userInfo = uni.getStorageSync('userInfo');
			return userInfo || null;
		} catch (e) {
			console.error('获取用户信息失败:', e);
			return null;
		}
	}

	// 设置用户信息
	setUserInfo(userInfo) {
		try {
			uni.setStorageSync('userInfo', userInfo);
			return true;
		} catch (e) {
			console.error('保存用户信息失败:', e);
			return false;
		}
	}

	// 保存用户到多用户列表
	saveUserToList(userInfo, token) {
		try {
			const savedUsers = this.getSavedUsers();
			const existingIndex = savedUsers.findIndex(user => user.id === userInfo.id);
			
			const userWithToken = {
				...userInfo,
				token,
				lastLoginTime: new Date().toISOString()
			};
			
			if (existingIndex >= 0) {
				// 更新已存在的用户
				savedUsers[existingIndex] = userWithToken;
			} else {
				// 添加新用户
				savedUsers.push(userWithToken);
			}
			
			uni.setStorageSync(this.usersKey, savedUsers);
			uni.setStorageSync(this.currentUserKey, userInfo.id);
			return true;
		} catch (e) {
			console.error('保存用户到列表失败:', e);
			return false;
		}
	}

	// 获取已保存的用户列表
	getSavedUsers() {
		try {
			return uni.getStorageSync(this.usersKey) || [];
		} catch (e) {
			console.error('获取用户列表失败:', e);
			return [];
		}
	}

	// 切换到指定用户
	switchToUser(userId) {
		try {
			const savedUsers = this.getSavedUsers();
			const targetUser = savedUsers.find(user => user.id === userId);
			
			if (!targetUser) {
				throw new Error('用户不存在');
			}
			
			// 设置为当前用户
			this.setToken(targetUser.token);
			this.setUserInfo(targetUser);
			uni.setStorageSync(this.currentUserKey, userId);
			
			// 更新最后登录时间
			targetUser.lastLoginTime = new Date().toISOString();
			this.saveUserToList(targetUser, targetUser.token);
			
			return true;
		} catch (e) {
			console.error('切换用户失败:', e);
			return false;
		}
	}

	// 获取当前用户ID
	getCurrentUserId() {
		try {
			return uni.getStorageSync(this.currentUserKey);
		} catch (e) {
			console.error('获取当前用户ID失败:', e);
			return null;
		}
	}

	// 从用户列表中删除用户
	removeUserFromList(userId) {
		try {
			const savedUsers = this.getSavedUsers();
			const filteredUsers = savedUsers.filter(user => user.id !== userId);
			uni.setStorageSync(this.usersKey, filteredUsers);
			
			// 如果删除的是当前用户，需要处理
			const currentUserId = this.getCurrentUserId();
			if (currentUserId === userId) {
				if (filteredUsers.length > 0) {
					// 切换到第一个用户
					this.switchToUser(filteredUsers[0].id);
				} else {
					// 没有其他用户，清除当前用户信息
					this.logout();
				}
			}
			
			return true;
		} catch (e) {
			console.error('删除用户失败:', e);
			return false;
		}
	}

	// 登出当前用户
	logout() {
		try {
			uni.removeStorageSync('userInfo');
			uni.removeStorageSync('token');
			uni.removeStorageSync(this.currentUserKey);
			return true;
		} catch (e) {
			console.error('登出失败:', e);
			return false;
		}
	}

	// 完全登出（清除所有用户）
	logoutAll() {
		try {
			uni.removeStorageSync('userInfo');
			uni.removeStorageSync('token');
			uni.removeStorageSync(this.usersKey);
			uni.removeStorageSync(this.currentUserKey);
			return true;
		} catch (e) {
			console.error('完全登出失败:', e);
			return false;
		}
	}

	// 登录
	login(username, password) {
		// 这里可以添加实际的登录逻辑
		// 目前返回模拟数据 - 与后端测试数据对应
		const mockUsers = [
			{ 
				id: '68b19015d2f73796f58caf13', 
				username: 'user1', 
				nickname: '阿龙', 
				avatar: '/static/img/avatar1.jpg',
				mobilePhoneNumber: '13800138001'
			},
			{ 
				id: '68b19015d2f73796f58caf14', 
				username: 'user2', 
				nickname: '小明', 
				avatar: '/static/img/avatar2.jpg',
				mobilePhoneNumber: '13800138002'
			},
			{ 
				id: '68b19015d2f73796f58caf15', 
				username: 'user3', 
				nickname: '小红', 
				avatar: '/static/img/avatar3.jpg',
				mobilePhoneNumber: '13800138003'
			},
			{ 
				id: '68b19015d2f73796f58caf16', 
				username: 'user4', 
				nickname: '小刚', 
				avatar: '/static/img/avatar4.jpg',
				mobilePhoneNumber: '13800138004'
			}
		];
		
		const user = mockUsers.find(u => u.username === username);
		if (user) {
			const mockToken = `token_${user.id}_${Date.now()}`;
			this.setToken(mockToken);
			this.setUserInfo(user);
			this.saveUserToList(user, mockToken);
			return { success: true, user, token: mockToken };
		} else {
			return { success: false, message: '用户名或密码错误' };
		}
	}
}

export default new AuthService();