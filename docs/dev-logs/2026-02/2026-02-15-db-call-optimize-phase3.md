# 2026-02-15 数据库调用量优化（第三阶段 — 低风险前端优化）

## 背景

CloudBase 周期 2/10~3/9 的 20 万次调用额度已在 5 天内用完，正在按量计费。日均消耗 ~4 万次。

数据分析（2/14）显示日 DB 操作量约 26,000 次，主要来源：
- TT_score_batch: ~15,900 次（占 61%）
- TT_home_data: ~2,650 次
- TT_settings_get: ~2,112 次
- TT_class_list: ~1,340 次

本轮只做低风险的前端改动，不改云函数，不部署后端。

## 完成内容

### 1. Home.tsx 操作后不拉 settingsGet（预计 -2,100 次 DB/日）

`refresh()` 拆分为 `refreshData()`（只拉 homeData）+ `refreshSettings()`（拉 settingsGet）。

- `useEffect([classId])`：首次加载两个独立并行调用（不用 Promise.all，避免 settingsGet 失败连带清空学生数据）
- `handleScore`：已经直接调 `homeData`，不涉及 refresh
- `handleRevoke`：改调 `refreshData()`
- `handleAssignBeast`：改调 `refreshData()`

积分规则在加分/撤回/分配幻兽时不会变化，无需每次重新获取。

### 2. TTL 调优 + record_list 缓存（预计 -1,500 次 DB/日）

- `TT_home_data` TTL: 30s → 60s（写操作后有 INVALIDATION_MAP 兜底）
- 新增 `TT_record_list: 30s`（之前未缓存且不走 cachedCall，改为走 cachedCall + 30s TTL，score_batch/score_revoke 后自动失效）

### 3. Settings.tsx 按场景精简 refresh（预计 -400 次 DB/日）

新增 `refreshStudentList()` 函数，只拉 `studentList`。以下场景改为调 `refreshStudentList()` 代替完整的 `refresh()`（原来会同时拉 settingsGet + studentList + shopList）：

- 添加单个学生
- 批量文本导入学生
- Excel 导入学生
- 删除学生
- 批量分配幻兽

保留完整 `refresh()` 的场景：班级删除后切换到新班级（需要加载新班级的全部数据）。

保留批量导入前的 `studentList` 容量检查查询（防护性查询，避免多标签页并发导入越限）。

## 预计总收益

| 优化项 | 减少 DB 操作/日 |
|--------|:-:|
| Home 操作后不拉 settingsGet | -2,100 |
| TTL 调优 + record_list 缓存 | -1,500 |
| Settings 精简 refresh | -400 |
| **合计** | **-4,000** |

日均 DB 操作 ~26,000 → ~22,000，减少 ~15%。

## 相关文件

| 文件 | 改动 |
|------|------|
| `app/src/routes/Home.tsx` | refresh 拆分为 refreshData + refreshSettings |
| `app/src/services/cloudApi.ts` | homeData TTL 30→60s、新增 record_list 30s |
| `app/src/routes/Settings.tsx` | 新增 refreshStudentList（含错误处理）、学生操作后精简调用 |

## Code Review 后修复

1. **recordList 缓存失效**：`recordList` 方法直接用 `callCloudFunction` 而非 `cachedCall`，导致 TTL 配置无效。改为 `cachedCall`
2. **refreshStudentList 无错误处理**：加了 try-catch，网络故障时不会产生未处理的 Promise rejection
3. **Promise.all 错误连锁**：settingsGet 失败会清空学生数据。改为两个独立调用，互不影响
