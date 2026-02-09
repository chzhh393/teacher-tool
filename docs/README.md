# 幻兽学院 - 文档中心

> 游戏化课堂积分管理系统：学生通过课堂表现获取积分，培养专属幻兽，兑换奖励。

---

## 快速导航

| 我想了解...               | 去哪里看                                                      |
| ------------------------- | ------------------------------------------------------------- |
| 产品功能与设计思路         | [PRD.md](./PRD.md)                                            |
| 系统整体架构               | [architecture/system-overview.md](./architecture/system-overview.md) |
| 认证与登录模块             | [modules/auth/README.md](./modules/auth/README.md)            |
| 班级管理模块               | [modules/class-management/README.md](./modules/class-management/README.md) |
| 积分系统模块               | [modules/score-system/README.md](./modules/score-system/README.md) |
| 幻兽养成模块               | [modules/beast-system/README.md](./modules/beast-system/README.md) |
| 积分商店模块               | [modules/store/README.md](./modules/store/README.md)          |
| 荣誉榜模块                 | [modules/honors/README.md](./modules/honors/README.md)        |
| 管理后台模块               | [modules/admin/README.md](./modules/admin/README.md)          |
| 进度分享模块               | [modules/share/README.md](./modules/share/README.md)          |
| 开发环境搭建               | [guides/development/getting-started.md](./guides/development/getting-started.md) |
| Bug 检查清单（编码后必查）  | [guides/development/bug-checklist.md](./guides/development/bug-checklist.md)     |
| 子账号系统设计方案           | [guides/development/sub-account-design.md](./guides/development/sub-account-design.md) |
| 部署上线流程               | [guides/deployment/deployment.md](./guides/deployment/deployment.md)  |
| 云开发（CloudBase）集成    | [guides/integration/cloudbase-guide.md](./guides/integration/cloudbase-guide.md) |
| 数据库结构                 | [cloudbase-schema.md](./cloudbase-schema.md)                  |
| 幻兽图片生成方案           | [beast-image-generation.md](./beast-image-generation.md)      |
| 开发日志                   | [dev-logs/](./dev-logs/)                                      |
| 已知问题与待办             | [issues/](./issues/)                                          |
| 版本变更记录               | [CHANGELOG.md](./CHANGELOG.md)                                |

---

## 目录结构

```
docs/
├── README.md                          # 本文件 - 文档导航中心
├── CHANGELOG.md                       # 版本变更记录
├── PRD.md                             # 产品需求文档
├── cloudbase-schema.md                # 云开发数据库表结构
├── beast-image-generation.md          # 幻兽图片生成技术方案
├── marketing/                         # 推广与运营素材
├── architecture/                      # 架构设计
│   └── system-overview.md             #   系统架构总览
├── modules/                           # 功能模块文档
│   ├── auth/README.md                 #   认证与登录
│   ├── class-management/README.md     #   班级管理
│   ├── score-system/README.md         #   积分系统
│   ├── beast-system/README.md         #   幻兽养成
│   ├── store/README.md                #   积分商店
│   ├── honors/README.md              #   荣誉榜
│   ├── admin/README.md               #   管理后台
│   └── share/README.md               #   进度分享
├── guides/                            # 操作指南
│   ├── development/getting-started.md #   开发环境搭建
│   ├── deployment/deployment.md       #   部署上线指南
│   └── integration/cloudbase-guide.md #   云开发集成指南
├── dev-logs/                          # 开发日志
│   ├── TEMPLATE.md                    #   日志模板
│   └── 2026-02/                       #   按月归档
└── issues/                            # 问题追踪
    ├── TEMPLATE.md                    #   问题模板
    ├── pending/                       #   待解决
    └── resolved/                      #   已解决
```

---

## 分区说明

| 分区           | 用途                                         |
| -------------- | -------------------------------------------- |
| 根目录文件     | 全局性文档：PRD、数据库结构、变更记录等        |
| `architecture/`| 系统级架构设计，包含整体技术选型与模块关系     |
| `modules/`     | 按功能模块拆分，每个子目录对应一个业务模块     |
| `guides/`      | 面向操作的指南：开发、部署、第三方集成         |
| `marketing/`   | 推广文案与运营素材，非技术内容                 |
| `dev-logs/`    | 按月归档的开发日志，记录重要决策与进展         |
| `issues/`      | 问题追踪，分为 `pending/` 和 `resolved/`      |

---

## 命名规范

- **目录名**：使用小写英文 + 短横线（kebab-case），如 `beast-system`、`class-management`
- **文件名**：使用小写英文 + 短横线，如 `getting-started.md`、`system-overview.md`
- **模块入口**：每个模块目录下以 `README.md` 作为入口文件
- **开发日志**：按 `YYYY-MM-DD-标题.md` 格式命名，归入对应月份目录
- **问题记录**：按 `NNNN-简短描述.md` 格式编号，放入 `pending/` 或 `resolved/`
- **模板文件**：统一命名为 `TEMPLATE.md`，大写以示区分

---

## 角色阅读指南

### 新加入的开发者

1. [PRD.md](./PRD.md) -- 了解产品全貌
2. [architecture/system-overview.md](./architecture/system-overview.md) -- 理解技术架构
3. [guides/development/getting-started.md](./guides/development/getting-started.md) -- 搭建本地环境
4. [cloudbase-schema.md](./cloudbase-schema.md) -- 熟悉数据模型
5. 按分配的任务阅读对应 `modules/` 下的模块文档

### 部署运维人员

1. [guides/deployment/deployment.md](./guides/deployment/deployment.md) -- 部署流程与环境配置
2. [guides/integration/cloudbase-guide.md](./guides/integration/cloudbase-guide.md) -- 云开发平台操作
3. [cloudbase-schema.md](./cloudbase-schema.md) -- 数据库结构参考
4. [issues/](./issues/) -- 关注已知问题

### 产品经理

1. [PRD.md](./PRD.md) -- 产品需求文档（核心）
2. [CHANGELOG.md](./CHANGELOG.md) -- 跟踪版本迭代
3. [modules/](./modules/) -- 按模块了解功能细节
4. [dev-logs/](./dev-logs/) -- 了解开发进展与技术决策
