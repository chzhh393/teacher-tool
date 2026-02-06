# 班级与学生管理模块

> 支持多班级管理、班级切换、学生增删改查及批量导入。

## 功能概述

### 班级管理

- **多班级支持** —— 一个教师账户可创建和管理多个班级
- **班级切换** —— 在主页顶部可快速切换当前操作的班级
- **班级 CRUD** —— 创建、查看、编辑、删除班级
- 删除班级时会提示关联数据影响

### 学生管理

- **学生 CRUD** —— 在指定班级下添加、编辑、删除学生
- **批量导入** —— 支持通过文本批量录入学生姓名
- 每个学生绑定一个班级，拥有独立的积分和幻兽数据

### 操作入口

所有班级和学生管理操作集中在「设置」页面中，通过不同的功能区域组织。

## 关键文件

| 文件 | 说明 |
|------|------|
| `app/src/routes/Settings.tsx` | 设置页面（包含班级管理和学生管理区域） |
| `app/src/stores/classStore.ts` | 班级与学生状态管理（Zustand） |
| `app/src/services/cloudApi.ts` | API 封装 |

## 云函数 / API

### 班级相关

| 云函数 | API 方法 | 说明 |
|--------|----------|------|
| `TT_class_list` | `classList` | 获取班级列表 |
| `TT_class_get` | `classGet` | 获取班级详情 |
| `TT_class_upsert` | `classUpsert` | 创建 / 更新班级 |
| `TT_class_delete` | `classDelete` | 删除班级 |

### 学生相关

| 云函数 | API 方法 | 说明 |
|--------|----------|------|
| `TT_student_list` | `studentList` | 获取学生列表 |
| `TT_student_upsert` | `studentUpsert` | 创建 / 更新学生 |
| `TT_student_delete` | `studentDelete` | 删除学生 |

## 数据集合

### TT_classes

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | string | 班级 ID |
| `userId` | string | 所属教师 ID |
| `name` | string | 班级名称 |
| `createdAt` | number | 创建时间戳 |
| `updatedAt` | number | 更新时间戳 |

### TT_students

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | string | 学生 ID |
| `classId` | string | 所属班级 ID |
| `name` | string | 学生姓名 |
| `totalScore` | number | 累计积分（用于等级计算） |
| `availableScore` | number | 可用积分（用于商店兑换） |
| `beastId` | string | 当前幻兽 ID |
| `level` | number | 当前等级 |
| `badges` | array | 已获得的徽章列表 |

## 注意事项

- 切换班级后，主页、荣誉榜等页面会自动加载对应班级的数据
- 删除班级不会自动删除关联的学生和积分记录，需谨慎操作
- 批量导入学生时，以换行符分隔姓名，系统会自动去重
- 学生的 `totalScore` 和 `availableScore` 由 [积分系统](../score-system/README.md) 维护
