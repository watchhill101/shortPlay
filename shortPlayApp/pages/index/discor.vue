<template>
  <scroll-view id="containerId" scroll-y="" style="height: 100%" @scrolltolower="toLoadMorePlaylet()">
		<view class="maincontainer">
			<view class="content">
				<view class="goods-swiper" v-if="bannerList.length > 0">
          <swiper
            :indicator-dots="true"
            :interval="3000"
            :duration="1000"
            indicator-color="#999"
            indicator-active-color="#ba8f40"
            autoplay="true"
          >
            <swiper-item v-for="(item, index) in bannerList" :key="index" @click="toBannerItem(item)">
							<view class="swiper-item">
								<image src="../../static/img/video.png" class="vicon" mode="scaleToFill"></image>
								<image :src="item.image" class="goods-banner" mode="scaleToFill"></image>
							</view>
						</swiper-item>
					</swiper>
				</view>

				<!--合集列表-->
        <block v-for="(colls, index) in playletCollections">
					<view class="playlet-collections" scroll-x>
						<view class="dfbox" @click="toCollectionPlaylet(colls)">
              <view class="title pt10">{{ colls.name }}</view>
							<image src="../../static/img/right_jt.png" class="xzback" mode="scaleToFill"></image>
						</view>
						<scroll-view class="item" scroll-x="true" show-scrollbar="false">
              <view
                class="playlet"
                v-for="(item, index) in colls.playletList"
                :keys="index"
                @tap="toPalyletDetail(item)"
              >
								<view class="cover">
									<image :src="item.smallImage" class="goods-img" mode="scaleToFill"></image>
								</view>
								<view class="goods-info flex-1">
                  <view class="title">{{ item.title }}</view>
								</view>
							</view>
						</scroll-view>
					</view>
				</block>

				<!--短剧推荐列表-->
				<view class="playlet-recommend">
					<view class="dfbox">
						<view class="title pt10">最新短剧</view>
					</view>
					<view class="item">
            <view class="playlet" v-for="(item, index) in playletRecommends" :keys="index" @tap="toPalyletDetail(item)">
							<view class="cover">
								<image :src="item.image" class="goods-img" mode="scaleToFill"></image>
							</view>
							<view class="goods-info flex-1">
                <view class="title">{{ item.title }}</view>
                <view class="brief">{{ item.brief }}</view>
							</view>
						</view>
            <view v-if="playletRecommends.length % 3 != 0" class="playlet-empty"></view>
					</view>
				</view>
			</view>

			<!-- tabbar 占位 -->
      <view style="height: (50px + env(safe-area-inset-bottom) / 2); min-height: 100rpx"></view>
		</view>
	</scroll-view>
</template>

