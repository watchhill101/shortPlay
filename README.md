# shortPlay

短视频应用 - 多项目代码规范管理

## 📋 项目结构

这是一个 monorepo 项目，包含以下三个子项目：

- **shortPlayApp** - uni-app 移动端应用
- **shortPlaybackend** - Express.js 后端服务
- **shortPlayPC** - Vue3 + PrimeVue PC 端应用

## 🚀 快速开始

### 安装依赖

```bash
npm run install:all
```

### 开发环境运行

```bash
# 运行移动端应用
npm run dev:app

# 运行后端服务
npm run dev:backend

# 运行PC端应用
npm run dev:pc
```

## 📦 命令说明

### 安装命令

| 命令                  | 作用                 |
| --------------------- | -------------------- |
| `npm run install:all` | 安装所有项目的依赖包 |

### 开发命令

| 命令                  | 作用                     |
| --------------------- | ------------------------ |
| `npm run dev:app`     | 启动移动端应用开发服务器 |
| `npm run dev:backend` | 启动后端服务开发服务器   |
| `npm run dev:pc`      | 启动PC端应用开发服务器   |

### 构建命令

| 命令                    | 作用                   |
| ----------------------- | ---------------------- |
| `npm run build:app`     | 构建移动端应用生产版本 |
| `npm run build:backend` | 构建后端服务生产版本   |
| `npm run build:pc`      | 构建PC端应用生产版本   |

### 代码质量检查

#### ESLint 代码规范检查

| 命令                   | 作用                           |
| ---------------------- | ------------------------------ |
| `npm run lint`         | 检查所有项目的代码规范         |
| `npm run lint:fix`     | 自动修复所有项目的代码规范问题 |
| `npm run lint:app`     | 仅检查移动端应用的代码规范     |
| `npm run lint:backend` | 仅检查后端服务的代码规范       |
| `npm run lint:pc`      | 仅检查PC端应用的代码规范       |

#### Prettier 代码格式化

| 命令                   | 作用                               |
| ---------------------- | ---------------------------------- |
| `npm run format`       | 格式化所有项目的代码               |
| `npm run format:check` | 检查所有项目的代码格式是否符合规范 |

#### Stylelint CSS样式检查

| 命令                    | 作用                               |
| ----------------------- | ---------------------------------- |
| `npm run stylelint`     | 检查所有项目的CSS/SCSS样式规范     |
| `npm run stylelint:fix` | 自动修复所有项目的CSS/SCSS样式问题 |

### 性能与工具

| 命令                       | 作用                                                |
| -------------------------- | --------------------------------------------------- |
| `npm run lint:performance` | 测试lint-staged性能和执行时间                       |
| `npm run precommit`        | 手动执行提交前的代码检查（通常由Git hooks自动触发） |

### Git Hooks

| 命令              | 作用                                      |
| ----------------- | ----------------------------------------- |
| `npm run prepare` | 安装Husky Git hooks（安装依赖时自动执行） |

## 🛠️ 代码规范工具

项目集成了完整的代码质量保证体系：

### ESLint 配置

- ✅ JavaScript/TypeScript 代码规范检查
- ✅ Vue 组件规范检查
- ✅ Node.js 环境优化配置
- ✅ uni-app 全局变量支持

### Stylelint 配置

- ✅ CSS/SCSS 样式规范检查
- ✅ Vue 单文件组件样式支持
- ✅ SCSS 语法支持（@use, @mixin, @include等）
- ✅ 排除第三方CSS文件检查

### Prettier 配置

- ✅ 统一的代码格式化规则
- ✅ 支持JavaScript、TypeScript、Vue、CSS、JSON、Markdown
- ✅ 120字符行宽限制
- ✅ 单引号、分号、ES5尾逗号

### Commitlint 配置

- ✅ 规范的Git提交信息格式检查
- ✅ 支持的提交类型：feat, fix, docs, style, refactor, perf, test, chore, ci, build, revert

## 🔧 开发工作流

### 提交代码

```bash
git add .
git commit -m "feat: 添加新功能"
```

在提交时，以下检查会自动执行：

1. ESLint 代码规范检查和自动修复
2. Stylelint CSS样式检查和自动修复
3. Prettier 代码格式化
4. Commitlint 提交信息格式验证

### 手动代码检查

```bash
# 全面代码质量检查
npm run lint
npm run stylelint
npm run format:check

# 自动修复问题
npm run lint:fix
npm run stylelint:fix
npm run format
```

## 📋 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0

## 📖 项目文档

- **代码规范配置**: 查看各项目的 `eslint.config.mjs` 和 `.stylelintrc.json`
- **Prettier配置**: 查看根目录 `.prettierrc`
- **Git提交规范**: 查看 `commitlint.config.mjs`
- **性能测试**: 使用 `npm run lint:performance` 监控工具链性能

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/新功能`)
3. 提交变更 (`git commit -m 'feat: 添加新功能'`)
4. 推送到分支 (`git push origin feature/新功能`)
5. 创建 Pull Request

请确保您的代码通过所有质量检查。
