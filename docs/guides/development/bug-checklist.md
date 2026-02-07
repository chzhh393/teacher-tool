# Bug 检查清单

> 编码完成后，逐项对照检查。每个条目附带真实案例，均来自本项目历史 bug。

---

## 使用方法

代码修改完成后，对 AI 说：

```
请按照 docs/guides/development/bug-checklist.md 检查本次改动
```

---

## 一、CloudBase 数据嵌套（最高频）

### 1.1 查询必须兼容双层存储

**级别**：🔴 致命

tcb-admin-node 的 `.set({ data: obj })` 会把字段嵌套在 `data` 属性下。数据库中同一集合可能同时存在两种格式：

```
旧格式（根级别）：{ _id: "xxx", classId: "class-123", name: "三年三班" }
新格式（嵌套）  ：{ _id: "xxx", data: { classId: "class-123", name: "三年三班" } }
```

**检查项**：

- [ ] 所有 `.where()` 查询都用 `_.or()` 兼容两种路径

```javascript
// ❌ 错误：只查根级别，嵌套数据永远匹配不到
db.collection("TT_settings").where({ classId }).get()

// ✅ 正确：两种路径都查
const _ = db.command
db.collection("TT_settings").where(_.or([
  { classId },
  { "data.classId": classId },
])).limit(1).get()
```

- [ ] 查询结果都做解包处理

```javascript
// ✅ 正确
const raw = row?.data || row
const value = raw?.fieldName
```

**历史案例**：`getThresholds` 用 `where({ classId })` 查设置，但所有班级的 classId 都存在 `data.classId` 下，导致**自定义阈值从未生效**，所有班级一直用默认阈值。直到用户反馈学生加分后等级不按设置升级才发现。

---

### 1.2 字段名格式不统一

**级别**：🟡 中等

历史数据中同一语义字段可能存在多种命名：

```javascript
// ✅ 做好兼容
const count = raw.deviceCount ?? raw.device_count ?? 0
const history = raw.usageHistory || raw.usage_history || []
const id = item.id || item._id || ""
```

**检查项**：

- [ ] 读取字段时考虑 camelCase / snake_case 两种可能
- [ ] ID 字段兼容 `id` 和 `_id`

---

## 二、查询限制

### 2.1 必须显式设置 `.limit()`

**级别**：🔴 致命

CloudBase 默认查询上限为 **100 条**。不加 `.limit()` 在数据超过 100 条时会静默丢失数据。

**检查项**：

- [ ] 所有 `.get()` 查询前都有 `.limit(N)`（通常 1000）
- [ ] 只需一条记录时用 `.limit(1)`

```javascript
// ❌ 错误：超过 100 条时数据不全
db.collection("TT_students").where({ classId }).get()

// ✅ 正确
db.collection("TT_students").where({ classId }).limit(1000).get()
```

**历史案例**：`TT_student_list` 等 6 个云函数无 `.limit()`，新班级超过 100 名学生后列表不全。

---

### 2.2 `.where()` 不能省略

**级别**：🟡 中等

没有 `.where()` 会全表扫描，数据量大时性能差且可能命中默认限制。

**检查项**：

- [ ] 除非确实需要全量数据（如用户表），否则必须有 `.where()` 过滤

---

## 三、数值边界

### 3.1 积分/等级封顶

**级别**：🔴 致命

**检查项**：

- [ ] 加分时 totalScore 不超过最高阈值
- [ ] 扣分时 totalScore 不低于 0
- [ ] availableScore 不低于 0

```javascript
// ✅ 正确：加分有上限，减分有下限
const maxTotalScore = thresholds[thresholds.length - 1] || 160
const rawNext = Math.max(0, (raw.totalScore || 0) + score)
const nextTotalScore = score > 0 ? Math.min(rawNext, maxTotalScore) : rawNext
```

**历史案例**：学生 totalScore 达到 135 分，超过最高等级阈值 130 分，积分仍在增长。

---

### 3.2 等级计算边界

**级别**：🟡 中等

**检查项**：

- [ ] 满级时 progress 返回 100（不是 0）
- [ ] 等级判断使用动态 `thresholds.length`，不硬编码 `=== 10`

```javascript
// ❌ 错误：满级时 nextBase === currentBase，range=1，progress=0
// ✅ 正确：满级提前返回
if (level >= maxLevel) {
  return { level, progress: 100 }
}
```