<script>
	export default {
		components: {},

		data() {
			return {
				meUni: uni,

				//横幅
				bannerList: [],

				//合集
				playletCollections: [],

				//推荐短剧
				playletRecommends: [],

				loading: false,
				loaded: false,
    };
		},

		created() {
			let me = this;
			me.initPageData();
		},

		onReady() {},

		toPullDownRefresh() {
			let me = this;

			if (!me.loading) {
				me.initPageData();
			}
    setTimeout(uni.stopPullDownRefresh, 500);
		},

  beforeUnmount() {
			let me = this;
		},

  mounted: function () {
			let me = this;
		},

		computed: {},

		methods: {
			initPageData() {
				let me = this;

				me.queryBanner();
				me.playletQueryCollection();
				me.playletQueryRecommend();
			},

			toSearchGoods() {
				let me = this;
			},

			toLoadMorePlaylet() {
				let me = this;
			},

			//公告
			queryBanner() {
				let me = this;

      me.bannerList = [
        {
          id: 1,
          title: '短剧Demo1',
          image: 'https://env-00jxhb2rkow0.normal.cloudstatic.cn/xqx-playlet/small_001.jpg',
        },
        {
          id: 2,
          title: '短剧Demo2',
          image: 'https://env-00jxhb2rkow0.normal.cloudstatic.cn/xqx-playlet/small_005.jpg',
        },
      ];
    },

			//获取短剧合集
			playletQueryCollection() {
				let me = this;

      me.playletCollections = [
        {
          id: 1,
          name: '最热短剧',
          playletList: [
            {
              playletId: 41,
              title: '短剧Demo',
              image: 'https://env-00jxhb2rkow0.normal.cloudstatic.cn/xqx-playlet/big_003.jpg',
              smallImage: 'https://env-00jxhb2rkow0.normal.cloudstatic.cn/xqx-playlet/small_003.jpg',
            },
            {
              playletId: 42,
              title: '短剧Demo',
              image: 'https://env-00jxhb2rkow0.normal.cloudstatic.cn/xqx-playlet/big_004.jpg',
              smallImage: 'https://env-00jxhb2rkow0.normal.cloudstatic.cn/xqx-playlet/small_004.jpg',
            },
            {
              playletId: 43,
              title: '短剧很好看',
              image: 'https://env-00jxhb2rkow0.normal.cloudstatic.cn/xqx-playlet/big_007.jpg',
              smallImage: 'https://env-00jxhb2rkow0.normal.cloudstatic.cn/xqx-playlet/small_007.jpg',
            },
            {
              playletId: 44,
              title: '短剧很好看',
              image: 'https://env-00jxhb2rkow0.normal.cloudstatic.cn/xqx-playlet/big_005.jpg',
              smallImage: 'https://env-00jxhb2rkow0.normal.cloudstatic.cn/xqx-playlet/small_005.jpg',
            },
            {
              playletId: 45,
              title: '失百仙过海',
              image: 'https://env-00jxhb2rkow0.normal.cloudstatic.cn/xqx-playlet/big_006.jpg',
              smallImage: 'https://env-00jxhb2rkow0.normal.cloudstatic.cn/xqx-playlet/small_006.jpg',
            },
          ],
        },
        {
          id: 4,
          name: '热榜短剧',
          playletList: [
            {
              playletId: 46,
              title: '短剧很好看',
              image: 'https://env-00jxhb2rkow0.normal.cloudstatic.cn/xqx-playlet/big_006.jpg',
              smallImage: 'https://env-00jxhb2rkow0.normal.cloudstatic.cn/xqx-playlet/small_006.jpg',
            },
            {
              playletId: 47,
              title: '短剧Demo',
              image: 'https://env-00jxhb2rkow0.normal.cloudstatic.cn/xqx-playlet/big_007.jpg',
              smallImage: 'https://env-00jxhb2rkow0.normal.cloudstatic.cn/xqx-playlet/small_007.jpg',
            },
            {
              playletId: 48,
              title: '短剧Demo',
              image: 'https://env-00jxhb2rkow0.normal.cloudstatic.cn/xqx-playlet/big_002.jpg',
              smallImage: 'https://env-00jxhb2rkow0.normal.cloudstatic.cn/xqx-playlet/small_002.jpg',
            },
          ],
        },
      ];
			},

			//获取短剧列表
			playletQueryRecommend() {
				let me = this;

      me.playletRecommends = [
        {
          playletId: 53,
          title: '短剧Demo',
          brief: '短剧Demo短剧Demo短剧Demo短剧Demo短剧Demo短剧Demo',
          image: 'https://env-00jxhb2rkow0.normal.cloudstatic.cn/xqx-playlet/big_007.jpg',
          smallImage: 'https://env-00jxhb2rkow0.normal.cloudstatic.cn/xqx-playlet/small_007.jpg',
        },
        {
          playletId: 50,
          title: '短剧Demo',
          brief: '短剧Demo短剧Demo短剧Demo短剧Demo短剧Demo短剧Demo',
          image: 'https://env-00jxhb2rkow0.normal.cloudstatic.cn/xqx-playlet/big_006.jpg',
          smallImage: 'https://env-00jxhb2rkow0.normal.cloudstatic.cn/xqx-playlet/small_006.jpg',
        },
        {
          playletId: 42,
          title: '短剧Demo',
          brief: '短剧Demo短剧Demo短剧Demo短剧Demo短剧Demo短剧Demo',
          image: 'https://env-00jxhb2rkow0.normal.cloudstatic.cn/xqx-playlet/big_003.jpg',
          smallImage: 'https://env-00jxhb2rkow0.normal.cloudstatic.cn/xqx-playlet/small_003.jpg',
        },
        {
          playletId: 48,
          title: '短剧Demo',
          brief: '短剧Demo短剧Demo短剧Demo短剧Demo短剧Demo短剧Demo',
          image: 'https://env-00jxhb2rkow0.normal.cloudstatic.cn/xqx-playlet/big_004.jpg',
          smallImage: 'https://env-00jxhb2rkow0.normal.cloudstatic.cn/xqx-playlet/small_004.jpg',
        },
        {
          playletId: 47,
          title: '短剧Demo',
          brief: '短剧Demo短剧Demo短剧Demo短剧Demo短剧Demo短剧Demo',
          image: 'https://env-00jxhb2rkow0.normal.cloudstatic.cn/xqx-playlet/big_005.jpg',
          smallImage: 'https://env-00jxhb2rkow0.normal.cloudstatic.cn/xqx-playlet/small_005.jpg',
        },
        {
          playletId: 46,
          title: '短剧很好看',
          brief: '隐居山林的战主沐辰在属下的召唤下出山，得知自己爱人苏雪遭受迫害便投身到拯救爱人和家庭的战斗中。',
          image: 'https://env-00jxhb2rkow0.normal.cloudstatic.cn/xqx-playlet/big_006.jpg',
          smallImage: 'https://env-00jxhb2rkow0.normal.cloudstatic.cn/xqx-playlet/small_006.jpg',
        },
        {
          playletId: 44,
          title: '短剧很好看',
          brief: '一次事故失忆后的黎雾，被四个帅哥团团包围，瞬间成为抢手团宠。',
          image: 'https://env-00jxhb2rkow0.normal.cloudstatic.cn/xqx-playlet/big_003.jpg',
          smallImage: 'https://env-00jxhb2rkow0.normal.cloudstatic.cn/xqx-playlet/small_003.jpg',
        },
        {
          playletId: 43,
          title: '短剧很好看',
          brief: '短剧Demo短剧Demo短剧Demo短剧Demo短剧Demo短剧Demo',
          image: 'https://env-00jxhb2rkow0.normal.cloudstatic.cn/xqx-playlet/big_007.jpg',
          smallImage: 'https://env-00jxhb2rkow0.normal.cloudstatic.cn/xqx-playlet/small_003.jpg',
        },
        {
          playletId: 41,
          title: '短剧Demo',
          brief: '短剧Demo短剧Demo短剧Demo短剧Demo短剧Demo短剧Demo',
          image: 'https://env-00jxhb2rkow0.normal.cloudstatic.cn/xqx-playlet/big_001.jpg',
          smallImage: 'https://env-00jxhb2rkow0.normal.cloudstatic.cn/xqx-playlet/small_001.jpg',
        },
        {
          playletId: 40,
          title: '短剧Demo',
          brief: '却发现发生了许许多多的变故，寻找多年未见的未婚妻叶婉儿，，他决心改变这个现状。',
          image: 'https://env-00jxhb2rkow0.normal.cloudstatic.cn/xqx-playlet/big_002.jpg',
          smallImage: 'https://env-00jxhb2rkow0.normal.cloudstatic.cn/xqx-playlet/small_002.jpg',
        },
        {
          playletId: 39,
          title: '短剧Demo',
          brief: '逐步揭露能看到万物的价格。在各种挑战中，背后的阴谋，利用自己的智慧和资源',
          image: 'https://env-00jxhb2rkow0.normal.cloudstatic.cn/xqx-playlet/big_004.jpg',
          smallImage: 'https://env-00jxhb2rkow0.normal.cloudstatic.cn/xqx-playlet/smal4_001.jpg',
        },
      ];
			},
			
			//点击横幅
			toBannerItem(item) {
				let me = this;

				uni.navigateTo({
        url: '/pages/playlet/episodes?episodesStart=' + 1,
      });
			},

			toCollectionPlaylet(colls) {
				let me = this;
			},
			
			//点击短剧详情
			toPalyletDetail(item) {
				let me = this;

				uni.navigateTo({
        url: '/pages/playlet/detail?playletId=' + item.playletId,
      });
    },
  },
};
</script>

