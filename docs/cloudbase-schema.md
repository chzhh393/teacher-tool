# 腾讯云开发 - TT 数据结构与云函数约定

> 用于在云开发控制台创建集合与云函数时参考

## 1. 集合命名（TT 前缀）

| 集合用途 | 集合名称 |
|----------|----------|
| 班级 | `TT_classes` |
| 学生 | `TT_students` |
| 用户 | `TT_users` |
| 会话 | `TT_sessions` |
| 积分记录 | `TT_score_records` |
| 兑换记录 | `TT_redeem_records` |
| 商品 | `TT_shop_items` |
| 配置 | `TT_settings` |
| 装饰品 | `TT_decorations` |
| 成就 | `TT_achievements` |
| 恐龙数据 | `TT_dinosaurs` |

## 2. 核心集合结构（简版）

### 2.1 `TT_classes`
```json
{
  "_id": "class-5-1",
  "name": "五年级1班",
  "settingsId": "settings-5-1",
  "createdAt": "2026-02-03T00:00:00.000Z",
  "updatedAt": "2026-02-03T00:00:00.000Z"
}
```

### 2.2 `TT_students`
```json
{
  "_id": "stu-01",
  "classId": "class-5-1",
  "name": "徐浩然",
  "dinosaurId": "t-rex",
  "dinosaurName": "霸王龙",
  "level": 8,
  "totalScore": 108,
  "availableScore": 42,
  "badges": 1,
  "progress": 72,
  "createdAt": "2026-02-03T00:00:00.000Z",
  "updatedAt": "2026-02-03T00:00:00.000Z"
}
```

### 2.3 `TT_score_records`
```json
{
  "_id": "record-01",
  "classId": "class-5-1",
  "studentId": "stu-01",
  "studentName": "徐浩然",
  "ruleId": "rule-01",
  "ruleName": "作业优秀",
  "type": "add",
  "score": 10,
  "createdAt": "2026-02-03T10:00:00.000Z"
}
```

### 2.4 `TT_shop_items`
```json
{
  "_id": "item-01",
  "name": "免作业卡",
  "description": "免写一次作业",
  "cost": 50,
  "type": "privilege",
  "stock": 10,
  "limitPerStudent": 1,
  "order": 1
}
```

## 3. 云函数命名（TT 前缀）

| 功能 | 云函数名称 | 请求数据 | 返回数据 |
|------|------------|----------|----------|
| 获取班级列表 | `TT_class_list` | `{}` | `{ classes }` |
| 新建/更新班级 | `TT_class_upsert` | `{ classInfo }` | `{ classInfo }` |
| 删除班级 | `TT_class_delete` | `{ classId }` | `{ ok }` |
| 获取班级概览 | `TT_class_get` | `{}` | `{ classSummary }` |
| 获取学生列表 | `TT_student_list` | `{}` | `{ students }` |
| 添加/更新学生 | `TT_student_upsert` | `{ student }` | `{ student }` |
| 删除学生 | `TT_student_delete` | `{ studentId }` | `{ ok }` |
| 批量加分/扣分 | `TT_score_batch` | `{ classId, studentIds, ruleId, score }` | `{ updatedStudentIds }` |
| 撤回操作 | `TT_score_revoke` | `{ recordId }` | `{ ok }` |
| 获取成长记录 | `TT_record_list` | `{ page, pageSize }` | `{ records, total }` |
| 导出成长记录 | `TT_record_export` | `{}` | `{ csvUrl }` |
| 获取小卖部商品 | `TT_shop_list` | `{}` | `{ items }` |
| 商品兑换 | `TT_shop_redeem` | `{ studentId, itemId }` | `{ redeemRecord }` |
| 兑换记录 | `TT_redeem_list` | `{ page, pageSize }` | `{ records, total }` |
| 获取光荣榜 | `TT_honors_list` | `{}` | `{ ranks }` |
| 获取班级设置 | `TT_settings_get` | `{ classId }` | `{ settings }` |
| 保存班级设置 | `TT_settings_save` | `{ settings }` | `{ ok }` |
| 注册 | `TT_auth_register` | `{ username, password }` | `{ token, username }` |
| 登录 | `TT_auth_login` | `{ username, password }` | `{ token, username }` |
| 登录校验 | `TT_auth_verify` | `{ token }` | `{ ok, username }` |
| 退出登录 | `TT_auth_logout` | `{ token }` | `{ ok }` |

## 4. 权限建议

- 前端仅调用云函数，不直接写数据库
- 数据库规则设置为仅允许云函数写入
- 匿名登录允许调用云函数，后续可增加班级管理码校验
