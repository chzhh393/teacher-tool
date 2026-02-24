# 2026-02-11 数据库请求数优化

## 背景

CloudBase 个人版环境 `cloud1-3g9mi825a3a27f25` 资源使用情况：

| 指标 | 数值 | 占比 |
|------|------|------|
| 数据库请求数 | 110,535 次 | **81.64%** |
| 云函数调用次数 | 4.52 万次 | 18% |
| 已使用总额度 | 13.54 万次 | 总额度 20 万次 |

数据库请求是最大开销来源。v1.5.9 已完成前端层面优化（去重、缓存、signInAnonymously 单例化），本轮聚焦**云函数内部的数据库操作次数**和**前端剩余的重复调用**。

## 已完成（第一批）

### 1. verifyToken 合并为单次 OR 查询

**涉及 24 个云函数**。每个云函数内的 verifyToken / findSession 原来做 2 次 TT_sessions 查询（先查根级别 `{ token }`，没找到再查 `{ "data.token": token }`），改为 1 次 `_.or()` 查询。

变更前：
```javascript
let result = await db.collection("TT_sessions").where({ token }).limit(1).get()
let session = (result.data || [])[0]
if (!session) {
  result = await db.collection("TT_sessions").where({ "data.token": token }).limit(1).get()
  session = (result.data || [])[0]
}
```

变更后：
```javascript
const _ = db.command
const result = await db
  .collection("TT_sessions")
  .where(_.or([{ token }, { "data.token": token }]))
  .limit(1)
  .get()
const session = (result.data || [])[0]
```

**收益**：每次云函数调用减少 1 次数据库请求。按日均 ~4500 次云函数调用估算，**每天减少 ~4500 次数据库请求**。

### 2. TT_class_get 复用班级文档

原来 `getClassId` 仅返回 classId，之后 `exports.main` 再次 `doc(classId).get()` 读取班级名称，等于同一个班级文档读了 2 次。改为 `getClassInfo` 返回 `{ id, raw }`，直接使用 `raw.name`。

**收益**：每次 classGet 调用减少 1 次数据库请求。

### 涉及文件

TT_auth_verify, TT_class_delete, TT_class_get, TT_class_list, TT_class_upsert, TT_group_manage, TT_honors_list, TT_record_export, TT_record_list, TT_record_summary, TT_redeem_list, TT_score_batch, TT_score_revoke, TT_settings_get, TT_settings_save, TT_share_create, TT_shop_list, TT_shop_redeem, TT_shop_save, TT_student_delete, TT_student_list, TT_student_upsert, TT_subaccount_manage, TT_wechat_callback, TT_wechat_state

## 后续阶段

### 阶段 1：前端 useEffect 去重 + 缓存 TTL 调优 ✅ 已完成（2026-02-12）

**风险**：低（仅前端改动，无需部署云函数）
**详情**：见 [2026-02-12 第二阶段日志](2026-02-12-settings-overwrite-fix.md) 及 v1.5.9 变更日志

#### 1.1 Home.tsx 双 useEffect 合并

`app/src/routes/Home.tsx` 行 109-131 有两个 useEffect：
- `useEffect([], [])` 行 109：挂载时调用 `refresh(classId)`
- `useEffect([], [classId])` 行 125：classId 从 localStorage 同步，初始也触发

初始化时两个都执行，导致 `refresh` 被调 2 次 = 重复调用 classGet + studentList + settingsGet。

**改动**：合并为单一 `useEffect([classId])`，开头加 `if (!classId)` 防护空值。

**收益**：首页初始化减少 ~3 次云函数调用（~9 次数据库操作）。

#### 1.2 AppShell.tsx classId 依赖拆分

`app/src/components/AppShell.tsx` 行 28-53 的 useEffect 依赖 `[classId, setClass, token]`。首次加载时 `setClass` 触发 classId 变化，又重新执行整个 useEffect（重复调 classList + settingsGet）。

**改动**：拆分为两个独立 useEffect：
- `useEffect([token])`：加载 classList，设置默认 classId
- `useEffect([classId])`：classId 变化时只调 settingsGet 获取主题色

**收益**：减少 1 次不必要的 classList 调用。

