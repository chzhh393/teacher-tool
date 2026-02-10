# 2026-02-10 成长记录显示与性能修复

## 本日目标
修复加分后提示信息显示错误学生名、成长记录排序错误，优化记录查询性能。

## 完成内容

### Bug 1: 加分提示显示错误学生名
- 现象：给学生加分后，底部撤回栏显示 "33 作业优秀 +3"，但 "33" 不是被操作的学生
- 根因：`Home.tsx` 的 `handleScore` 在 `scoreBatch` 后立即调用 `recordList` 查最新记录构建提示，数据库一致性延迟导致查到其他学生的旧记录
- 修复：改用前端本地已有数据（`activeStudent.name` + `rule.name` + `rule.score`）直接构建提示信息

### Bug 2: 成长记录排序错误
- 现象：2月10日的记录排在2月9日后面，新记录出现在列表中间而非顶部
- 根因：`TT_record_list` 先将时间戳格式化为 `toLocaleString("zh-CN")` 得到 `"2026/2/10"` 这样不补零的字符串，再用 `localeCompare` 排序。字符串逐字符比较时 `"9"` > `"1"`，导致 2/9 排在 2/10 前面
- 修复：改为使用原始时间戳数值排序

### 优化: 成长记录查询性能
- 之前：每次请求加载该班级全部记录（`limit(1000)`）到内存，做 map/filter/sort 后切片分页
- 之后：无筛选时使用数据库端 `orderBy` + `skip/limit` 分页 + `count()` 计数，并行执行
- 查询路径：单路径 `{ "data.classId": classId }` → `_.or()` 双路径兼容
- 新增复合索引：`TT_score_records` 集合 `data.classId`(asc) + `data.createdAt`(desc)

## 遇到的问题

### tcb-admin-node v1.x 的 `.add()` 返回值陷阱
- 尝试用 `const result = await collection.add({ data })` 捕获返回值获取记录 ID
- 结果：函数返回了 recordIds（看起来是有效 ID），但记录实际未写入数据库
- 学生 `.set()` 正常写入，但同一循环中的 `.add()` 静默失败
- 结论：tcb-admin-node v1.23.x 中不要存储 `.add()` 的返回值，直接 `await` 即可
- 已回退该修改，记录写入恢复正常

## 解决方案
1. 前端提示信息：使用本地数据构建，不依赖数据库查询
2. 记录排序：数据库端 `orderBy("data.createdAt", "desc")`
3. 分页性能：数据库端 `skip/limit` + `count()` 并行查询
4. 数据库索引：复合索引加速查询

## 相关文件
- `app/src/routes/Home.tsx` — handleScore 提示信息逻辑
- `app/src/types/api.ts` — TTScoreBatchResponse 类型（新增 recordIds 可选字段）
- `app/cloudfunctions/TT_score_batch/index.js` — 回退到原始写法
- `app/cloudfunctions/TT_record_list/index.js` — 排序修复 + 性能优化重构
