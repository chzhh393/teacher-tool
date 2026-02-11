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

### 1.3 数据库索引必须建在 `data.` 路径上

**级别**：🔴 致命

tcb-admin-node 的 `.add({ data: obj })` 会把所有字段存储在 `data` 属性下。创建数据库索引时，字段路径必须加 `data.` 前缀，否则所有记录在该索引字段上都是 `null`。

```javascript
// 数据库中实际存储结构
{ _id: "xxx", data: { token: "abc123", classId: "class-1" } }
```

**检查项**：

- [ ] 唯一索引建在 `data.fieldName` 而非 `fieldName`
- [ ] `.add()` 后检查返回值 `addResult.id` 是否存在

```javascript
// ❌ 错误：索引建在 token 上，所有记录的顶层 token 都是 null
// 唯一索引导致只有第一条能写入，后续全部静默失败（add() 不抛异常，返回 code: DATABASE_REQUEST_FAILED）
createIndex({ IndexName: "token_1", MgoIndexKeys: [{ Name: "token" }], MgoIsUnique: true })

// ✅ 正确：索引建在 data.token 上
createIndex({ IndexName: "data_token_1", MgoIndexKeys: [{ Name: "data.token" }], MgoIsUnique: true })

// ✅ 正确：写入后校验
const addResult = await db.collection("TT_shares").add({ data: { token: shareToken, ... } })
if (!addResult.id) {
  throw new Error("写入失败: " + JSON.stringify(addResult))
}
```

**历史案例**：`TT_shares` 集合的唯一索引建在 `token` 字段上，但数据实际存储在 `data.token`。所有记录顶层 `token` 均为 `null`，唯一约束导致只有第一条能写入，后续创建的分享**返回了 token 但数据从未入库**，用户打开分享链接全部显示"链接无效"。且 `add()` 不抛异常，仅在返回值中携带错误码，极难发现。

---

### 1.4 不要存储 `.add()` 的返回值（tcb-admin-node v1.x）

**级别**：🔴 致命

tcb-admin-node v1.23.x 中，将 `.add()` 的返回值赋给变量会导致文档**静默不写入**数据库。函数不报错，返回值中甚至包含看似有效的文档 ID，但数据库中实际不存在该记录。

**检查项**：

- [ ] `.add()` 调用直接 `await`，不要存储返回值
- [ ] 如需获取新文档 ID，改用 `.add()` 前自行生成 ID

```javascript
// ❌ 错误：存储返回值导致文档静默不写入
const result = await db.collection("TT_score_records").add({ data: { ... } })
const newId = result.id  // 看似有效的 ID，但文档不存在！

// ✅ 正确：直接 await，不存返回值
await db.collection("TT_score_records").add({ data: { ... } })
```

**历史案例**：`TT_score_batch` 尝试捕获 `.add()` 返回值以获取记录 ID 用于撤回功能。函数执行成功，返回了 41 个 recordIds（格式正确的 32 位十六进制 ID），但数据库中实际 0 条新记录。同一循环中的 `.set()` 正常写入（学生积分更新成功），唯独 `.add()` 静默失败。回退为 `await .add()` 后恢复正常。

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

**历史案例 2**：`TT_auth_activate`、`TT_auth_login`、`TT_auth_register` 三个云函数用 `.get()` 全表扫描 `TT_users`，再在 JS 中 `.find()` 匹配用户名。用户量达到 108 人后，第 101+ 的用户全部查不到——激活显示"激活码无效"（实际是用户找不到）、登录显示"用户不存在"、注册检测不到重名导致同一手机号注册了两条记录。修复：改用 `.where()` 精确查询 + `.limit(10)`，不做全表扫描。

---

### 2.2 不要全表扫描后在 JS 中过滤

**级别**：🔴 致命

即使加了 `.limit(1000)`，全表扫描 + JS `.find()` 过滤仍是反模式。应使用 `.where()` 在数据库端过滤，性能更好且不受 limit 限制。

**检查项**：

- [ ] 按条件查记录时，使用 `.where()` 而非 `.get()` + `.find()`

