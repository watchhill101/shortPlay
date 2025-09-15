// AdminService.js - 后台管理API服务
const API_BASE_URL = 'http://localhost:3000/api';

class AdminService {
    constructor() {
        this.token = localStorage.getItem('adminToken');
    }

    // 设置认证token
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('adminToken', token);
        } else {
            localStorage.removeItem('adminToken');
        }
    }

    // 获取请求头
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (this.token) {
            headers.Authorization = `Bearer ${this.token}`;
        }

        return headers;
    }

    // 获取带文件上传的请求头
    getFormHeaders() {
        const headers = {};

        if (this.token) {
            headers.Authorization = `Bearer ${this.token}`;
        }

        return headers;
    }

    // 通用请求方法
    async request(url, options = {}) {
        try {
            const response = await fetch(`${API_BASE_URL}${url}`, {
                ...options,
                headers: {
                    ...this.getHeaders(),
                    ...options.headers
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API请求失败:', error);
            throw error;
        }
    }

    // 文件上传请求方法
    async uploadRequest(url, formData) {
        try {
            const response = await fetch(`${API_BASE_URL}${url}`, {
                method: 'POST',
                headers: this.getFormHeaders(),
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('文件上传失败:', error);
            throw error;
        }
    }

    // ===== 合集管理 =====

    // 获取合集列表
    async getCollections(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/collection?${queryString}`);
    }

    // 获取合集详情
    async getCollection(id) {
        return this.request(`/admin/collections/${id}`);
    }

    // 创建合集
    async createCollection(data, coverImageFile) {
        const formData = new FormData();

        // 添加文本字段
        Object.keys(data).forEach((key) => {
            if (data[key] !== null && data[key] !== undefined) {
                if (Array.isArray(data[key])) {
                    formData.append(key, JSON.stringify(data[key]));
                } else {
                    formData.append(key, data[key]);
                }
            }
        });

        // 添加封面图片
        if (coverImageFile) {
            formData.append('coverImage', coverImageFile);
        }

        return this.uploadRequest('/admin/collections', formData);
    }

    // 更新合集
    async updateCollection(id, data, coverImageFile) {
        const formData = new FormData();

        // 添加文本字段
        Object.keys(data).forEach((key) => {
            if (data[key] !== null && data[key] !== undefined) {
                if (Array.isArray(data[key])) {
                    formData.append(key, JSON.stringify(data[key]));
                } else {
                    formData.append(key, data[key]);
                }
            }
        });

        // 添加封面图片
        if (coverImageFile) {
            formData.append('coverImage', coverImageFile);
        }

        const response = await fetch(`${API_BASE_URL}/admin/collections/${id}`, {
            method: 'PUT',
            headers: this.getFormHeaders(),
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }

    // 删除合集
    async deleteCollection(id) {
        return this.request(`/admin/collections/${id}`, {
            method: 'DELETE'
        });
    }

    // ===== 作品管理 =====

    // 获取作品列表
    async getWorks(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/works?${queryString}`);
    }

    // 获取合集下的作品列表
    async getWorksByCollection(collectionId, params = {}) {
        const queryString = new URLSearchParams({ collectionId, ...params }).toString();
        return this.request(`/works?${queryString}`);
    }

    // 创建作品
    async createWork(collectionId, data, videoFile, coverImageFile) {
        const formData = new FormData();

        // 添加文本字段
        Object.keys(data).forEach((key) => {
            if (data[key] !== null && data[key] !== undefined) {
                formData.append(key, data[key]);
            }
        });

        // 添加视频文件
        if (videoFile) {
            formData.append('video', videoFile);
        }

        // 添加封面图片
        if (coverImageFile) {
            formData.append('coverImage', coverImageFile);
        }

        return this.uploadRequest(`/admin/collections/${collectionId}/works`, formData);
    }

    // 更新作品
    async updateWork(id, data, videoFile, coverImageFile) {
        const formData = new FormData();

        // 添加文本字段
        Object.keys(data).forEach((key) => {
            if (data[key] !== null && data[key] !== undefined) {
                formData.append(key, data[key]);
            }
        });

        // 添加视频文件
        if (videoFile) {
            formData.append('video', videoFile);
        }

        // 添加封面图片
        if (coverImageFile) {
            formData.append('coverImage', coverImageFile);
        }

        const response = await fetch(`${API_BASE_URL}/admin/works/${id}`, {
            method: 'PUT',
            headers: this.getFormHeaders(),
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }

    // 删除作品
    async deleteWork(id) {
        return this.request(`/admin/works/${id}`, {
            method: 'DELETE'
        });
    }

    // ===== 内容审核 =====

    // 获取待审核合集
    async getReviewCollections(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/admin/review/collections?${queryString}`);
    }

    // 审核合集
    async reviewCollection(id, status, reviewNote = '') {
        return this.request(`/admin/review/collections/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ status, reviewNote })
        });
    }

    // ===== 分类管理 =====

    // 获取分类列表
    async getClassifiers() {
        return this.request('/classifier');
    }

    // 获取分类详情
    async getClassifier(id) {
        return this.request(`/classifier/${id}`);
    }

    // 创建分类
    async createClassifier(data) {
        return this.request('/classifier', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // 更新分类
    async updateClassifier(id, data) {
        return this.request(`/classifier/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // 删除分类
    async deleteClassifier(id) {
        return this.request(`/classifier/${id}`, {
            method: 'DELETE'
        });
    }

    // ===== 作品管理 =====

    // 获取作品列表
    async getWorks(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/works?${queryString}`);
    }

    // 获取作品详情
    async getWork(id) {
        return this.request(`/works/${id}`);
    }

    // 创建作品
    async createWork(data) {
        return this.request('/works', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // 更新作品
    async updateWork(id, data) {
        return this.request(`/works/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // 删除作品
    async deleteWork(id) {
        return this.request(`/works/${id}`, {
            method: 'DELETE'
        });
    }

    // ===== 统计数据 =====

    // 获取内容统计
    async getContentStats() {
        return this.request('/admin/stats/content');
    }

    // 获取用户统计
    async getUserStats() {
        return this.request('/admin/stats/users');
    }
}

// 创建单例实例
const adminService = new AdminService();

export default adminService;
