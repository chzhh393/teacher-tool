# 激活码"已使用"筛选返回空结果

- 状态：resolved
- 发现日期：2026-02-06
- 解决日期：2026-02-06
- 严重程度：major

## 问题描述

在激活码管理页面（ActivationAdmin），选择"已使用"状态进行筛选时，返回结果为空。但页面顶部的统计数据显示已使用激活码数量为 6，说明数据实际存在。

## 复现步骤

1. 进入开发模式下的激活码管理页面
2. 在状态筛选下拉框中选择"已使用"
3. 观察列表为空，与统计数据不一致

## 根因分析

后端云函数 `TT_activation_admin` 的 `list` action 使用了 `collection.where({ used: true })` 进行数据库查询。但在 tcb-admin-node 中，文档数据嵌套在 `data` 属性下，实际数据结构为：

```json
{
  "_id": "xxx",
  "data": {
    "code": "ABC123",
    "used": true,
    "usedBy": "..."
  }
}
```

因此 `where({ used: true })` 无法匹配到任何记录。而 `stats` action 使用了 `listAll` + `unwrap` 的方式，正确提取了嵌套数据，所以统计数据是准确的。

## 解决方案

将 `list` action 的查询方式改为与 `stats` action 一致：

1. 使用 `listAll` 获取集合全量数据
2. 通过 `unwrap` 函数提取嵌套的 `data` 属性
3. 在内存中根据 `status` 参数进行过滤

## 相关文件

- `app/cloudfunctions/TT_activation_admin/index.js`

## 验证方法

调用云函数，传入参数 `{"action":"list","status":"used"}`，确认返回 6 条记录，与 `stats` action 的已使用数量一致。
