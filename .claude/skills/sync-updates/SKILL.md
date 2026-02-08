---
name: sync-updates
description: 将 docs/CHANGELOG.md 中的版本变更同步到前端更新日志页面 app/src/data/updates.ts。当用户提到"同步更新日志"、"更新 updates"、"添加更新记录"、"同步变更到前端"、或在修改 CHANGELOG.md 后需要更新前端展示时使用。
---

# 同步更新日志

将 `docs/CHANGELOG.md` 的版本记录转换为 `app/src/data/updates.ts` 中用户可见的更新条目。

## 工作流程

### 1. 读取源文件

读取两个文件：
- `docs/CHANGELOG.md` — 完整的技术变更日志
- `app/src/data/updates.ts` — 当前前端展示的更新条目

### 2. 差异比对

比较两个文件，找出 CHANGELOG 中有但 updates.ts 中没有的版本号。以 `version` 字段为匹配键。

### 3. 生成新条目

对每个缺失版本，按以下规则生成 `UpdateEntry`：

```typescript
export type UpdateTag = "功能" | "体验" | "修复" | "优化" | "内容" | "公告"

export interface UpdateEntry {
  id: string          // kebab-case 英文短标识，如 "copy-class-settings"
  date: string        // "YYYY-MM-DD" 格式
  title: string       // 面向用户的简短标题，不含技术术语
  summary: string     // 一句话描述，口语化
  highlights?: string[] // 2-4 条要点，面向老师而非开发者
  tags: UpdateTag[]   // 从 CHANGELOG 的 section 映射
  version?: string    // 如 "v1.1.2"
}
```

**CHANGELOG section → tag 映射：**

| CHANGELOG section | UpdateTag |
|---|---|
| 新增 / 功能 | "功能" |
| 变更 | "优化" |
| 修复 | "修复" |
| 优化 | "体验" |
| 重构 | "优化" |

一个版本如果同时有"新增"和"修复"，则 tags 为 `["功能", "修复"]`。

**写作风格：**
- title 和 summary 面向老师用户，不出现代码术语（云函数、字段名、组件名）
- highlights 每条简洁，描述用户可感知的变化
- 参考 updates.ts 中已有条目的语气和长度

### 4. 插入到 updates 数组

将新条目插入到 `app/src/data/updates.ts` 的 `updates` 数组**开头**（最新版本在前）。保持现有条目不变。

### 5. 确认

修改完成后告知用户新增了哪些版本的更新条目。
