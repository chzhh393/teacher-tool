# 进度分享

> 老师生成分享链接发到微信群，家长和学生点开即可查看幻兽养成实时进度，无需登录。

## 功能概述

### 分享模式

| 模式 | 适用场景 | 展示内容 |
|------|---------|---------|
| 班级概览 | 发到家长群，全班可见 | 全班学生幻兽卡片网格，按排名排序 |
| 学生详情 | 单独发给某个家长 | 单个学生幻兽大图、进度、收集记录 |

### 交互流程

```
老师端                           家长端
┌─────────┐                    ┌─────────┐
│ Home 页  │                    │ 微信群   │
│点击分享家长│                    │ 点击链接 │
│    ↓     │                    │    ↓     │
│ 选择模式 │  ──复制链接──→     │ 打开网页 │
│ 班级/学生│                    │ 查看进度 │
│    ↓     │                    │ (无需登录)│
│ 生成链接 │                    └─────────┘
│ 复制分享 │
└─────────┘
```

### 分享页面设计

**班级概览**：
- 简洁 header："幻兽学院 · 班级名"
- 2列卡片网格：排名奖牌、学生名、等级、幻兽名·形态、幻兽图片、进度条、徽章数
- 前3名金/银/铜边框高亮（🥇🥈🥉）

**学生详情**：
- 幻兽当前形态大图
- 学生名 + 幻兽名 + 等级 + 形态名
- 进度条 + "距下一级还需 X 成长值"（满级显示"已收集完成 🏆"）
- 三格数据：徽章、累计积分、可用积分
- 已收集幻兽（究极形态缩略图网格）
- 最近 10 条积分记录（规则名、时间、加减分值）

**特殊状态处理**：
- 未领养幻兽：显示蛋占位图 + "等待领养"
- MAX 级已收集：显示"已收集完成"标记

**设计原则**：
- 移动端优先（微信内置浏览器打开）
- 纯只读展示，不支持互动操作
- 领养/更换幻兽由老师在管理后台远程操作

## 关键文件

| 文件 | 说明 |
|------|------|
| `app/cloudfunctions/TT_share_create/index.js` | 创建/管理分享令牌云函数 |
| `app/cloudfunctions/TT_share_view/index.js` | 公开查看分享数据云函数 |
| `app/src/routes/ShareView.tsx` | 分享公开页面（班级概览 + 学生详情） |
| `app/src/components/ShareModal.tsx` | 老师端分享弹窗 |

## 云函数 / API

### `TT_share_create`（需认证）

通过 `action` 参数区分操作。

| action | 请求参数 | 返回 | 说明 |
|--------|---------|------|------|
| `create` | `{ type, classId, studentId? }` | `{ shareToken, shareUrl, expiresAt }` | 生成分享令牌 |
| `list` | `{}` | `{ shares: [...] }` | 列出当前用户所有分享 |
| `revoke` | `{ shareToken }` | `{ ok }` | 撤销分享令牌 |

**逻辑说明**：
- `create`：生成 32 位随机令牌，有效期 30 天。同一班级/学生已有有效令牌时直接返回
- `list`：按创建时间倒序
- `revoke`：验证归属后设置 `revoked: true`

### `TT_share_view`（公开，不需认证）

| 请求参数 | 返回 | 说明 |
|---------|------|------|
| `{ shareToken }` | 班级数据或学生数据 | 公开接口，通过令牌查找数据 |

**校验逻辑**：
- 令牌不存在 → `{ error: "链接无效" }`
- 已撤销 → `{ error: "链接已失效" }`
- 已过期 → `{ error: "链接已过期" }`

**班级模式返回**：
```json
{
  "type": "class",
  "className": "三年三班",
  "systemName": "成长值",
  "students": [
    {
      "name": "张三",
      "beastId": "unicorn",
      "beastName": "独角兽",
      "level": 5,
      "totalScore": 42,
      "earnedScore": 120,
      "badges": 1,
      "progress": 65,
      "collectedBeasts": ["unicorn"]
    }
  ]
}
```

**学生模式返回**：
```json
{
  "type": "student",
  "className": "三年三班",
  "systemName": "成长值",
  "student": {
    "name": "张三",
    "beastId": "unicorn",
    "beastName": "独角兽",
    "level": 5,
    "totalScore": 42,
    "earnedScore": 120,
    "availableScore": 80,
    "badges": 1,
    "progress": 65,
    "collectedBeasts": ["unicorn"]
  },
  "recentRecords": [
    { "ruleName": "课堂表现", "score": 5, "type": "add", "createdAt": "2026-02-09 10:30:00" }
  ],
  "levelThresholds": [0, 5, 12, 22, 35, 50, 70, 95, 125, 160]
}
```

## 数据结构

### `TT_shares` 集合

```json
{
  "_id": "自动生成",
  "token": "a1b2c3d4e5f6...",
  "type": "class",
  "classId": "class-5-1",
  "studentId": null,
  "className": "五年级1班",
  "studentName": null,
  "userId": "user-xxx",
  "createdAt": "2026-02-09T10:00:00.000Z",
  "expiresAt": "2026-03-11T10:00:00.000Z",
  "revoked": false
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `token` | string | 32 位随机 hex 令牌 |
| `type` | string | `"class"` 或 `"student"` |
| `classId` | string | 班级 ID |
| `studentId` | string\|null | 学生 ID（仅 student 类型） |
| `className` | string | 班级名（冗余，展示用） |
| `studentName` | string\|null | 学生名（冗余，展示用） |
| `userId` | string | 创建者用户 ID |
| `createdAt` | string | 创建时间 |
| `expiresAt` | string | 过期时间（默认 30 天） |
| `revoked` | boolean | 是否已撤销 |

## 安全机制

- **令牌随机性**：`crypto.randomBytes(16).toString('hex')` 生成 32 位随机令牌，不暴露内部 ID
- **有效期**：默认 30 天自动过期
- **可撤销**：老师可随时在管理弹窗中撤销分享
- **最小数据**：公开页面只展示展示必要信息（姓名、幻兽、积分），不返回内部 ID 或敏感数据
- **防重复**：同一班级/学生已有有效令牌时复用，避免生成大量令牌

## 前端路由

分享页面使用公开路由 `/s/:token`，不在 `RequireAuth` 保护范围内：

```tsx
// App.tsx
<Route path="/s/:token" element={<ShareView />} />
```

页面通过 `signInAnonymously()` 确保 CloudBase 匿名登录后调用云函数获取数据。

## 注意事项

- 分享页面不使用 `AppShell`，有独立的简洁布局
- 分享页面不依赖 `useAuthStore` 或 `useClassStore`
- 幻兽图片渲染复用 `beasts` 数据和 `getEvolutionStage` 工具函数
- HashRouter 在微信内置浏览器中正常工作
- 班级模式学生按徽章数降序 → 累计积分降序排序
