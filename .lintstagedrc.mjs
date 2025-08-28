// 优化的 lint-staged 配置
// 添加ESLint检查 + 代码格式化

export default {
  // shortPlayApp项目 - 使用workspace命令确保正确的eslint配置
  'shortPlayApp/**/*.{js,vue,ts}': ['npm run lint:fix --workspace=shortPlayApp', 'prettier --write'],

  // shortPlaybackend项目 - 使用workspace命令确保正确的eslint配置
  'shortPlaybackend/**/*.{js,mjs}': ['npm run lint:fix --workspace=shortPlaybackend', 'prettier --write'],

  // shortPlayPC项目 - 使用workspace命令确保正确的eslint配置
  'shortPlayPC/src/**/*.{vue,js,ts}': ['npm run lint:fix --workspace=shortPlayPC', 'prettier --write'],

  // 配置文件 - 只格式化
  '*.{json,md,mjs}': ['prettier --write'],
};
