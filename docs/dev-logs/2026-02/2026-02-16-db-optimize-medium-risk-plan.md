# 2026-02-16 数据库调用量优化 — 中风险方案（待实施）

## 背景

CloudBase 个人版 20 万次/月调用额度已超额，按量计费中。寒假期间日均 ~4 万次（少量测试用户），开学后预计增长数倍。已升级标准版（199 元/月，800 万次额度）或继续按量计费需要进一步优化。

### 已完成的优化

| 阶段 | 内容 | 减少 DB/日 | 日期 |
|------|------|:-:|------|
| 第一批 | verifyToken OR 合并（24 个云函数） + class_get 复用 | ~4,500 | 2026-02-11 |
| 第二阶段 | 前端 useEffect 去重 + TTL 缓存 + TT_home_data 合并函数 + 查询双路径 | ~6,000 | 2026-02-12 |
| 第三阶段 | Home refresh 拆分 + TTL 调优 + Settings 精简 refresh | ~4,000 | 2026-02-15 |
| **已完成合计** | | **~14,500** | |

### 当前资源消耗分布（2/14 数据）

- 数据库请求：360,140 次（80.54%）← **大头**
- 云函数请求：84,671 次（18.94%）
- 日均 DB 操作：~26,000 次

---

## 待实施方案

### 方案 A：TT_score_batch 返回 recordIds

**状态**：待实施
**风险**：中（改云函数，需部署）
**预计减少**：-2,400 次 DB/日

**问题**：`TT_score_batch` 只返回 `updatedStudentIds`，不返回 `recordIds`。前端 Home.tsx 每次加分后走兜底逻辑调 `recordList` 查最新记录（3-4 次额外 DB 操作/次）。

**改动**：
- `app/cloudfunctions/TT_score_batch/index.js`：循环中收集 `add()` 返回的 id，返回 `{ updatedStudentIds, recordIds }`
- 前端无需改动（Home.tsx 已有 `returnedId` 判断逻辑）

**关键代码**：
```javascript
// 现在（第136-151行）：
await db.collection("TT_score_records").add({ data: { ... } })
updatedIds.push(student._id)

// 改为（用 generateId + doc().set() 规避 .add() 返回值 bug）：
const recordId = generateId()  // crypto.randomBytes(16).toString("hex")
await db.collection("TT_score_records").doc(recordId).set({ data: { ... } })
recordIds.push(recordId)
updatedIds.push(student._id)

return { updatedStudentIds: updatedIds, recordIds }
```

**注意事项**：
- 不能用 `.add()` 存返回值（tcb-admin-node v1.x bug，详见 bug-checklist.md 1.4）
- 改用自行生成 ID + `doc(id).set()`，写入可靠且能获得 ID

**验证**：
- 部署后测试加分 → 撤回按钮应立即可用（不再有延迟查询）
- 检查云函数返回值中 recordIds 数组不为空

---

### 方案 B：TT_home_data 内联 settings

**状态**：待实施
**风险**：中（改云函数 + 前端联动）
**预计减少**：-1,770 次 DB/日

**问题**：首页加载 = `homeData`(3次DB) + `settingsGet`(3次DB) = 6次DB。`settingsGet` 的 verifyToken + 查班级与 `homeData` 完全重复。

**改动**：

1. `app/cloudfunctions/TT_home_data/index.js`：在 students 查询之后，额外查 `TT_settings`
```javascript
// 在 return 之前新增：
const settingsId = `settings-${classId}`
const settingsResult = await db.collection("TT_settings").doc(settingsId).get()
const settingsRow = settingsResult.data?.[0]
const settings = settingsRow ? settingsRow.data || settingsRow : null

return {
  classSummary: { ... },
  students: [...],
  settings,  // 新增
}
```

2. `app/src/types/api.ts`：TTHomeDataResponse 新增 `settings` 字段
3. `app/src/routes/Home.tsx`：`refreshData` 从 homeData 响应中提取 settings，删除 `refreshSettings` 函数
4. `app/src/components/AppShell.tsx`：保持不变（仍独立调 settingsGet 获取主题色，有 2min 缓存）

**DB 操作变化**：homeData 从 3 次变成 4 次（多 1 次 settings 查询），但省掉独立的 settingsGet（3 次），净省 2 次/调用。

**验证**：
- 首页加载后积分规则应正确显示
- 设置页修改规则 → 回到首页 → 规则应更新（INVALIDATION_MAP 中 TT_settings_save 需要同时失效 TT_home_data）
- AppShell 主题色仍正常加载

**INVALIDATION_MAP 检查**：
- `TT_settings_save` 目前只失效 `["TT_settings_get"]`
- 内联后需要新增失效 `"TT_home_data"`，否则改设置后首页缓存里是旧规则

---

## 实施后预计总收益

| 优化项 | 减少 DB 操作/日 |
|--------|:-:|
| 已完成的三阶段 | -14,500 |
| A. score_batch 返回 recordIds | -2,400 |
| B. homeData 内联 settings | -1,770 |
| **合计** | **-18,670** |

---

## 实施检查清单

- [x] 方案 A：修改 TT_score_batch 返回 recordIds（用 generateId + doc().set() 规避 .add() bug）
- [x] 方案 A：本地测试（npm test）— 37/37 通过
- [x] 方案 A：部署 TT_score_batch 云函数
- [x] 方案 A：线上验证加分+撤回流程 — Playwright 自动化验证通过
- [x] 方案 B：修改 TT_home_data 内联 settings 查询
- [x] 方案 B：修改前端 Home.tsx 从 homeData 提取 settings（删除 refreshSettings）
- [x] 方案 B：更新 TTHomeDataResponse 类型
- [x] 方案 B：INVALIDATION_MAP 中 TT_settings_save 新增失效 TT_home_data
- [x] 方案 B：本地测试（npm test + npm run build）— 通过
- [x] 方案 B：部署 TT_home_data 云函数 + 前端
- [x] 方案 B：线上验证首页规则显示 — Playwright 验证通过（14条规则+33名学生）
- [x] 更新 CHANGELOG（v1.6.7）
