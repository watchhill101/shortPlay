import api from './api';

export const CommentService = {
    // 获取作品信息
    async getWorkInfo(workId) {
        try {
            console.log('获取作品信息:', workId);
            const response = await api.get(`work/${workId}`);
            console.log('作品信息响应:', response.data);
            return {
                id: response.data._id,
                title: response.data.title || '未知标题',
                collectionTitle: response.data.collectionTitle || '未知合集',
                episodeNumber: response.data.episodeNumber || 1
            };
        } catch (error) {
            console.error(`获取作品信息失败 (ID: ${workId}):`, error);
            return {
                id: workId,
                title: '未知标题',
                collectionTitle: '未知合集',
                episodeNumber: 1
            };
        }
    },

    // 获取评论列表
    async getComments(params = {}) {
        try {
            const { workId, page = 1, pageSize = 10 } = params;
            let response;

            console.log('开始获取评论列表，参数:', params);

            if (workId) {
                response = await api.get(`comment/work/${workId}`);
            } else {
                response = await api.get('comment', {
                    params: {
                        page,
                        pageSize,
                        sortBy: 'createdAt',
                        sortOrder: 'desc'
                    }
                });
            }

            console.log('评论API响应:', response.data);

            // 处理两种不同的API响应格式
            let commentsData, paginationData;

            if (workId) {
                // /api/comment/work/:workId 直接返回数组
                if (Array.isArray(response.data)) {
                    commentsData = response.data;
                    paginationData = {
                        total: response.data.length,
                        page: 1,
                        pageSize: response.data.length,
                        totalPages: 1
                    };
                } else {
                    console.warn('作品评论数据格式不正确:', response.data);
                    return {
                        comments: [],
                        pagination: {
                            total: 0,
                            page: 1,
                            pageSize: 10,
                            totalPages: 0
                        }
                    };
                }
            } else {
                // /api/comment 返回 { success: true, data: {...}, pagination: {...} }
                if (response.data && response.data.success && response.data.data) {
                    // 检查data是否是数组
                    if (Array.isArray(response.data.data)) {
                        commentsData = response.data.data;
                        paginationData = response.data.pagination;
                    } else if (response.data.data && typeof response.data.data === 'object') {
                        // 如果data是对象，需要转换为数组
                        const dataObj = response.data.data;
                        commentsData = [];

                        // 遍历对象属性，提取评论数据
                        for (const key in dataObj) {
                            if (key !== 'length' && key !== 'pagination' && typeof dataObj[key] === 'object') {
                                commentsData.push(dataObj[key]);
                            }
                        }

                        paginationData = response.data.pagination || {
                            total: dataObj.length || commentsData.length,
                            page: 1,
                            pageSize: 10,
                            totalPages: 1
                        };
                    } else {
                        console.warn('评论数据格式不正确:', response.data);
                        return {
                            comments: [],
                            pagination: {
                                total: 0,
                                page: 1,
                                pageSize: 10,
                                totalPages: 0
                            }
                        };
                    }
                } else {
                    console.warn('评论数据格式不正确:', response.data);
                    return {
                        comments: [],
                        pagination: {
                            total: 0,
                            page: 1,
                            pageSize: 10,
                            totalPages: 0
                        }
                    };
                }
            }

            // 获取所有评论涉及的作品信息
            const workIds = new Set(commentsData.map((comment) => comment.collection).filter((id) => id && id !== 'undefined' && id !== null));
            const workInfoMap = new Map();

            console.log('需要获取的作品IDs:', Array.from(workIds));

            await Promise.all(
                Array.from(workIds).map(async (workId) => {
                    if (workId) {
                        const workInfo = await this.getWorkInfo(workId);
                        if (workInfo) {
                            workInfoMap.set(workId, workInfo);
                        }
                    }
                })
            );

            console.log('获取到的作品信息:', Object.fromEntries(workInfoMap));

            // 格式化评论数据
            const formattedComments = commentsData
                .map((comment) => {
                    // 验证必要字段
                    if (!comment._id) {
                        console.warn('评论缺少ID字段:', comment);
                        return null; // 跳过无效数据
                    }

                    const workInfo = workInfoMap.get(comment.collection) || {
                        title: '未知标题',
                        collectionTitle: '未知合集',
                        episodeNumber: 1
                    };

                    return {
                        id: comment._id,
                        username: comment.userInfo?.nickname || '未知用户',
                        userAvatar: comment.userInfo?.avatar || '/static/img/avatar.png',
                        workId: comment.collection || 'unknown',
                        workInfo: workInfo,
                        videoTitle: `${workInfo.collectionTitle} - 第${workInfo.episodeNumber}集`,
                        content: comment.content || '',
                        createTime: comment.createdAt || comment.createTime || new Date().toISOString(),
                        likeCount: comment.likeCount || 0,
                        replyCount: comment.replyCount || 0,
                        replies: comment.replies || []
                    };
                })
                .filter((comment) => comment !== null); // 过滤掉无效数据

            console.log('格式化后的评论数据:', {
                comments: formattedComments,
                pagination: paginationData
            });

            return {
                comments: formattedComments,
                pagination: paginationData
            };
        } catch (error) {
            console.error('获取评论列表失败:', error);
            return {
                comments: this.getMockComments(),
                pagination: {
                    total: 0,
                    page: 1,
                    pageSize: 10,
                    totalPages: 0
                }
            };
        }
    },

    // 删除评论（包括下级评论）
    async deleteComment(commentId) {
        try {
            console.log('删除评论及其回复:', commentId);
            const response = await api.delete(`comment/${commentId}`, {
                params: {
                    cascade: true // 添加级联删除参数
                }
            });

            if (response.data.success) {
                return {
                    success: true,
                    message: `评论删除成功，共删除 ${response.data.deletedCount || 1} 条评论`,
                    data: response.data
                };
            } else {
                throw new Error(response.data.message || '删除评论失败');
            }
        } catch (error) {
            console.error('删除评论失败:', error);
            throw error;
        }
    },

    // 点赞评论
    async likeComment(commentId) {
        try {
            const response = await api.post(`comment/like/${commentId}`);
            return response.data;
        } catch (error) {
            console.error('点赞评论失败:', error);
            throw error;
        }
    },

    // 添加评论
    async addComment(data) {
        try {
            const response = await api.post('comment', {
                targetType: data.targetType,
                targetId: data.targetId,
                content: data.content,
                parentComment: data.parentComment
            });
            return response.data;
        } catch (error) {
            console.error('添加评论失败:', error);
            throw error;
        }
    },

    // 通知相关用户
    async notifyRelatedUser(commentId, userId, message) {
        try {
            const response = await api.post('comment/notify', {
                commentId,
                userId,
                message
            });
            return {
                success: true,
                message: '通知发送成功',
                data: response.data
            };
        } catch (error) {
            console.error('发送通知失败:', error);
            throw error;
        }
    },

    // 获取模拟数据（仅在API调用失败时使用）
    getMockComments() {
        const mockData = [
            {
                id: '1',
                username: '测试用户1',
                userAvatar: '/static/img/1.gif',
                videoId: '60d5ecb2f9a1b33b8c3d9f2a',
                videoTitle: '爱情公寓精彩片段',
                content: '这个视频真的太精彩了，哈哈哈！',
                createTime: '2023-10-15T10:30:00',
                likeCount: 15,
                replyCount: 3
            }
            // ... 其他模拟数据 ...
        ];
        console.log('使用模拟数据:', mockData);
        return mockData;
    }
};
