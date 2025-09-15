// 后台管理系统的 Socket 服务
export class AdminSocketService {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.listeners = new Map();
        this.maxReconnectAttempts = 5;
        this.reconnectAttempts = 0;
        this.reconnectInterval = 3000;
        // 在浏览器环境中使用 import.meta.env 获取环境变量
        this.serverUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws';
    }

    // 连接 WebSocket 服务器
    connect() {
        return new Promise((resolve, reject) => {
            try {
                // 检查是否有已存在的连接
                if (this.socket && this.connected) {
                    resolve(true);
                    return;
                }

                // 获取用户ID和token
                const userId = localStorage.getItem('adminUserId');
                const token = localStorage.getItem('adminToken');

                if (!userId || !token) {
                    const error = new Error('Missing admin credentials');
                    reject(error);
                    return;
                }

                // 创建新的 Socket 连接，包含必要的认证参数
                this.socket = new WebSocket(`${this.serverUrl}?userId=${userId}&token=${token}&role=admin`);

                this.socket.onopen = () => {
                    this.connected = true;
                    this.reconnectAttempts = 0;
                    console.log('✅ WebSocket 连接成功 (管理员)');
                    resolve(true);
                };

                this.socket.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        this.handleMessage(data);
                    } catch (error) {
                        console.error('❌ 解析消息失败:', error);
                    }
                };

                this.socket.onerror = (error) => {
                    this.connected = false;
                    console.error('❌ WebSocket 错误:', error);
                    reject(error);
                };

                this.socket.onclose = () => {
                    this.connected = false;
                    console.log('🔌 WebSocket 连接关闭');
                    this.handleReconnect();
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    // 重连机制
    handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`🔄 尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

            setTimeout(() => {
                this.connect();
            }, this.reconnectInterval * this.reconnectAttempts);
        }
    }

    // 发送消息
    send(event, data) {
        if (this.socket && this.connected && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(
                JSON.stringify({
                    type: event,
                    data: data
                })
            );
            return true;
        }
        console.warn('⚠️ 无法发送消息：WebSocket 未连接');
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
            this.listeners.get(event).forEach((callback) => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`❌ 处理 ${event} 事件失败:`, error);
                }
            });
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
    }

    // 获取连接状态
    isConnected() {
        return this.connected;
    }
}

// 导出单例
export default new AdminSocketService();
