import axios from 'axios';

// 创建axios实例
const api = axios.create({
    baseURL: 'http://localhost:3000/api/', // 设置基础URL
    timeout: 15000, // 请求超时时间
    headers: {
        'Content-Type': 'application/json'
    }
});

// 请求拦截器
api.interceptors.request.use(
    (config) => {
        // 在发送请求之前做些什么
        console.log('发送请求:', config.url, config.params || config.data);
        return config;
    },
    (error) => {
        // 对请求错误做些什么
        console.error('请求错误:', error);
        return Promise.reject(error);
    }
);

// 响应拦截器
api.interceptors.response.use(
    (response) => {
        // 对响应数据做点什么
        console.log('接收响应:', response.config.url, response.data);
        return response;
    },
    (error) => {
        // 对响应错误做点什么
        console.error('响应错误:', error.response?.status, error.response?.data || error.message);
        return Promise.reject(error);
    }
);

export default api;
