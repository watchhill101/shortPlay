<template>
	<view class="info-page">
		<!-- 导航栏 -->
		<view class="nav-bar">
			<view class="nav-left" @click="goBack">
				<text class="back-icon">←</text>
			</view>
			<view class="nav-title">我的信息</view>
			<view class="nav-right">
				<text class="save-btn" @click="saveUserInfo" v-if="hasChanges">保存</text>
			</view>
		</view>

		<!-- 用户信息 -->
		<view class="user-info-section">
			<view class="avatar-section" @click="changeAvatar">
				<image 
					:src="getAvatarUrl()" 
					class="avatar"
					mode="aspectFill"
					@load="onAvatarLoad"
					@error="onAvatarError"
				></image>
				<text class="change-avatar">更换头像</text>
			</view>
			
			<view class="info-list">
				<view class="info-item" @click="editField('nickname')">
					<text class="info-label">用户名</text>
					<text class="info-value" :class="{ placeholder: !userInfo.nickname }">
						{{ userInfo.nickname || '点击设置用户名' }}
					</text>
					<text class="arrow">></text>
				</view>
				
				<view class="info-item">
					<text class="info-label">UID</text>
					<text class="info-value">{{ userInfo.id || '加载中...' }}</text>
				</view>
				
				<view class="info-item" @click="editField('mobilePhoneNumber')">
					<text class="info-label">手机号</text>
					<text class="info-value" :class="{ placeholder: !userInfo.mobilePhoneNumber }">
						{{ formatPhone(userInfo.mobilePhoneNumber) || '点击绑定手机号' }}
					</text>
					<text class="arrow">></text>
				</view>
				
				<view class="info-item" @click="editField('gender')">
					<text class="info-label">性别</text>
					<text class="info-value" :class="{ placeholder: !userInfo.gender }">
						{{ userInfo.gender || '点击设置性别' }}
					</text>
					<text class="arrow">></text>
				</view>
				
				<view class="info-item" @click="editField('birthday')">
					<text class="info-label">生日</text>
					<text class="info-value" :class="{ placeholder: !userInfo.birthday }">
						{{ userInfo.birthday || '点击设置生日' }}
					</text>
					<text class="arrow">></text>
				</view>
				
				<view class="info-item" @click="editField('bio')">
					<text class="info-label">个人简介</text>
					<text class="info-value" :class="{ placeholder: !userInfo.bio }">
						{{ userInfo.bio || '点击添加个人简介' }}
					</text>
					<text class="arrow">></text>
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
			userInfo: {
				id: '',
				nickname: '',
				avatar: '',
				mobilePhoneNumber: '',
				gender: '',
				birthday: '',
				bio: ''
			},
			originalUserInfo: {},
			avatarKey: Date.now() // 用于强制刷新头像
		}
	},
	onLoad() {
		this.loadUserInfo();
	},
	computed: {
		// 检查是否有变更
		hasChanges() {
			return JSON.stringify(this.userInfo) !== JSON.stringify(this.originalUserInfo);
		}
	},
	methods: {
		// 测试token有效性
		async testTokenValidity() {
			const token = authService.getToken();
			if (!token) {
				console.log('没有token');
				return false;
			}
			
			try {
				console.log('测试token有效性...');
				const response = await uni.request({
					url: 'http://localhost:3000/api/users/me',
					method: 'GET',
					header: {
						'Authorization': `Bearer ${token}`
					}
				});
				
				console.log('Token测试响应:', response);
				
				if (response.statusCode === 401) {
					console.log('Token已失效');
					this.handleTokenExpired();
					return false;
				} else if (response.statusCode === 200 && response.data.success) {
					console.log('Token有效，认证用户:', response.data.data);
					return true;
				} else {
					console.log('Token验证返回异常:', response);
					return false;
				}
			} catch (error) {
				console.error('Token验证失败:', error);
				return false;
			}
		},

		// 处理token过期
		handleTokenExpired() {
			uni.showModal({
				title: '登录已过期',
				content: '请重新登录',
				showCancel: false,
				success: () => {
					// 清除无效的token和用户信息
					uni.removeStorageSync('token');
					uni.removeStorageSync('userInfo');
					uni.reLaunch({
						url: '/pages/login/index'
					});
				}
			});
		},

		// 检查登录状态
		checkLoginStatus() {
			const token = authService.getToken();
			const userInfo = uni.getStorageSync('userInfo');
			
			console.log('检查登录状态:', {
				hasToken: !!token,
				hasUserInfo: !!userInfo,
				userId: userInfo?.id,
				token: token ? token.substring(0, 20) + '...' : 'null'
			});
			
			if (!token || !userInfo || !userInfo.id) {
				console.log('登录检查失败，跳转到登录页');
				uni.showModal({
					title: '未登录',
					content: '请先登录后再访问个人信息',
					showCancel: false,
					success: () => {
						uni.reLaunch({
							url: '/pages/login/index'
						});
					}
				});
				return false;
			}
			return true;
		},

		// 加载用户信息
		async loadUserInfo() {
			try {
				// 从本地存储获取基本信息
				const storedUserInfo = uni.getStorageSync('userInfo');
				console.log('本地存储的用户信息:', storedUserInfo);
				
				if (storedUserInfo) {
					this.userInfo = { ...this.userInfo, ...storedUserInfo };
				}

				// 从数据库获取完整用户信息
				if (this.userInfo.id) {
					await this.fetchUserInfoFromDatabase();
				} else {
					console.log('没有用户ID，无法从数据库获取信息');
				}
				
				// 保存原始数据用于比较变更
				this.originalUserInfo = JSON.parse(JSON.stringify(this.userInfo));
			} catch (error) {
				console.error('加载用户信息失败:', error);
				uni.showToast({
					title: '加载失败',
					icon: 'error'
				});
			}
		},

		// 从数据库获取用户信息
		async fetchUserInfoFromDatabase() {
			const token = authService.getToken();
			if (!token) {
				console.log('没有token，跳过数据库获取');
				return;
			}

			try {
				console.log('从数据库获取用户信息，userId:', this.userInfo.id);
				
				const response = await uni.request({
					url: `http://localhost:3000/api/users/${this.userInfo.id}`,
					method: 'GET',
					header: {
						'Authorization': `Bearer ${token}`
					}
				});

				console.log('数据库响应:', response);

				if (response.statusCode === 401) {
					console.log('Token无效，清除本地数据');
					uni.removeStorageSync('token');
					uni.removeStorageSync('userInfo');
					uni.showModal({
						title: '登录已过期',
						content: '请重新登录',
						showCancel: false,
						success: () => {
							uni.reLaunch({
								url: '/pages/login/index'
							});
						}
					});
					return;
				}

				if (response.data && response.data.success) {
					const userData = response.data.data;
					console.log('从数据库获取的用户数据:', userData);
					
					// 合并数据，保留本地的基本信息，补充数据库的详细信息
					this.userInfo = {
						...this.userInfo, // 保留本地的基本信息
						...userData,      // 用数据库的详细信息覆盖
						id: this.userInfo.id // 确保ID不变
					};
					
					console.log('合并后的用户信息:', this.userInfo);
				} else {
					console.log('数据库返回失败:', response.data);
				}
			} catch (error) {
				console.error('获取用户信息失败:', error);
			}
		},

		// 编辑字段
		editField(field) {
			const fieldNames = {
				nickname: '用户名',
				mobilePhoneNumber: '手机号',
				gender: '性别',
				birthday: '生日',
				bio: '个人简介'
			};

			if (field === 'gender') {
				this.selectGender();
			} else if (field === 'birthday') {
				this.selectBirthday();
			} else {
				this.editTextField(field, fieldNames[field]);
			}
		},

		// 编辑文本字段
		editTextField(field, fieldName) {
			uni.showModal({
				title: `编辑${fieldName}`,
				editable: true,
				placeholderText: `请输入${fieldName}`,
				content: this.userInfo[field] || '',
				success: (res) => {
					if (res.confirm) {
						const newValue = res.content.trim();
						
						// 字段验证
						if (field === 'nickname') {
							if (!newValue) {
								uni.showToast({
									title: '用户名不能为空',
									icon: 'error'
								});
								return;
							}
							if (newValue.length < 2 || newValue.length > 20) {
								uni.showToast({
									title: '用户名长度应为2-20个字符',
									icon: 'error'
								});
								return;
							}
						} else if (field === 'mobilePhoneNumber') {
							if (newValue && !/^1[3-9]\d{9}$/.test(newValue)) {
								uni.showToast({
									title: '请输入正确的手机号',
									icon: 'error'
								});
								return;
							}
						} else if (field === 'bio') {
							if (newValue.length > 100) {
								uni.showToast({
									title: '个人简介不能超过100个字符',
									icon: 'error'
								});
								return;
							}
						}
						
						this.userInfo[field] = newValue;
						
						// 显示保存提示
						if (newValue !== this.originalUserInfo[field]) {
							uni.showToast({
								title: '记得点击右上角保存',
								icon: 'none',
								duration: 2000
							});
						}
					}
				}
			});
		},

		// 选择性别
		selectGender() {
			uni.showActionSheet({
				itemList: ['男', '女', '保密'],
				success: (res) => {
					const genders = ['男', '女', '保密'];
					this.userInfo.gender = genders[res.tapIndex];
				}
			});
		},

		// 选择生日
		selectBirthday() {
			// 获取当前日期或已设置的生日
			const currentDate = this.userInfo.birthday || new Date().toISOString().split('T')[0];
			
			uni.showActionSheet({
				itemList: ['使用日期选择器', '手动输入日期'],
				success: (res) => {
					if (res.tapIndex === 0) {
						// 使用系统日期选择器
						const date = new Date(currentDate);
						uni.navigateTo({
							url: `/pages/common/datePicker?current=${currentDate}&callback=setBirthday`
						});
					} else {
						// 手动输入
						uni.showModal({
							title: '设置生日',
							editable: true,
							placeholderText: 'YYYY-MM-DD (如: 1990-01-01)',
							content: this.userInfo.birthday || '',
							success: (modalRes) => {
								if (modalRes.confirm && modalRes.content.trim()) {
									const inputDate = modalRes.content.trim();
									
									// 验证日期格式和有效性
									if (this.validateDate(inputDate)) {
										this.userInfo.birthday = inputDate;
										
										// 显示保存提示
										if (inputDate !== this.originalUserInfo.birthday) {
											uni.showToast({
												title: '记得点击右上角保存',
												icon: 'none',
												duration: 2000
											});
										}
									} else {
										uni.showToast({
											title: '请输入正确的日期格式 (YYYY-MM-DD)',
											icon: 'error',
											duration: 3000
										});
									}
								}
							}
						});
					}
				}
			});
		},

		// 验证日期格式和有效性
		validateDate(dateString) {
			const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
			if (!dateRegex.test(dateString)) {
				return false;
			}
			
			const date = new Date(dateString);
			const now = new Date();
			
			// 检查日期是否有效
			if (isNaN(date.getTime())) {
				return false;
			}
			
			// 检查年份范围 (1900-当前年份)
			const year = date.getFullYear();
			if (year < 1900 || year > now.getFullYear()) {
				return false;
			}
			
			// 检查日期不能是未来
			if (date > now) {
				return false;
			}
			
			return true;
		},

		// 更换头像
		changeAvatar() {
			uni.showActionSheet({
				itemList: ['拍照', '从相册选择', '取消'],
				success: (res) => {
					if (res.tapIndex === 2) return; // 取消操作
					
					const sourceType = res.tapIndex === 0 ? ['camera'] : ['album'];
					uni.chooseImage({
						count: 1,
						sizeType: ['compressed'], // 压缩图片减小文件大小
						sourceType,
						success: (res) => {
							// 预览选择的图片
							const tempFilePath = res.tempFilePaths[0];
							uni.previewImage({
								urls: [tempFilePath],
								success: () => {
									// 预览后确认上传
									uni.showModal({
										title: '确认上传',
										content: '确定要使用这张图片作为头像吗？',
										success: (modalRes) => {
											if (modalRes.confirm) {
												this.uploadAvatar(tempFilePath);
											}
										}
									});
								}
							});
						},
						fail: (error) => {
							console.error('选择图片失败:', error);
							uni.showToast({
								title: '选择图片失败',
								icon: 'error'
							});
						}
					});
				}
			});
		},

		// 上传头像
		async uploadAvatar(tempFilePath) {
			// 检查登录状态
			const token = authService.getToken();
			if (!token) {
				uni.showToast({
					title: '请先登录',
					icon: 'error'
				});
				return;
			}

			// 检查文件大小
			try {
				const fileInfo = await uni.getFileInfo({
					filePath: tempFilePath
				});
				
				// 限制文件大小为5MB
				if (fileInfo.size > 5 * 1024 * 1024) {
					uni.showToast({
						title: '图片文件过大，请选择小于5MB的图片',
						icon: 'error',
						duration: 3000
					});
					return;
				}
			} catch (error) {
				console.error('获取文件信息失败:', error);
			}

			uni.showLoading({
				title: '上传中...'
			});

			try {
				console.log('开始上传头像，token:', token ? '存在' : '不存在');
				
				const uploadResponse = await uni.uploadFile({
					url: 'http://localhost:3000/api/users/upload/avatar',
					filePath: tempFilePath,
					name: 'avatar',
					header: {
						'Authorization': `Bearer ${token}`
					}
				});
				console.log('上传响应:', uploadResponse);
				
				if (uploadResponse.statusCode === 401) {
					// token无效，需要重新登录
					uni.showModal({
						title: '登录已过期',
						content: '请重新登录后再试',
						showCancel: false,
						success: () => {
							uni.reLaunch({
								url: '/pages/login/index'
							});
						}
					});
					return;
				}
				
				console.log('上传状态码:', uploadResponse.statusCode);
				console.log('上传响应数据:', uploadResponse.data);
				
				if (uploadResponse.statusCode === 401) {
					this.handleTokenExpired();
					return;
				}
				
				if (uploadResponse.statusCode !== 200) {
					throw new Error(`HTTP ${uploadResponse.statusCode}: 上传失败`);
				}
				
				let result;
				try {
					result = JSON.parse(uploadResponse.data);
				} catch (parseError) {
					console.error('解析响应数据失败:', parseError);
					throw new Error('服务器响应格式错误');
				}
				
				console.log('解析后的结果:', result);
				
				if (result.success) {
					// 更新头像URL，确保使用完整路径
					const avatarUrl = result.data.url.startsWith('http') 
						? result.data.url 
						: `http://localhost:3000${result.data.url}`;
					
					console.log('新头像URL:', avatarUrl);
					console.log('上传前头像:', this.userInfo.avatar);
					
					// 更新头像并刷新显示
					this.$set(this.userInfo, 'avatar', avatarUrl);
					this.avatarKey = Date.now(); // 更新缓存破坏key
					
					console.log('上传后头像:', this.userInfo.avatar);
					
					// 同步更新本地存储和原始数据
					const updatedUserInfo = { ...this.userInfo, avatar: avatarUrl };
					uni.setStorageSync('userInfo', updatedUserInfo);
					this.originalUserInfo = JSON.parse(JSON.stringify(this.userInfo));
					
					// 强制更新页面
					this.$forceUpdate();
					
					// 延迟一点再次强制更新，确保图片加载
					setTimeout(() => {
						this.avatarKey = Date.now();
						this.$forceUpdate();
					}, 300);
					
					uni.showToast({
						title: '头像更新成功',
						icon: 'success',
						duration: 2000
					});
					
					// 测试图片是否可以访问
					console.log('测试头像URL是否可访问:', avatarUrl);
				} else {
					throw new Error(result.message || '上传失败');
				}
			} catch (error) {
				console.error('上传头像失败:', error);
				let errorMessage = '上传失败';
				
				if (error.message) {
					if (error.message.includes('404')) {
						errorMessage = '上传服务不可用';
					} else if (error.message.includes('413')) {
						errorMessage = '图片文件过大';
					} else if (error.message.includes('401')) {
						errorMessage = '登录已过期';
					} else if (error.message.includes('network') || error.message.includes('timeout')) {
						errorMessage = '网络连接失败';
					} else if (error.message.includes('只允许上传图片')) {
						errorMessage = '只支持图片格式';
					}
				}
				
				uni.showToast({
					title: errorMessage,
					icon: 'error',
					duration: 3000
				});
			} finally {
				uni.hideLoading();
			}
		},

		// 保存用户信息
		async saveUserInfo() {
			console.log('saveUserInfo 方法被调用');
			console.log('hasChanges:', this.hasChanges);
			console.log('userInfo:', this.userInfo);
			console.log('originalUserInfo:', this.originalUserInfo);
			
			if (!this.hasChanges) {
				console.log('没有变更，直接返回');
				return;
			}

			const token = authService.getToken();
			console.log('获取到的token:', token ? '存在' : '不存在');
			if (!token) {
				uni.showToast({
					title: '请先登录',
					icon: 'error'
				});
				return;
			}

			uni.showLoading({
				title: '保存中...'
			});

			try {
				console.log('开始发送请求到:', `http://localhost:3000/api/users/${this.userInfo.id}`);
				const response = await uni.request({
					url: `http://localhost:3000/api/users/${this.userInfo.id}`,
					method: 'PUT',
					data: {
						nickname: this.userInfo.nickname,
						avatar: this.userInfo.avatar,
						mobilePhoneNumber: this.userInfo.mobilePhoneNumber,
						gender: this.userInfo.gender,
						birthday: this.userInfo.birthday,
						bio: this.userInfo.bio
					},
					header: {
						'Authorization': `Bearer ${token}`,
						'Content-Type': 'application/json'
					}
				});

				console.log('保存响应:', response);
				
				if (response.statusCode === 401) {
					uni.showModal({
						title: '登录已过期',
						content: '请重新登录后再试',
						showCancel: false,
						success: () => {
							uni.reLaunch({
								url: '/pages/login/index'
							});
						}
					});
					return;
				}

				if (response.data && response.data.success) {
					// 更新本地存储
					uni.setStorageSync('userInfo', this.userInfo);
					this.originalUserInfo = JSON.parse(JSON.stringify(this.userInfo));
					
					// 发送用户信息更新事件
					uni.$emit('userInfoUpdated', this.userInfo);
					
					// 成功反馈
					uni.showToast({
						title: '保存成功',
						icon: 'success',
						duration: 2000
					});
					
					// 短暂延迟后隐藏保存按钮
					setTimeout(() => {
						this.$forceUpdate();
					}, 500);
				} else {
					throw new Error(response.data?.message || '保存失败');
				}
			} catch (error) {
				console.error('保存用户信息失败:', error);
				console.error('错误详情:', {
					message: error.message,
					stack: error.stack,
					errorData: error.data || error.errMsg
				});
				uni.showToast({
					title: '保存失败: ' + (error.message || error.errMsg || '未知错误'),
					icon: 'error',
					duration: 3000
				});
			} finally {
				uni.hideLoading();
			}
		},

		// 格式化手机号显示
		formatPhone(phone) {
			if (!phone) return '';
			if (phone.length === 11) {
				return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
			}
			return phone;
		},

		// 头像加载成功
		onAvatarLoad(e) {
			console.log('头像加载成功:', e);
		},

		// 头像加载失败
		onAvatarError(e) {
			console.error('头像加载失败:', e);
			console.log('当前头像URL:', this.userInfo.avatar);
			
			// 如果是网络图片加载失败，尝试使用默认头像
			if (this.userInfo.avatar && this.userInfo.avatar.startsWith('http')) {
				console.log('网络头像加载失败，回退到默认头像');
				this.$set(this.userInfo, 'avatar', '/static/img/default-avatar.png');
				
				uni.showToast({
					title: '头像加载失败，已恢复默认头像',
					icon: 'none',
					duration: 2000
				});
			}
		},

		// 获取头像URL
		getAvatarUrl() {
			if (this.userInfo.avatar) {
				console.log('当前头像URL:', this.userInfo.avatar);
				// 添加缓存破坏参数
				const url = this.userInfo.avatar.includes('?') 
					? this.userInfo.avatar 
					: `${this.userInfo.avatar}?key=${this.avatarKey}`;
				return url;
			}
			// 使用简单的占位符
			return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjUwIiBjeT0iNDAiIHI9IjE1IiBmaWxsPSIjOUNBM0FGIi8+CjxwYXRoIGQ9Ik0yNSA3NUMyNSA2NS41IDMzIDU4IDUwIDU4Uzc1IDY1LjUgNzUgNzVWODVIMjVWNzVaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPgo=';
		},



		// 刷新头像显示
		refreshAvatar() {
			// 强制刷新头像，避免缓存问题
			if (this.userInfo.avatar && this.userInfo.avatar.startsWith('http')) {
				const baseUrl = this.userInfo.avatar.split('?')[0];
				this.$set(this.userInfo, 'avatar', `${baseUrl}?t=${Date.now()}`);
				this.$forceUpdate();
			}
		},

		// 返回上一页
		goBack() {
			if (this.hasChanges) {
				uni.showModal({
					title: '提示',
					content: '有未保存的修改，确定要离开吗？',
					success: (res) => {
						if (res.confirm) {
							uni.navigateBack();
						}
					}
				});
			} else {
			uni.navigateBack();
			}
		}
	}
}
</script>

