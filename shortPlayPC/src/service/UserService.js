import axios from 'axios';

export const UserService = {
    async getUserStats() {
        try {
            const response = await axios.get('/api/users/stats');
            return response.data;
        } catch (error) {
            console.error('获取用户统计数据失败:', error);
            throw error;
        }
    }
};

export default UserService;
