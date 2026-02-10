# 2026-02-10 开发日志：班级学生人数上限

## 本日目标

为每个班级添加最多 100 名学生的限制，防止数据量过大影响性能。

## 完成内容

1. 云函数 `TT_student_upsert` 新增后端校验：新建学生前用 `.count()` 查询班级现有人数，达到 100 人时抛出错误
2. 前端 Settings.tsx 三个添加入口均增加前端校验：
   - 单个添加：`students.length >= 100` 时阻止
   - 批量文本导入：检查剩余名额，超出时提示具体数字
   - Excel 导入：同上
3. 学生管理区域显示 `当前学生 (N/100)`，达上限时显示红色"已达上限"标签

## 遇到的问题

- 云函数中 `catch (_)` 的 `_` 与新增的 `const _ = db.command` 变量名冲突

## 解决方案

- 将 `catch (_)` 改为 `catch (e)` 避免变量遮蔽

## 修改文件清单

| 文件 | 改动 |
|------|------|
| `app/cloudfunctions/TT_student_upsert/index.js` | 新增 `db.command`、`isNewStudent` 标志、`.count()` 人数校验 |
| `app/src/routes/Settings.tsx` | 新增 `MAX_STUDENTS` 常量，三个添加入口增加前端校验，UI 显示人数/上限 |
