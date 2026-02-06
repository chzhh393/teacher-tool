# 系统架构概览

> 幻兽学院 —— 游戏化课堂积分管理系统的整体技术架构说明。

## 技术栈

| 层级 | 技术 | 版本/说明 |
|------|------|-----------|
| 前端框架 | React | 19 |
| 构建工具 | Vite | 7 |
| 类型系统 | TypeScript | 严格模式 |
| 样式方案 | Tailwind CSS | 原子化 CSS |
| 状态管理 | Zustand | 轻量级 store |
| 动画引擎 | Framer Motion | 声明式动画 |
| 后端服务 | 腾讯云 CloudBase | tcb-admin-node |
| 数据库 | CloudBase NoSQL | 文档型数据库 |

## 架构总览

```
┌──────────────┐     ┌───────────────────┐     ┌──────────────────┐     ┌────────────────┐
│              │     │                   │     │                  │     │                │
│   Browser    │────▶│  CloudBase JS SDK │────▶│  Cloud Functions │────▶│ NoSQL Database │
│  (React SPA) │     │                   │     │  (23 个云函数)    │     │  (7 个集合)     │
│              │◀────│                   │◀────│                  │◀────│                │
└──────────────┘     └───────────────────┘     └──────────────────┘     └────────────────┘
```

## 环境配置

| 环境 | 用途 | 环境 ID |
|------|------|---------|
| 静态托管 | 前端 SPA 部署 | `cloud1-3g9mi825a3a27f25` |
| 云函数 | 后端逻辑执行 | `cloudbase-9gsl8xh8e2560768` |

## 前端目录结构

```
app/src/
├── routes/                  # 9 个页面路由
│   ├── Auth.tsx             # 登录/注册
│   ├── Activate.tsx         # 激活码激活
│   ├── Home.tsx             # 主页（评分操作）
│   ├── Honors.tsx           # 荣誉榜
│   ├── Records.tsx          # 积分记录
│   ├── Settings.tsx         # 设置（班级/学生/规则管理）
│   ├── Store.tsx            # 小卖部
│   └── admin/
│       ├── ActivationAdmin.tsx  # 激活码管理
│       └── BeastAdmin.tsx       # 幻兽管理
├── components/              # 8 个公共组件
│   ├── ScoreModal.tsx       # 评分弹窗
│   ├── RevokeBar.tsx        # 撤销操作栏
│   ├── EvolutionStage.tsx   # 进化阶段展示
│   ├── BeastPickerModal.tsx # 幻兽选择弹窗
│   └── PetSelection.tsx     # 宠物选择组件
├── services/
│   └── cloudApi.ts          # 23 个云 API 封装
├── stores/                  # 3 个 Zustand store
│   ├── authStore.ts         # 认证状态
│   ├── classStore.ts        # 班级/学生状态
│   └── beastStore.ts        # 幻兽状态
├── types/                   # TypeScript 类型定义
├── config/
│   └── theme.ts             # 6 套主题配置
└── data/
    └── beasts.ts            # 30 只幻兽数据
```

## 后端目录结构

```
app/cloudfunctions/          # 23 个云函数
├── TT_auth_*                # 认证相关（5 个）
├── TT_class_*               # 班级管理（4 个）
├── TT_student_*             # 学生管理（3 个）
├── TT_score_*               # 评分相关（2 个）
├── TT_record_*              # 记录相关（2 个）
├── TT_shop_*                # 商店相关（2 个）
├── TT_redeem_*              # 兑换相关（1 个）
├── TT_honors_*              # 荣誉榜（1 个）
├── TT_activation_admin      # 激活码管理（1 个）
└── TT_settings_*            # 设置相关（2 个）
```

## 模块文档索引

| 模块 | 文档位置 |
|------|----------|
| 认证系统 | [auth](../modules/auth/README.md) |
| 班级管理 | [class-management](../modules/class-management/README.md) |
| 积分系统 | [score-system](../modules/score-system/README.md) |
| 幻兽系统 | [beast-system](../modules/beast-system/README.md) |
| 小卖部 | [store](../modules/store/README.md) |
| 荣誉榜 | [honors](../modules/honors/README.md) |
| 管理后台 | [admin](../modules/admin/README.md) |

## 数据库集合一览

| 集合名 | 用途 | 关联模块 |
|--------|------|----------|
| `TT_users` | 用户账户 | 认证 |
| `TT_sessions` | 登录会话 | 认证 |
| `TT_activation_codes` | 激活码 | 认证 / 管理后台 |
| `TT_classes` | 班级信息 | 班级管理 |
| `TT_students` | 学生信息 | 班级管理 |
| `TT_records` | 积分记录 | 积分系统 |
| `TT_redemptions` | 兑换记录 | 小卖部 |
