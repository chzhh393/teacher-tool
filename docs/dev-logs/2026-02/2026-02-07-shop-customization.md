# 2026-02-07 开发日志：小卖部商品自定义

## 本日目标

实现教师可在设置页面自定义小卖部商品，按班级隔离，兑换时自动扣减库存。

## 完成内容

1. 新建 `TT_shop_save` 云函数 — 接收 `{ classId, items }` 批量同步商品（智能增/改/删）
2. 改造 `TT_shop_list` — 增加 classId 参数，按班级过滤返回
3. 改造 `TT_shop_redeem` — 增加库存检查 + `db.command.inc(-1)` 原子扣减
4. Settings.tsx 新增「小卖部商品」管理区块（行内编辑：图标/名称/描述/价格/库存）
5. Store.tsx `shopList` 调用传入 classId
6. 新班级首次加载时自动初始化 8 个默认商品到数据库
7. 迁移旧数据：将 8 个全局商品（无 classId）迁移到用户班级下，删除旧全局数据
8. 修复 `AppShell.tsx` 中 `setCloudStatus` 未定义的编译错误

## 架构决策

**方案选择**：保留 `TT_shop_items` 独立集合（方案B），而非嵌入 `ClassSettings`（方案A）。

**原因**：库存是可变状态（兑换时需原子扣减），不适合嵌入 settings 文档。独立文档支持 `db.command.inc(-1)` 原子操作，避免并发覆盖。

## 遇到的问题

1. **旧商品无 classId** — 改造后按 classId 过滤，旧的全局商品查不到了
2. **默认商品只在前端状态** — 新班级打开 Store 页看不到商品，因为默认值没有写入数据库

## 解决方案

1. 通过 MCP 工具手动迁移：`shopSave` 写入 8 个商品到班级，`writeNoSqlDatabaseContent` 删除旧全局数据
2. Settings refresh 函数检测无商品时自动调用 `shopSave` 将默认商品持久化到数据库

## 修改文件清单

| 文件 | 改动 |
|------|------|
| `app/src/types/api.ts` | 新增 `TTShopListRequest`、`TTShopSaveRequest/Response` |
| `app/src/services/cloudApi.ts` | `shopList` 加参数，新增 `shopSave` |
| `app/src/utils/normalize.ts` | `normalizeShopItems` 加 `data` 嵌套处理 |
| `app/src/routes/Settings.tsx` | 商品管理区块 + 自动初始化默认商品 |
| `app/src/routes/Store.tsx` | `shopList({ classId })` |
| `app/src/components/AppShell.tsx` | 修复 `setCloudStatus` 编译错误 |
| `app/cloudfunctions/TT_shop_list/index.js` | classId 过滤 |
| `app/cloudfunctions/TT_shop_save/` | **新建** — 批量同步 |
| `app/cloudfunctions/TT_shop_redeem/index.js` | 库存检查 + 原子扣减 |