<style scoped lang="scss">
	.maincontainer {
		width: 100%;
		height: 100%;
		min-height: 100vh;
		background-color: #0e0f0fS;
	}

	.content {
		position: relative;
		border-radius: 30rpx 30rpx 0 0;
		margin-top: 10rpx;
		padding-left: 20rpx;
		padding-right: 20rpx;
		z-index: 1;
	}

	.playlet-collections {
		margin-top: 30rpx;
		padding: 10rpx 15rpx 20rpx 15rpx;
		border-radius: 10rpx 10rpx 0 0;
		background: #1e1e1e;
	}

	.playlet-collections .item {
		white-space: nowrap;
		border-radius: 6rpx;
	}

	.playlet-collections .item .playlet {
		display: inline-flex !important;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		width: 32%;
		border-radius: 0 0 8rpx 8rpx;
		margin-right: 20rpx;

		.cover {
			width: 100%;
			height: 312rpx;
			position: relative;

			.goods-img {
				width: 100%;
				height: 100%;
				border-radius: 8rpx;
			}
		}

		.goods-info {
			display: flex;
			flex-direction: column;
			width: 100%;
			margin-top: 10rpx;

			.title {
				width: 100%;
				font-size: 32rpx;
				text-align: left;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
				color: #d4d4d4;
			}
		}
	}

	.playlet-recommend {
		margin-top: 30rpx;
		padding: 10rpx 15rpx 20rpx 15rpx;
		border-radius: 10rpx 10rpx 0 0;
		background: #1E1E1ES;
	}

	.playlet-recommend .item {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: space-between;
	}

	.playlet-recommend .item .playlet-empty {
		width: 49%;
	}

	.playlet-recommend .item .playlet {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		width: 49%;
		margin-bottom: 20rpx;
		border-radius: 0 0 8rpx 8rpx;

		.cover {
			width: 100%;
			height: 212rpx;
			position: relative;

			.goods-img {
				width: 100%;
				height: 100%;
				border-radius: 8rpx;
			}
		}

		.goods-info {
			display: flex;
			flex-direction: column;
			margin-top: 15rpx;
			width: 100%;

			.title {
				width: 100%;
				font-size: 32rpx;
				text-align: left;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
				color: #d4d4d4;
			}

			.brief {
				width: 100%;
				font-size: 22rpx;
				text-align: left;
				color: #858585;
				overflow: hidden;
				-webkit-line-clamp: 2;
				text-overflow: ellipsis;
				display: -webkit-box;
				-webkit-box-orient: vertical;
			}
		}
	}

	.dfbox {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		margin-bottom: 20rpx;

		.title {
			font-size: 38rpx;
    color: #a1a1a1;
		}
	}

	.xzback {
		width: 30rpx;
		height: 30rpx;
		z-index: 1;
	}

	.goods-swiper swiper {
		width: 100%;
		height: 400rpx;
	}

	.swiper-item {
		position: relative;
		height: 100%;
		display: flex;
		justify-content: center;

		.vicon {
			position: absolute;
			width: 50rpx;
			height: 50rpx;
			bottom: 10rpx;
			right: 10rpx;
			color: #000000;
			z-index: 10;
		}

		.goods-banner {
			width: 100%;
		}
	}
</style>
