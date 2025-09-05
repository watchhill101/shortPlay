/* eslint-disable */
// uni-app 全局类型定义
declare global {
  const uni: any;
  const wx: any;
  const getApp: () => any;
  const getCurrentPages: () => any[];

  interface UniApp {
    navigateTo: (options: any) => void;
    redirectTo: (options: any) => void;
    reLaunch: (options: any) => void;
    switchTab: (options: any) => void;
    navigateBack: (options?: any) => void;
    showToast: (options: any) => void;
    showModal: (options: any) => void;
    showLoading: (options: any) => void;
    hideLoading: () => void;
    createVideoContext: (id: string, component?: any) => any;
    request: (options: any) => any;
    uploadFile: (options: any) => any;
    downloadFile: (options: any) => any;
    getStorage: (options: any) => void;
    setStorage: (options: any) => void;
    removeStorage: (options: any) => void;
    clearStorage: () => void;
    getStorageSync: (key: string) => any;
    setStorageSync: (key: string, data: any) => void;
    removeStorageSync: (key: string) => void;
    clearStorageSync: () => void;
    stopPullDownRefresh: () => void;
    startPullDownRefresh: () => void;
    [key: string]: any;
  }
}

declare const uni: UniApp;

export {};
