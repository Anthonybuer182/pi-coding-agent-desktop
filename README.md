# Pi Coding Agent Desktop

基于 Electron + React 的 AI 编程助手桌面应用，提供 Web 和桌面双端体验。

## 技术栈

- **Desktop**: Electron + electron-vite + React 19
- **Web**: Vite + React 19
- **UI**: Tailwind CSS + shadcn/ui 组件库
- **构建**: Turborepo + pnpm workspace
- **语言**: TypeScript

## 项目结构

```
pi-coding-agent-desktop/
├── apps/
│   ├── desktop/          # Electron 桌面应用
│   │   ├── src/main/     # 主进程
│   │   ├── src/preload/  # 预加载脚本
│   │   └── src/renderer/ # 渲染进程 (React)
│   └── web/              # Web 应用
├── packages/
│   ├── sdk-wrapper/      # SDK 封装层 (IPC/HTTP 双传输层)
│   ├── types/            # 共享类型定义
│   └── ui/               # 共享 UI 组件库
├── pnpm-workspace.yaml
└── turbo.json
```

## 环境要求

- Node.js >= 20.0.0
- pnpm >= 9.0.0

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动 Web 开发服务器
pnpm dev:web

# 启动桌面应用开发
pnpm dev:desktop
```

## 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm dev:web` | 启动 Web 应用 (localhost:5173) |
| `pnpm dev:desktop` | 启动 Electron 桌面应用 |
| `pnpm build` | 构建所有子包 |
| `pnpm typecheck` | 类型检查 |
| `pnpm lint` | 代码检查 |
| `pnpm format` | 代码格式化 |

## 打包桌面应用

```bash
# macOS
pnpm pack:mac

# Windows
pnpm pack:win

# Linux
pnpm pack:linux
```

打包产物输出在 `apps/desktop/release/` 目录。