```javascript
// ❌ 错误：全表扫描后在 JS 中过滤，受 limit 限制且性能差
const result = await db.collection("TT_users").get()
const user = (result.data || []).find(row => row.username === username)

// ✅ 正确：数据库端精确查询
const _ = db.command
const result = await db.collection("TT_users")
  .where(_.or([{ username }, { "data.username": username }]))
  .limit(10).get()
const user = (result.data || []).map(row => unwrap(row))[0]
```

**历史案例**：见 2.1 历史案例 2。

---

### 2.3 `.where()` 不能省略

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

### 6.2 错误提示 `includes()` 匹配必须先长后短

**级别**：🔴 致命

前端用 `message.includes()` 匹配后端错误信息时，如果短字符串在前、长字符串在后，长字符串会被短字符串"吃掉"，导致用户看到错误的提示。

**检查项**：

- [ ] `includes()` 匹配链中，子串关系的条件必须**先匹配长串（更具体的），再匹配短串（更通用的）**

```javascript
// ❌ 错误："用户不存在" 包含 "不存在"，会先匹配到第 1 个分支，显示"激活码无效"
if (message.includes("不存在")) {
  setNotice("激活码无效")
} else if (message.includes("用户不存在")) {
  setNotice("账号不存在，请先注册")  // 永远不会执行
}

// ✅ 正确：先匹配更长、更具体的字符串
if (message.includes("用户不存在")) {
  setNotice("账号不存在，请先注册")
} else if (message.includes("不存在")) {
  setNotice("激活码无效")
}
```

**历史案例**：`Activate.tsx` 用 `includes("不存在")` 在 `includes("用户不存在")` 之前匹配。当云函数因查不到用户抛出"用户不存在"时，前端先匹配到"不存在"，显示"激活码无效"。用户反复检查激活码以为输错了，实际是账号查询问题。

---

## 七、React 列表与状态

### 7.1 列表 key 不能为空字符串

**级别**：🟡 中等

数据库中部分记录的 `id` 字段可能为空字符串 `""`。多个空字符串作为 React key 会触发 duplicate key 警告，且可能导致渲染错乱。

**检查项**：

- [ ] `.map()` 渲染列表时，key 有空值兜底

```jsx
// ❌ 错误：id 为空时多个元素 key 相同
{students.map((s) => (
  <div key={s.id}>...</div>
))}

// ✅ 正确：空 id 用 index 兜底
{students.map((s, index) => (
  <div key={s.id || `item-${index}`}>...</div>
))}
```

**历史案例**：切换班级后控制台大量 `duplicate key ""` 警告，部分学生卡片渲染错位。原因是某些学生记录的 `id` 字段为空字符串。

---

### 7.2 切换数据源时必须清空旧状态

**级别**：🔴 致命

当用户切换班级、切换 Tab 等操作触发数据重新加载时，如果不先清空旧状态，会短暂显示上一次的数据，造成混乱。

**检查项**：

- [ ] `useEffect` 监听数据源变化时，先清空列表和统计数据，再请求新数据
- [ ] 异步请求返回前，UI 显示加载态而非旧数据

```javascript
// ❌ 错误：切换班级后旧学生列表残留
useEffect(() => {
  if (classId) refreshStudents()
}, [classId])

// ✅ 正确：先清空再加载
useEffect(() => {
  setStudentList([])
  setSummary(null)
  if (classId) refreshStudents()
}, [classId])
```

**历史案例**：切换班级后，学生列表短暂显示上一个班级的学生，点击操作时实际操作的是旧数据对应的学生 ID，导致积分加到错误学生身上。

---

### 7.3 操作目标不能静默回退到"全部"

**级别**：🔴 致命

当函数根据条件判断操作目标时，避免将"所有记录"作为默认兜底。如果条件判断出错，会导致意外影响全部数据。

**检查项**：

- [ ] 操作目标的 fallback 逻辑不能是"选中全部"
- [ ] 单个目标优先于批量目标

```javascript
// ❌ 错误：activeStudent 为 null 且非批量模式时，静默操作全部学生
const ids = batchMode
  ? selectedIds
  : activeStudent
    ? [activeStudent.id]
    : studentList.map((s) => s.id)  // 危险的兜底！

// ✅ 正确：单个目标优先，兜底需要明确的用户操作
const ids = activeStudent
  ? [activeStudent.id]
  : selectedIds.length > 0
    ? selectedIds
    : studentList.map((s) => s.id)
```