<style scoped>
.info-page {
	width: 100%;
	min-height: 100vh;
	background: #f8fafc;
}

/* 导航栏 */
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
	cursor: pointer;
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

.save-btn {
	font-size: 28rpx;
	color: #3b82f6;
	font-weight: 500;
	cursor: pointer;
}

/* 用户信息区域 */
.user-info-section {
	padding: 32rpx 20rpx;
}

.avatar-section {
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-bottom: 32rpx;
	cursor: pointer;
	padding: 24rpx;
	border-radius: 16rpx;
	transition: all 0.2s ease;
}

.avatar-section:active {
	background: #f3f4f6;
	transform: scale(0.98);
}

.avatar {
	width: 120rpx;
	height: 120rpx;
	border-radius: 50%;
	object-fit: cover;
	margin-bottom: 16rpx;
	border: 3px solid #e5e7eb;
	transition: all 0.2s ease;
	box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.avatar-section:active .avatar {
	border-color: #3b82f6;
	transform: scale(1.05);
}

.change-avatar {
	font-size: 24rpx;
	color: #3b82f6;
	font-weight: 500;
	transition: color 0.2s ease;
}

.avatar-section:active .change-avatar {
	color: #2563eb;
}



/* 信息列表 */
.info-list {
	background: #ffffff;
	border-radius: 16rpx;
	overflow: hidden;
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
	border: 1px solid #e5e7eb;
}

.info-item {
	display: flex;
	align-items: center;
	padding: 24rpx 32rpx;
	border-bottom: 1px solid #f3f4f6;
	cursor: pointer;
	transition: background 0.2s ease;
}

.info-item:last-child {
	border-bottom: none;
}

.info-item:active {
	background: #f9fafb;
}

.info-label {
	font-size: 28rpx;
	color: #374151;
	width: 120rpx;
	font-weight: 500;
}

.info-value {
	flex: 1;
	font-size: 28rpx;
	color: #1f2937;
	text-align: right;
	margin-right: 16rpx;
}

.info-value.placeholder {
	color: #9ca3af;
	font-style: italic;
}

.arrow {
	font-size: 24rpx;
	color: #d1d5db;
	font-weight: 400;
}

/* 不可编辑项样式 */
.info-item:nth-child(2) {
	cursor: default;
}

.info-item:nth-child(2):active {
	background: transparent;
}

.info-item:nth-child(2) .arrow {
	display: none;
}
</style>