#### 1.3 缓存 TTL 调优

`app/src/services/cloudApi.ts` 行 73-83。

**安全性论证**：当前 INVALIDATION_MAP 覆盖了所有 7 类写操作入口（settings_save, shop_save, student_upsert/delete, score_batch/revoke, shop_redeem, class_upsert/delete, group_manage），前端没有其他写入路径。写操作执行时缓存立即失效，因此延长 TTL 不会导致写后读到旧数据。TTL 仅影响"无写操作时的自然过期"场景（如用户多标签页操作、多设备同步），这些场景容忍分钟级延迟。

| 函数 | 当前 TTL | 调优后 | 理由 |
|------|---------|-------|------|
| TT_class_list | 300s | 300s | 不变 |
| TT_settings_get | 60s | 120s | 设置不常改 |
| TT_student_list | 15s | 30s | 加分后主动失效 |
| TT_shop_list | 60s | 120s | 商品不常变 |
| TT_honors_list | 30s | 60s | 加分后主动失效 |
| TT_class_get | 30s | 60s | 加分后主动失效 |
| TT_redeem_list | 30s | 60s | 兑换后主动失效 |
| TT_record_summary | 30s | 60s | 加分后主动失效 |

**收益**：减少 ~15-20% 的重复请求。

---

### ~~阶段 2：TT_score_batch 并行化~~ **取消**

**取消原因**：经评估，Promise.all 全量并发存在部分写入不一致风险（第 N 个失败时前 N-1 个已写入）。班级规模上限 100 人，串行写入耗时可控（几秒），不值得引入复杂性。保持当前串行写法。

---

### 阶段 2（原阶段 3）：新建 TT_home_data 合并函数 ✅ 已完成（2026-02-12）

**风险**：中（新增云函数，需部署）
**详情**：见 [2026-02-11 第二阶段日志](2026-02-11-db-request-optimize.md) 及 v1.5.9 变更日志

Home 首屏并发调 `TT_class_get` + `TT_student_list`，两者各自执行 verifyToken + getClassId/验证班级 + 查学生，大量操作重复。

**改动**：合并为 `TT_home_data`，返回 `{ classSummary, students }`。settingsGet 保持独立调用（缓存失效链路更简单）。

| 操作 | 合并前（2 个函数） | 合并后（1 个函数） |
|------|-----------------|-----------------|
| verifyToken | 2 次 | 1 次 |
| 验证/获取班级 | 2 次 | 1 次 |
| 查学生 | 2 次 | 1 次 |
| **合计** | **~6 次** | **~3 次** |

前端改动：
- `cloudApi.ts`：新增 `homeData` 方法、缓存 30s
- `types/api.ts`：新增 `TTHomeDataRequest` / `TTHomeDataResponse`
- `Home.tsx`：`refresh` 改用 `CloudApi.homeData()`

**缓存失效映射**（必须完整覆盖，否则首页展示旧数据）：

homeData 合并了 classGet（班级摘要）+ studentList（学生列表），所有影响这两类数据的写操作都需要失效 `TT_home_data`：

```typescript
// INVALIDATION_MAP 新增 TT_home_data
TT_student_upsert:  [...现有, "TT_home_data"],  // 学生增改 → 影响学生列表+班级摘要
TT_student_delete:  [...现有, "TT_home_data"],  // 学生删除 → 同上
TT_score_batch:     [...现有, "TT_home_data"],  // 加分 → 影响学生分数+班级摘要
TT_score_revoke:    [...现有, "TT_home_data"],  // 撤回 → 同上
TT_shop_redeem:     [...现有, "TT_home_data"],  // 兑换 → 影响学生可用分
TT_class_upsert:    [...现有, "TT_home_data"],  // 班级改名 → 影响班级摘要
TT_class_delete:    [...现有, "TT_home_data"],  // 班级删除 → 影响班级摘要
```

不需要新增的：`TT_settings_save`（settingsGet 独立调用，不在 homeData 里）、`TT_shop_save`（商品数据不在 homeData 里）、`TT_group_manage`（小组数据不在 homeData 里）。

**收益**：每次首页加载减少 ~6 次数据库操作。