**历史案例**：点击单个学生加分，因 `activeStudent` 判断顺序在 `batchMode` 之后，导致触发了"全班操作"逻辑，一次点击给全班 40 个学生都加了分。

---

## 八、移动端兼容

### 8.1 不要使用 `window.confirm()` / `window.prompt()`

**级别**：🔴 致命

iOS Safari 对 `window.confirm()` 和 `window.prompt()` 支持不稳定：弹框可能不显示、被自动关闭、或被浏览器策略拦截。用户点击按钮后完全没反应，无任何错误提示。

**检查项**：

- [ ] 删除确认、危险操作确认等场景不使用 `window.confirm()`
- [ ] 改用自定义 UI 确认（Modal 组件或两次点击确认模式）

```jsx
// ❌ 错误：iOS Safari 可能不弹窗，confirm 返回 false，函数直接 return
const handleDelete = () => {
  if (!window.confirm("确认删除？")) return
  doDelete()
}

// ✅ 正确（方案一）：两次点击确认
const [confirmId, setConfirmId] = useState<string | null>(null)
const handleDelete = (id: string) => {
  if (confirmId !== id) { setConfirmId(id); return }
  setConfirmId(null)
  doDelete(id)
}
// 按钮：第一次显示"删除"，第二次显示"确认删除?"

// ✅ 正确（方案二）：使用 Modal 组件确认
```

**历史案例**：学生列表的"删除"按钮使用 `window.confirm()`，在 iOS Safari 手机端点击后完全无反应。`confirm()` 静默返回 `false`，函数直接 return，用户以为功能坏了。改为两次点击确认后恢复正常。

---

### 8.2 批量操作前必须查最新数据，不能依赖 React state

**级别**：🔴 致命

批量导入（Excel、批量文本）前的上限检查如果使用 React state 中的 `students.length`，在以下场景会失效：
- 用户导入一次后 state 未刷新就再次导入
- 多个浏览器标签页同时操作同一班级
- 网络延迟导致 state 尚未更新

**检查项**：

- [ ] 批量操作前先调 API 查最新数据计数，不依赖 state
- [ ] 超出上限时自动截取，而非全部拒绝
- [ ] 失败时也刷新列表，让 UI 反映已添加的数据

```javascript
// ❌ 错误：state 可能是过时的，重复导入会越过上限
const remaining = MAX_STUDENTS - students.length  // state 中的旧值
if (names.length > remaining) { showError(); return }

// ✅ 正确：每次导入前查最新数据
const freshResult = await CloudApi.studentList({ classId })
const remaining = MAX_STUDENTS - (freshResult.students || []).length
const toAdd = names.slice(0, remaining)  // 自动截取，不超额
```

**历史案例**：用户在手机端用 Excel 导入 51 名学生成功后，误以为没成功又导入一次。前端 state 仍显示 0 名学生（第一次导入后未刷新），检查通过后再次导入 51 名，导致该班级学生达到 102 人，超过 100 人上限。改为导入前先查 API 最新计数后解决。

---

## 九、日期格式

### 9.1 日期字段多格式兼容

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

### 9.2 日期排序不能用格式化后的字符串

**级别**：🔴 致命

`toLocaleString("zh-CN")` 输出的日期不补零（`"2026/2/9"` 而非 `"2026/02/09"`）。用字符串排序时，`"2/9"` > `"2/10"`（逐字符比较 `"9"` > `"1"`），导致 2月9日排在2月10日**前面**。同理，`"9:30"` 会排在 `"10:30"` 后面。

**检查项**：

- [ ] 排序必须用原始时间戳数值，不用格式化后的字符串
- [ ] `formatDate()` 只用于显示，不参与排序

```javascript
// ❌ 错误：格式化后字符串排序，单位数日/月/时会乱序
const records = data
  .map(item => ({ ...item, createdAt: formatDate(item.createdAt) }))
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

// ✅ 正确：先用原始时间戳排序，再格式化显示
const records = data
  .sort((a, b) => getTimestamp(b.createdAt) - getTimestamp(a.createdAt))
  .map(item => ({ ...item, createdAt: formatDate(item.createdAt) }))

// ✅ 更好：直接用数据库 orderBy 排序
db.collection("TT_score_records")
  .where(condition)
  .orderBy("data.createdAt", "desc")
  .skip(skip).limit(pageSize).get()
```

