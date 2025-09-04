// 消息存储模块
class MessageStorage {
	constructor() {
		this.storageKey = 'chatMessages';
		this.conversationsKey = 'conversations';
	}

	// 获取所有对话列表
	getConversations() {
		try {
			const conversations = uni.getStorageSync(this.conversationsKey) || [];
			return conversations;
		} catch (e) {
			console.error('获取对话列表失败:', e);
			return [];
		}
	}

	// 保存对话列表
	saveConversations(conversations) {
		try {
			uni.setStorageSync(this.conversationsKey, conversations);
			return true;
		} catch (e) {
			console.error('保存对话列表失败:', e);
			return false;
		}
	}

	// 获取指定对话的消息
	getMessages(conversationId) {
		try {
			const allMessages = uni.getStorageSync(this.storageKey) || {};
			return allMessages[conversationId] || [];
		} catch (e) {
			console.error('获取消息失败:', e);
			return [];
		}
	}

	// 保存消息
	saveMessage(conversationId, message) {
		try {
			const allMessages = uni.getStorageSync(this.storageKey) || {};
			if (!allMessages[conversationId]) {
				allMessages[conversationId] = [];
			}
			
			// 添加时间戳和ID
			const newMessage = {
				id: Date.now().toString(),
				timestamp: new Date().toISOString(),
				...message
			};
			
			allMessages[conversationId].push(newMessage);
			uni.setStorageSync(this.storageKey, allMessages);
			
			// 更新对话列表
			this.updateConversation(conversationId, newMessage);
			
			return newMessage;
		} catch (e) {
			console.error('保存消息失败:', e);
			return null;
		}
	}

	// 更新对话信息
	updateConversation(conversationId, lastMessage) {
		try {
			const conversations = this.getConversations();
			const existingIndex = conversations.findIndex(c => c.id === conversationId);
			
			if (existingIndex >= 0) {
				conversations[existingIndex].lastMessage = lastMessage.content;
				conversations[existingIndex].lastTime = lastMessage.timestamp;
				conversations[existingIndex].unreadCount = (conversations[existingIndex].unreadCount || 0) + 1;
			} else {
				// 创建新对话
				conversations.push({
					id: conversationId,
					lastMessage: lastMessage.content,
					lastTime: lastMessage.timestamp,
					unreadCount: 1
				});
			}
			
			this.saveConversations(conversations);
		} catch (e) {
			console.error('更新对话失败:', e);
		}
	}

	// 标记对话为已读
	markAsRead(conversationId) {
		try {
			const conversations = this.getConversations();
			const conversation = conversations.find(c => c.id === conversationId);
			if (conversation) {
				conversation.unreadCount = 0;
				this.saveConversations(conversations);
			}
		} catch (e) {
			console.error('标记已读失败:', e);
		}
	}

	// 获取未读消息数
	getUnreadCount(conversationId) {
		try {
			const conversations = this.getConversations();
			const conversation = conversations.find(c => c.id === conversationId);
			return conversation ? (conversation.unreadCount || 0) : 0;
		} catch (e) {
			console.error('获取未读数失败:', e);
			return 0;
		}
	}

	// 清空所有消息
	clearAll() {
		try {
			uni.removeStorageSync(this.storageKey);
			uni.removeStorageSync(this.conversationsKey);
			return true;
		} catch (e) {
			console.error('清空消息失败:', e);
			return false;
		}
	}
}

export default new MessageStorage();