---

### 阶段 3（原阶段 4）：云函数查询一致性修复 ✅ 已完成（2026-02-12）

**风险**：低（仅统一查询方式）
**详情**：已在第一批 verifyToken OR 合并时一并统一

`TT_class_get` 行 89 和 `TT_student_list` 行 59 查学生只用 `{ "data.classId": classId }`，而 `TT_honors_list` 用了 `_.or([{ classId }, { "data.classId": classId }])`。如果有根级 classId 格式的记录会漏查。

**改动**：统一为 `_.or()` 双路径查询。

**关于索引性能**：`_.or()` 双路径是项目既有模式（TT_honors_list 等已在用），不会引入新的性能问题。根级 classId 是历史遗留，长期应做数据迁移统一字段，但那是另一个独立任务。

**收益**：不减少请求数，但修复潜在的数据遗漏问题。

---

## 预期总收益

| 优化项 | 减少量 | 适用场景 |
|-------|-------|---------|
| verifyToken OR 合并（已完成） | -1 次/云函数调用 | 所有认证请求 |
| class_get 复用文档（已完成） | -1 次/class_get | Home |
| Home useEffect 去重 | -3 次云函数调用/首页初始化 | 首页 |
| AppShell 去重 | -1 次 classList/切换班级 | 导航 |
| 缓存 TTL 调优 | -15~20% 重复请求 | 整体 |
| TT_home_data 合并 | -3 次 DB 操作/首页加载 | 首页 |
| 查询双路径统一 | 0（功能修复） | 数据完整性 |

**保守估计**：整体数据库请求数降低 **30-40%**。

## 实施顺序

1. 阶段 1（前端去重 + TTL）→ 零部署成本，只改前端
2. 阶段 3（查询一致性）→ 修 bug，顺便改 2 个云函数
3. 阶段 2（home_data 合并）→ 新建云函数 + 改前端，需部署

## 涉及文件清单

| 文件 | 改动类型 | 阶段 |
|------|---------|------|
| `app/src/routes/Home.tsx` | 修改 useEffect + refresh | 1, 2 |
| `app/src/components/AppShell.tsx` | 拆分 useEffect | 1 |
| `app/src/services/cloudApi.ts` | TTL + homeData + 失效映射 | 1, 2 |
| `app/src/types/api.ts` | 新增类型 | 2 |
| `app/cloudfunctions/TT_class_get/index.js` | 学生查询双路径 | 3 |
| `app/cloudfunctions/TT_student_list/index.js` | 学生查询双路径 | 3 |
| `app/cloudfunctions/TT_home_data/index.js` | 新建 | 2 |
| `app/cloudfunctions/TT_home_data/package.json` | 新建 | 2 |

## 验证方案

1. `cd app && npm run dev`，控制台 `__cfCallCount` 对比调用次数
2. 阶段 1 验证：首页加载 cfCallCount 应为 3 次（classGet + studentList + settingsGet），不再重复调用（原来是 6 次）
3. 阶段 2 验证：首页加载 cfCallCount 应为 2 次（homeData + settingsGet）
4. 功能回归：加分/扣分/光荣榜/小卖部/成长记录/设置全流程
5. 部署后观察一周数据库请求趋势

## 后续优化进展

| 阶段 | 内容 | 减少 DB/日 | 日期 | 文档 |
|------|------|:-:|------|------|
| 第一批 | verifyToken OR 合并 + class_get 复用 | ~4,500 | 2026-02-11 | 本文 |
| 第二阶段 | 前端 useEffect 去重 + TTL 缓存 + TT_home_data 合并 + 查询双路径 | ~6,000 | 2026-02-12 | [日志](2026-02-11-db-request-optimize.md) |
| 第三阶段 | Home refresh 拆分 + TTL 调优 + Settings 精简 refresh | ~4,000 | 2026-02-15 | [日志](2026-02-15-db-call-optimize-phase3.md) |
| 第四阶段 ✅ | score_batch 返回 recordIds + homeData 内联 settings | ~4,170 | 2026-02-16 | [跟踪文档](2026-02-16-db-optimize-medium-risk-plan.md) |
