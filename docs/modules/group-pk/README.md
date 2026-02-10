# 小组PK模块

> 支持老师将学生分组，进行小组积分PK排名。

## 功能概述

### 小组管理

- **创建小组** —— 老师在设置页创建小组，设置名称和颜色标识
- **分配成员** —— 从学生列表中勾选成员加入小组
- **整体保存** —— 所有小组一次性保存（覆盖模式），与小卖部商品保存一致
- **未分组学生** —— 不参与小组排名，不影响个人榜

### 小组积分PK

- **积分算法** —— 小组积分 = 成员 earnedScore 之和（实时聚合，无冗余存储）
- **排名展示** —— 光荣榜页新增「小组PK」Tab，按总积分降序排列
- **成员详情** —— 每个小组可展开查看成员个人积分

## 关键文件

| 文件 | 说明 |
|------|------|
| `app/src/components/GroupManager.tsx` | 分组管理独立组件 |
| `app/src/routes/Settings.tsx` | 设置页（包含分组管理 Tab） |
| `app/src/routes/Honors.tsx` | 光荣榜（含小组PK Tab） |
| `app/src/services/cloudApi.ts` | API 封装 |
| `app/src/types/index.ts` | Group 接口定义 |
| `app/src/types/api.ts` | API 类型定义 |

## 云函数 / API

| 云函数 | API 方法 | action | 说明 |
|--------|----------|--------|------|
| `TT_group_manage` | `groupList` | `list` | 获取班级所有小组 |
| `TT_group_manage` | `groupSave` | `save` | 整体覆盖保存所有小组 |
| `TT_honors_list` | `honorsList` | — | 返回 `groupRanks`（新增字段） |

## 数据集合

### `TT_groups`

```json
{
  "_id": "group-1707800000000-abc",
  "data": {
    "id": "group-1707800000000-abc",
    "classId": "class-5-1",
    "name": "猛虎队",
    "color": "#FF6B35",
    "memberIds": ["stu-01", "stu-02"],
    "order": 0,
    "createdAt": "2026-02-10T00:00:00.000Z",
    "updatedAt": "2026-02-10T00:00:00.000Z"
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 小组唯一 ID |
| `classId` | string | 所属班级 ID |
| `name` | string | 小组名称 |
| `color` | string | 颜色标识（预设 8 色） |
| `memberIds` | string[] | 成员学生 ID 列表 |
| `order` | number | 排序序号 |

## 小组积分算法

```
小组总积分 = SUM(成员.earnedScore)
排名规则：按小组总积分降序
```

- 查询时实时聚合，不冗余存储（班级最多 100 人，性能无压力）
- 空小组积分为 0
- 未分组学生不参与小组排名

## 关联模块

- [荣誉榜模块](../honors/README.md) —— 光荣榜页展示小组PK排名
- [积分系统](../score-system/README.md) —— earnedScore 由积分系统维护
- [班级管理](../class-management/README.md) —— 删除班级时同步清理小组数据

## 注意事项

- 一个学生只能属于一个小组（save 时校验）
- 删除学生时自动从所属小组中移除（`TT_student_delete`）
- 删除班级时小组数据归档后物理删除（`TT_class_delete`）
- 无小组时光荣榜不显示 Tab 切换，保持向后兼容
