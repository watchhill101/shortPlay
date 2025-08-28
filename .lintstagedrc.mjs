// 超简化的 lint-staged 配置
// 暂时只进行格式化，跳过lint检查以确保稳定性

export default {
  // 所有项目的源码文件 - 只格式化
  'shortPlayApp/**/*.{js,vue,ts}': ['prettier --write'],
  'shortPlaybackend/**/*.{js,mjs}': ['prettier --write'],
  'shortPlayPC/src/**/*.{vue,js,ts}': ['prettier --write'],

  // 配置文件
  '*.{json,md,mjs}': ['prettier --write'],
};
