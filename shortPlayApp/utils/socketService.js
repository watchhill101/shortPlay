// 简化的聊天服务
class SocketService {
	constructor() {
		this.socket = null;
		this.connected = false;
		this.listeners = new Map();
	}

	// 连接WebSocket服务器
	connect(userId, token) {
		return new Promise((resolve, reject) => {
			try {
				console.log('连接WebSocket服务器...');
				
				const socketTask = uni.connectSocket({
					url: `ws://localhost:3000/ws?userId=${userId}&token=${token}`,
					success: () => {
						console.log('WebSocket连接请求发送成功');
					},
					fail: (error) => {
						console.error('WebSocket连接请求失败:', error);
						reject(error);
					}
				});

				socketTask.onOpen((res) => {
					console.log('WebSocket连接成功');
					this.connected = true;
					this.socket = socketTask;
					resolve(true);
				});

				socketTask.onMessage((res) => {
					try {
						const data = JSON.parse(res.data);
						this.handleMessage(data);
					} catch (error) {
						console.error('解析消息失败:', error);
					}
				});

				socketTask.onError((error) => {
					console.error('WebSocket连接错误:', error);
					this.connected = false;
					reject(error);
				});

				socketTask.onClose(() => {
					console.log('WebSocket连接关闭');
					this.connected = false;
				});

			} catch (error) {
				console.error('初始化WebSocket失败:', error);
				reject(error);
			}
		});
	}

	// 发送消息
	emit(event, data) {
		if (this.socket && this.connected) {
			this.socket.send({
				data: JSON.stringify({
					type: event,
					data: data
				})
			});
			return true;
		}
		return false;
	}

	// 监听事件
	on(event, callback) {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, []);
		}
		this.listeners.get(event).push(callback);
	}

	// 移除监听
	off(event, callback) {
		if (this.listeners.has(event)) {
			const callbacks = this.listeners.get(event);
			const index = callbacks.indexOf(callback);
			if (index > -1) {
				callbacks.splice(index, 1);
			}
		}
	}

	// 处理接收到的消息
	handleMessage(data) {
		const event = data.type;
		if (this.listeners.has(event)) {
			this.listeners.get(event).forEach(callback => {
				try {
					callback(data);
				} catch (error) {
					console.error('处理Socket事件失败:', error);
				}
			});
		}
	}

	// 重连
	reconnect(userId, token) {
		if (this.reconnectAttempts < this.maxReconnectAttempts) {
			this.reconnectAttempts++;
			console.log(`尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
			
			setTimeout(() => {
				this.connect(userId, token);
			}, 2000 * this.reconnectAttempts);
		} else {
			console.log('重连次数已达上限');
		}
	}

	// 断开连接
	disconnect() {
		if (this.socket) {
			this.socket.close();
			this.socket = null;
		}
		this.connected = false;
		this.listeners.clear();
		console.log('Socket服务已断开');
	}

	// 加入好友聊天房间
	joinFriendChat(friendId) {
		return this.emit('joinFriendChat', { friendId });
	}

	// 离开好友聊天房间
	leaveFriendChat(friendId) {
		return this.emit('leaveFriendChat', { friendId });
	}

	// 发送好友消息
	sendFriendMessage(friendId, message, messageType = 'text') {
		return this.emit('sendFriendMessage', {
			friendId,
			message,
			messageType
		});
	}

	// 获取连接状态
	isConnected() {
		return this.connected;
	}
}

export default new SocketService(); 