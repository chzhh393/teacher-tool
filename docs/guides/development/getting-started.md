# 开发入门指南

## 环境要求

- Node.js 18+
- npm

## 快速开始

```bash
# 克隆项目后进入应用目录
cd app

# 安装依赖
npm install

# 启动开发服务器
npm run dev
# → http://localhost:5173

# 构建生产版本
npm run build
# → 输出到 app/dist/
```

## 项目结构概览

```
app/
├── src/
│   ├── components/     # 通用组件
│   ├── config/         # 配置文件（环境变量等）
│   ├── data/           # 静态数据（幻兽定义等）
│   ├── lib/            # CloudBase SDK 封装
│   ├── routes/         # 页面路由组件
│   │   └── admin/      # 管理页面
│   ├── services/       # API 服务层
│   ├── store/          # Zustand 状态管理
│   ├── types/          # TypeScript 类型定义
│   └── utils/          # 工具函数
├── cloudfunctions/     # CloudBase 云函数
├── public/             # 静态资源
└── dist/               # 构建输出
```

详细架构说明请参考 [系统架构概览](../../architecture/system-overview.md)。

## 技术栈与约定

| 类别 | 技术选型 |
|------|---------|
| 语言 | TypeScript（strict 模式） |
| 框架 | React 18 + Vite |
| 样式 | Tailwind CSS |
| 状态管理 | Zustand |
| 路由 | React Router（HashRouter） |
| 后端 | 腾讯云 CloudBase（云函数 + 数据库 + 静态托管） |

## 注意事项

- **ActivationAdmin 页面**（激活码管理）仅在开发模式下可访问，生产构建中不包含该路由入口。
- 所有云函数调用通过 `src/services/cloudApi.ts` 统一管理。
- 提交代码前请确保 `npm run build` 能正常通过。
