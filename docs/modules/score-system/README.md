# 积分系统

> 支持自定义评分规则、单人/批量评分、撤销操作，维护双积分体系。

## 功能概述

### 评分规则

- 教师可自定义评分规则，每条规则包含：
  - **名称** —— 如「回答正确」「作业优秀」
  - **分值** —— 正数为加分，负数为扣分
  - **图标** —— 可选的 emoji 图标
  - **拼音快捷键** —— 用于快速搜索定位规则

### 评分操作

- **单人评分** —— 选中一个学生，选择规则进行评分
- **批量评分** —— 选中多个学生，统一应用同一规则
- **撤销** —— 支持撤销最近一次评分操作（仅限最后一条）

### 双积分体系

| 积分类型 | 字段名 | 用途 | 规则 |
|----------|--------|------|------|
| 累计积分 | `totalScore` | 用于等级提升和幻兽进化 | 只增不减（扣分不影响） |
| 可用积分 | `availableScore` | 用于小卖部兑换消费 | 加分时增加，扣分时减少，兑换时消费 |

> 设计意图：`totalScore` 保证学生的成长进度不会倒退，`availableScore` 作为可消费的"货币"激励兑换行为。

## 关键文件

| 文件 | 说明 |
|------|------|
| `app/src/routes/Home.tsx` | 主页，评分操作的核心界面 |
| `app/src/components/ScoreModal.tsx` | 评分弹窗，选择规则并确认 |
| `app/src/components/RevokeBar.tsx` | 撤销操作栏，展示最近操作并提供撤销按钮 |
| `app/src/services/cloudApi.ts` | API 封装 |

## 云函数 / API

| 云函数 | API 方法 | 说明 |
|--------|----------|------|
| `TT_score_batch` | `scoreBatch` | 批量评分（支持单人和多人） |
| `TT_score_revoke` | `scoreRevoke` | 撤销最近一次评分 |
| `TT_record_list` | `recordList` | 获取积分记录列表 |
| `TT_record_export` | `recordExport` | 导出积分记录（CSV） |

## 数据集合

### TT_records

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | string | 记录 ID |
| `classId` | string | 班级 ID |
| `studentIds` | array | 相关学生 ID 列表 |
| `ruleName` | string | 评分规则名称 |
| `score` | number | 分值（正数加分，负数扣分） |
| `type` | string | 操作类型：score / revoke |
| `createdAt` | number | 操作时间戳 |

## 评分流程

```
1. 教师在主页选择学生（单选或多选）
2. 点击评分按钮，弹出 ScoreModal
3. 选择评分规则（支持拼音搜索）
4. 确认后调用 TT_score_batch 云函数
5. 云函数更新学生的 totalScore 和 availableScore
6. 同时写入 TT_records 记录
7. 前端刷新学生列表，RevokeBar 显示最近操作
```

## 注意事项

- 撤销操作仅支持最近一次评分，不支持多步撤销
- 批量评分时，所有选中学生获得相同的分值
- `totalScore` 不会因扣分而减少，始终保持历史最高累积值
- 积分记录可在 [记录页面](../honors/README.md) 查看和导出
