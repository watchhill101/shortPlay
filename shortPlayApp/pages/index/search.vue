<template>
	<view class="search-container">
		<view class="search-header">
			<view class="search-box">
				<input 
					class="search-input" 
					placeholder="搜索短剧..." 
					v-model="searchText"
					@input="onSearch"
					confirm-type="search"
					@confirm="handleSearch"
				/>
				<text class="search-btn" @click="handleSearch">搜索</text>
			</view>
		</view>
		
		<view class="search-content">
			<view class="search-results" v-if="searchResults.length > 0">
				<view 
					class="result-item" 
					v-for="item in searchResults" 
					:key="item.id"
					@click="goToDetail(item)"
				>
					<view class="cover">
						<image class="goods-img" :src="item.cover" mode="scaleToFill" />
					</view>
					<view class="goods-info">
						<view class="title">{{ item.title }}</view>
						<view class="brief">{{ item.description }}</view>
						<view class="meta">
							<text class="views">{{ item.views }}次播放</text>
							<text class="duration">{{ item.duration }}</text>
						</view>
					</view>
				</view>
			</view>
			
			<view class="empty-state" v-else-if="hasSearched">
				<image class="empty-icon" src="../../static/img/search-icon.png" mode="aspectFit" />
				<text class="empty-text">暂无搜索结果</text>
				<text class="empty-tip">试试其他关键词吧</text>
			</view>
			
			<view class="hot-searches" v-else>
				<view class="dfbox">
					<view class="title">热门搜索</view>
				</view>
				<view class="hot-tags">
					<text 
						class="hot-tag" 
						v-for="tag in hotTags" 
						:key="tag"
						@click="searchByTag(tag)"
					>
						{{ tag }}
					</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			searchText: '',
			searchResults: [],
			hasSearched: false,
			hotTags: ['都市情感', '古装宫廷', '悬疑推理', '青春校园', '职场商战', '科幻奇幻']
		}
	},
	methods: {
		onSearch(e) {
			this.searchText = e.detail.value
		},
		handleSearch() {
			if (!this.searchText.trim()) {
				uni.showToast({
					title: '请输入搜索内容',
					icon: 'none'
				})
				return
			}
			
			// 模拟搜索
			this.hasSearched = true
			this.searchResults = [
				{
					id: 1,
					title: '都市情感短剧《爱的温度》',
					description: '讲述都市男女在快节奏生活中寻找真爱的温暖故事',
					cover: '../../static/img/video.png',
					views: '12.5万',
					duration: '45分钟'
				},
				{
					id: 2,
					title: '古装宫廷《凤舞九天》',
					description: '宫廷权谋与爱情纠葛的精彩古装短剧',
					cover: '../../static/img/video.png',
					views: '8.9万',
					duration: '52分钟'
				}
			]
		},
		searchByTag(tag) {
			this.searchText = tag
			this.handleSearch()
		},
		goToDetail(item) {
			uni.navigateTo({
				url: `/pages/playlet/detail?id=${item.id}`
			})
		}
	}
}
</script>

<style scoped lang="scss">
.search-container {
	width: 100%;
	background-color: #0e0f0f;
	min-height: 100vh;
}

.search-header {
	position: fixed;
	z-index: 10;
	width: 100%;
	top: 65rpx;
	padding: 20rpx 30rpx;
	background-color: #0e0f0f;
}

.search-box {
	display: flex;
	align-items: center;
	background: #1a1a1a;
	border-radius: 50rpx;
	padding: 20rpx 30rpx;
	border: 2rpx solid #333;
}

.search-input {
	flex: 1;
	font-size: 28rpx;
	color: #d4d4d4;
	height: 60rpx;
	background: transparent;
}

.search-btn {
	background: linear-gradient(135deg, #ba8f40 0%, #d4af7a 100%);
	color: #fff;
	padding: 15rpx 30rpx;
	border-radius: 25rpx;
	font-size: 26rpx;
	margin-left: 20rpx;
	font-weight: 500;
}

.search-content {
	padding: 140rpx 30rpx 30rpx;
}

.search-results {
	.result-item {
		display: flex;
		background: #1a1a1a;
		padding: 25rpx;
		margin-bottom: 20rpx;
		border-radius: 15rpx;
		border: 1rpx solid #333;
		
		.cover {
			width: 140rpx;
			height: 180rpx;
			margin-right: 25rpx;
			
			.goods-img {
				width: 100%;
				height: 100%;
				border-radius: 8rpx;
			}
		}
		
		.goods-info {
			flex: 1;
			display: flex;
			flex-direction: column;
			justify-content: space-between;
			
			.title {
				font-size: 32rpx;
				font-weight: 600;
				color: #d4d4d4;
				margin-bottom: 15rpx;
				line-height: 1.4;
			}
			
			.brief {
				font-size: 26rpx;
				color: #858585;
				line-height: 1.5;
				margin-bottom: 15rpx;
				overflow: hidden;
				-webkit-line-clamp: 2;
				text-overflow: ellipsis;
				display: -webkit-box;
				-webkit-box-orient: vertical;
			}
			
			.meta {
				display: flex;
				justify-content: space-between;
				align-items: center;
				
				.views {
					font-size: 24rpx;
					color: #858585;
				}
				
				.duration {
					font-size: 24rpx;
					color: #ba8f40;
					background: rgba(186, 143, 64, 0.1);
					padding: 8rpx 16rpx;
					border-radius: 20rpx;
				}
			}
		}
	}
}

.empty-state {
	text-align: center;
	padding: 120rpx 0;
	
	.empty-icon {
		width: 120rpx;
		height: 120rpx;
		margin-bottom: 30rpx;
		opacity: 0.6;
	}
	
	.empty-text {
		font-size: 30rpx;
		color: #858585;
		margin-bottom: 15rpx;
		display: block;
	}
	
	.empty-tip {
		font-size: 26rpx;
		color: #666;
	}
}

.hot-searches {
	.dfbox {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		margin-bottom: 30rpx;
		
		.title {
			font-size: 38rpx;
			color: #A1A1A1;
		}
	}
	
	.hot-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 20rpx;
		
		.hot-tag {
			background: #1a1a1a;
			color: #ba8f40;
			padding: 15rpx 25rpx;
			border-radius: 25rpx;
			font-size: 26rpx;
			border: 2rpx solid #333;
			transition: all 0.3s ease;
			
			&:active {
				background: #ba8f40;
				color: #fff;
				border-color: #ba8f40;
			}
		}
	}
}
</style>