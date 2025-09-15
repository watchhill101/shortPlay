import api from './api';

export const CollectionService = {
    // 获取合集列表
    async getCollections(params) {
        try {
            const response = await api.get('/api/collection', { params });
            return response.data;
        } catch (error) {
            console.error('获取合集列表失败:', error);
            return [];
        }
    },

    // 获取合集下的作品列表
    async getWorksByCollection(collectionId) {
        try {
            // 获取作品列表
            const response = await api.get('/api/work/videos', {
                params: {
                    collectionId,
                    status: 'published'
                }
            });

            if (!response.data) {
                return [];
            }

            // 获取每个作品的点赞和收藏数据
            const works = response.data;
            const worksWithStats = works.map((work) => ({
                ...work,
                likeCount: work.likeCount || 0,
                collectCount: work.collectCount || 0
            }));

            return {
                data: worksWithStats,
                total: worksWithStats.length,
                stats: {
                    totalLikes: worksWithStats.reduce((sum, work) => sum + (work.likeCount || 0), 0),
                    totalCollects: worksWithStats.reduce((sum, work) => sum + (work.collectCount || 0), 0)
                }
            };
        } catch (error) {
            console.error(`获取合集${collectionId}的作品列表失败:`, error);
            return {
                data: [],
                total: 0,
                stats: {
                    totalLikes: 0,
                    totalCollects: 0
                }
            };
        }
    },

    // 获取热门短剧Top10
    async getHotCollectionsTop10() {
        try {
            // 1. 获取所有合集
            const response = await this.getCollections({
                page: 1,
                pageSize: 20,
                sortBy: 'totalPlayCount',
                sortOrder: 'desc'
            });

            if (!response || !response.data) {
                return { data: [], pagination: { total: 0 } };
            }

            // 2. 获取每个合集的作品数据
            const collectionsData = await Promise.all(
                response.data.map(async (collection) => {
                    const worksData = await this.getWorksByCollection(collection._id);
                    return {
                        ...collection,
                        workCount: worksData.total,
                        totalLikes: worksData.stats.totalLikes,
                        totalCollections: worksData.stats.totalCollects
                    };
                })
            );

            // 3. 计算综合热度并排序
            const sortedCollections = collectionsData
                .map((collection) => {
                    // 热度计算公式：播放量(60%) + 点赞数(20%) + 收藏数(20%)
                    const score = (collection.totalPlayCount || 0) * 0.6 + (collection.totalLikes || 0) * 0.2 + (collection.totalCollections || 0) * 0.2;
                    return { ...collection, score };
                })
                .sort((a, b) => b.score - a.score)
                .slice(0, 10)
                .map((collection, index) => ({
                    ...collection,
                    hotPercentage: Math.max(100 - index * 5, 30) // 计算热度百分比，确保最低30%
                }));

            return {
                data: sortedCollections,
                pagination: response.pagination
            };
        } catch (error) {
            console.error('获取热门短剧Top10失败:', error);
            return { data: [], pagination: { total: 0 } };
        }
    },

    // 获取热门短剧播放数据
    async getHotCollectionsPlayData() {
        try {
            const response = await api.get('/api/collection/stats');
            return response.data;
        } catch (error) {
            console.error('获取热门短剧播放数据失败:', error);
            return [];
        }
    },

    // 获取播放趋势数据
    async getPlayTrends() {
        try {
            const response = await api.get('/api/collection/play-trends');
            return response.data;
        } catch (error) {
            console.error('获取播放趋势数据失败:', error);
            return [];
        }
    }
};