**历史案例**：`computeLevel` 在满级时返回 progress=0，卡片进度条显示为空。

---

### 3.3 徽章计数不能为负

**级别**：🟡 中等

**检查项**：

- [ ] 扣减徽章时用 `Math.max(0, badges - 1)`
- [ ] 撤销操作双向处理：降级扣徽章、升级加徽章

---

## 四、前后端一致性

### 4.1 默认值必须对齐

**级别**：🔴 致命

**检查项**：

- [ ] 前端默认阈值与云函数 `DEFAULT_THRESHOLDS` 一致
- [ ] 新增配置字段时前后端同步添加默认值

**历史案例**：前端默认 `[0,5,12,22,35,50,65,80,90,100]`，云函数默认 `[0,5,12,22,35,50,70,95,125,160]`，新班级首次加分时行为不一致。

---

### 4.2 进化阶段映射同步

**级别**：🟡 中等

**检查项**：

- [ ] `evolution.ts` 的等级-形态映射与产品设计一致
- [ ] 云函数不依赖前端的进化映射（云函数只管等级，不管形态）

---

## 五、并发与原子性

### 5.1 库存扣减必须原子操作

**级别**：🔴 致命

**检查项**：

- [ ] 库存扣减使用 `_.inc(-1)` 而非先读后写
- [ ] 扣减前检查库存 > 0

```javascript
// ❌ 错误：存在竞态条件
const stock = item.stock
if (stock > 0) {
  await doc.update({ data: { stock: stock - 1 } })
}

// ✅ 正确：原子操作
await doc.update({ data: { stock: _.inc(-1) } })
```

**历史案例**：小卖部商品兑换在高并发下可能超卖。

---

## 六、路由与前端

### 6.1 必须使用 HashRouter

**级别**：🔴 致命

**检查项**：

- [ ] 路由使用 `HashRouter`，不要改回 `BrowserRouter`
- [ ] 页面内跳转使用 `<Link>` 组件，不用 `<a>` 标签

**历史案例**：`BrowserRouter` 在静态托管下刷新页面 404；`<a>` 标签绕过 SPA 路由导致相同问题。

---

## 七、日期格式

### 7.1 日期字段多格式兼容

**级别**：🟡 中等

CloudBase 返回的日期可能是多种格式：

```javascript
// 可能的格式
{ $date: 1700000000000 }  // CloudBase 内部格式
new Date()                // Date 对象
1700000000000             // 时间戳
"2026-02-07T00:00:00Z"   // ISO 字符串
```

**检查项**：

- [ ] 显示日期时处理所有可能格式
- [ ] 存储日期统一用 `new Date()`

---

## 八、级联操作

### 8.1 删除操作检查关联数据

**级别**：🟡 中等

**检查项**：

- [ ] 删除学生时，考虑是否需要清理 score_records
- [ ] 删除班级时，考虑是否需要清理 students、settings、score_records
- [ ] 撤销积分时，检查学生是否还存在（可能已删除）

**历史案例**：`TT_score_revoke` 未检查学生是否存在，已删除学生的积分记录撤销时报错。

---

## 快速对照表

| 检查项 | 级别 | 一句话 |
|--------|------|--------|
| `.where()` 用 `_.or()` 双路径 | 🔴 | 不然嵌套数据查不到 |
| 结果用 `row?.data \|\| row` 解包 | 🔴 | 不然取到 undefined |
| `.get()` 前加 `.limit()` | 🔴 | 默认只返回 100 条 |
| 加分封顶、扣分兜底 | 🔴 | 防止数值溢出 |
| 前后端默认值一致 | 🔴 | 不然行为不一致 |
| 库存用 `_.inc()` 原子操作 | 🔴 | 防止并发超卖 |
| 使用 HashRouter | 🔴 | BrowserRouter 刷新 404 |
| 满级 progress 返回 100 | 🟡 | 不然进度条异常 |
| 等级判断用动态 maxLevel | 🟡 | 不要硬编码 10 |
| 徽章数 Math.max(0, ...) | 🟡 | 防止负数 |
| 日期多格式处理 | 🟡 | CloudBase 格式多变 |
| 删除检查关联数据 | 🟡 | 防止孤立数据报错 |