**历史案例**：`TT_record_list` 先将 `createdAt` 格式化为 `"2026/2/10"` 再用 `localeCompare` 排序。用户 2月10日加的分全部排在 2月9日记录后面，以为记录"消失"了（实际在列表中间）。修改为数据库端 `orderBy("data.createdAt", "desc")` 后解决。

---

## 十、级联操作与归档删除

### 10.1 删除必须级联清理关联数据

**级别**：🔴 致命

删除父级实体时，必须同时处理所有引用该实体的子级数据，否则产生孤儿记录。

**检查项**：

- [ ] 删除班级时，级联处理：students、score_records、redeem_records、shop_items、shares、class_settings
- [ ] 删除学生时，考虑是否需要清理 score_records
- [ ] 撤销积分时，检查学生是否还存在（可能已删除）
- [ ] 新增集合引用 classId/studentId 时，同步更新删除函数的级联逻辑

```javascript
// ❌ 错误：只删除班级本身，学生等关联数据全部变成孤儿
await db.collection("TT_classes").doc(classId).remove()

// ✅ 正确：先处理所有关联数据，最后删除班级
const cond = _.or([{ classId }, { "data.classId": classId }])
await removeAll(db, "TT_students", cond)
await removeAll(db, "TT_score_records", cond)
// ... 其他关联集合
await db.collection("TT_classes").doc(classId).remove()
```

**历史案例**：`TT_class_delete` 原本只执行 `doc(classId).remove()`，不清理关联数据。用户删除 20 个班级后，数据库中残留 **1275 条孤儿学生**、214 条加分记录、151 条商品记录。这些孤儿数据导致运营统计页"每日新增学生"显示 1297 人（实际远少于此），因为统计函数计入了所有学生包括孤儿。

---

### 10.2 删除前必须归档（先存后删）

**级别**：🔴 致命

物理删除不可恢复。所有业务数据的删除操作必须先归档再删除，确保误删可恢复。

**检查项**：

- [ ] 删除前将数据写入 `TT_archive` 集合
- [ ] 归档写入后检查 `addResult.id`，失败则中止删除
- [ ] 归档文档包含 `archiveReason`、`archivedAt`、`archivedBy` 元信息

```javascript
// ❌ 错误：直接删除，无法恢复
await db.collection("TT_students").doc(studentId).remove()

// ✅ 正确：先归档，确认成功后再删除
const addResult = await db.collection("TT_archive").add({
  archiveReason: "student_deleted",
  archivedAt: new Date(),
  archivedBy: user.userId,
  student: { ...raw, _originalId: studentId },
})
if (!addResult.id) {
  throw new Error("归档写入失败，删除操作已中止")
}
await db.collection("TT_students").doc(studentId).remove()
```

**历史案例**：初始版本采用纯物理删除，一旦误操作无法恢复。改为归档式删除后，所有删除数据统一存入 `TT_archive` 集合，可随时查询和还原。

---

### 10.3 归档写入避免逐条操作

**级别**：🟡 中等

归档大量数据时，不要逐条 `.add()`，应将同批数据打包成**单个文档**的数组字段，一次写入。

**检查项**：

- [ ] 级联删除时，所有关联数据打包到一条归档文档中
- [ ] 不要为每条记录创建一个归档文档

```javascript
// ❌ 错误：逐条归档，500 条记录 = 500 次网络请求 ≈ 25 秒
for (const record of records) {
  await db.collection("TT_archive").add({ ...record })
}

// ✅ 正确：打包为一条文档，1 次网络请求 ≈ 50ms
await db.collection("TT_archive").add({
  archiveReason: "class_deleted",
  archivedAt: now,
  archivedBy: user.userId,
  class: classData,
  students: students.map(unwrap),      // 数组
  scoreRecords: scoreRecords.map(unwrap), // 数组
})
```

