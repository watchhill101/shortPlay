// 完整的 lint-staged 配置
// ESLint检查 + Stylelint检查 + 代码格式化

export default {
  // shortPlayApp项目 - JavaScript/Vue文件
  'shortPlayApp/**/*.{js,vue,ts}': ['npm run lint:fix --workspace=shortPlayApp', 'prettier --write'],

  // shortPlayApp项目 - 仅检查自定义样式文件
  'shortPlayApp/**/*.{css,scss}': ['npm run stylelint:fix --workspace=shortPlayApp'],

  // shortPlaybackend项目 - 只有JS文件（无样式文件）
  'shortPlaybackend/**/*.{js,mjs}': ['npm run lint:fix --workspace=shortPlaybackend', 'prettier --write'],

  // shortPlayPC项目 - JavaScript/Vue文件
  'shortPlayPC/src/**/*.{vue,js,ts}': ['npm run lint:fix --workspace=shortPlayPC', 'prettier --write'],

  // shortPlayPC项目 - 仅检查src目录下的自定义样式文件，排除第三方CSS
  'shortPlayPC/src/{components,views,layout}/**/*.{css,scss,vue}': ['npm run stylelint:fix --workspace=shortPlayPC'],

  // 配置文件 - 只格式化
  '*.{json,md,mjs}': ['prettier --write'],
};
