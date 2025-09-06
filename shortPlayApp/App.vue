<script>
import tokenManager from '@/utils/tokenManager';

export default {
  onLaunch: function () {
    console.log('App Launch');

    // 检查登录状态
    /*
    if (!tokenManager.isLoggedIn()) {
      // 检查是否有保存的用户，如果有则尝试切换到最后一个用户
      const savedAccounts = tokenManager.getSavedAccounts();
      if (savedAccounts.length > 0) {
        // 按最后登录时间排序，切换到最近的用户
        const lastAccount = savedAccounts.sort((a, b) => new Date(b.lastLoginTime) - new Date(a.lastLoginTime))[0];

        const switchSuccess = tokenManager.switchToAccount(lastAccount.user.id);
        if (switchSuccess) {
          console.log('自动切换到用户:', lastAccount.user.nickname);
          return;
        }
      }

      // 没有保存的用户或切换失败，跳转到登录页
      setTimeout(() => {
        uni.reLaunch({
          url: '/pages/G-signUp/index',
        });
      }, 100);
    }
    */
  },
  onShow: function () {
    console.log('App Show');
  },
  onHide: function () {
    console.log('App Hide');
  },
};
</script>

<style lang="scss">
/* 注意要写在第一行，同时给style标签加入lang="scss"属性 */
@import '@/uni_modules/uview-plus/index.scss';
/*每个页面公共css */

::-webkit-scrollbar {
  display: none;
}
</style>
<!--  -->