**历史案例**：`TT_class_delete` 最初采用逐条归档方案（每条记录单独 `.add()`），一个 50 人班级约需 600 次写入，耗时 30 秒以上，加上读取和删除操作**极易超过 60 秒云函数超时**。改为单文档打包后，归档操作从 600 次降为 1 次。

---

### 10.4 当前归档架构

所有业务删除操作统一写入 `TT_archive` 集合，通过 `archiveReason` 字段区分类型：

| archiveReason | 触发场景 | 包含数据 |
|---------------|---------|---------|
| `class_deleted` | 删除班级 | class、students[]、scoreRecords[]、redeemRecords[]、shopItems[]、shares[]、settings |
| `student_deleted` | 删除学生 | student |
| `subaccount_deleted` | 删除子账号 | subAccount |

恢复数据时，按 `classId` 或 `archiveReason` 查询 `TT_archive` 集合即可找到完整快照。

---

### 10.5 归档集合必须预先创建

**级别**：🔴 致命

CloudBase 数据库不会在 `.add()` 时自动创建集合。如果目标集合不存在，`add()` 不抛异常但返回结果无 `id`。

**检查项**：

- [ ] 新增归档逻辑前，确认 `TT_archive` 集合已在 CloudBase 控制台创建
- [ ] `add()` 后必须检查 `addResult.id`，无 id 立即中止

**历史案例**：`TT_class_delete` 归档写入 `TT_archive` 集合，但该集合从未创建。`add()` 静默失败（返回无 `id`），触发"归档写入失败"错误，导致所有班级删除操作全部报错。

---

## 快速对照表

| 检查项 | 级别 | 一句话 |
|--------|------|--------|
| `.where()` 用 `_.or()` 双路径 | 🔴 | 不然嵌套数据查不到 |
| 结果用 `row?.data \|\| row` 解包 | 🔴 | 不然取到 undefined |
| 索引建在 `data.field` 路径上 | 🔴 | 不然唯一索引导致写入静默失败 |
| `.add()` 后检查 `addResult.id` | 🔴 | add 失败不抛异常，只返回错误码 |
| `.add()` 不要存储返回值（v1.x） | 🔴 | 存变量会导致文档静默不写入 |
| `.get()` 前加 `.limit()` | 🔴 | 默认只返回 100 条 |
| 不要全表扫描+JS过滤 | 🔴 | 用 `.where()` 在数据库端过滤 |
| 加分封顶、扣分兜底 | 🔴 | 防止数值溢出 |
| 前后端默认值一致 | 🔴 | 不然行为不一致 |
| 库存用 `_.inc()` 原子操作 | 🔴 | 防止并发超卖 |
| 使用 HashRouter | 🔴 | BrowserRouter 刷新 404 |
| `includes()` 匹配先长后短 | 🔴 | 子串关系匹配顺序错会显示错误提示 |
| 列表 key 空值兜底 | 🟡 | 空字符串 key 导致渲染错乱 |
| 切换数据源先清空旧状态 | 🔴 | 不然残留旧数据误操作 |
| 操作目标不能默认"全部" | 🔴 | 不然意外影响所有记录 |
| 满级 progress 返回 100 | 🟡 | 不然进度条异常 |
| 等级判断用动态 maxLevel | 🟡 | 不要硬编码 10 |
| 徽章数 Math.max(0, ...) | 🟡 | 防止负数 |
| 不用 `window.confirm()` | 🔴 | iOS Safari 可能不弹窗，用户点了没反应 |
| 批量操作前查最新数据 | 🔴 | 不依赖 state，防止重复导入越过上限 |
| 日期多格式处理 | 🟡 | CloudBase 格式多变 |
| 日期排序用时间戳，不用字符串 | 🔴 | toLocaleString 不补零，字符串排序会乱 |
| 删除必须级联清理 | 🔴 | 不然产生孤儿记录污染统计 |
| 删除前必须归档 | 🔴 | 先存后删，误删可恢复 |
| 归档避免逐条写入 | 🟡 | 打包成单文档，防止超时 |
| 新集合引用 classId 时更新级联 | 🟡 | 不然删除班级后新集合数据残留 |
| 归档集合必须预先创建 | 🔴 | CloudBase 不自动建集合，add 静默失败 |
