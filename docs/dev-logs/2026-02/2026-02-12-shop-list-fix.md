# 2026-02-12 小卖部商品不显示修复

## 本日目标
- 修复 PC 端小卖部商品显示为两行的布局问题
- 排查并修复 3年3班小卖部商品不显示的 bug

## 完成内容
1. Store 页面商品卡片布局改为 `lg:grid-cols-4`（一行 4 个）
2. 设置页小卖部商品管理 PC 端合并为单行显示（`lg:flex-nowrap`）
3. 修复 `TT_shop_list` 云函数全表扫描导致商品被截断的问题
4. 清理全部班级的重复商品数据（2036 → 1005 条）

## 遇到的问题

### 问题 1：小卖部页面商品不显示
- **现象**：chzhh333 账号的 3年3班小卖部页面完全空白
- **排查**：通过云函数日志发现 `TT_shop_list` 对该班级返回 `{"items":[]}`
- **根因**：线上部署的 `TT_shop_list` 使用 `db.collection("TT_shop_items").limit(1000).get()` 全表扫描后在 JS 中按 classId 过滤。`TT_shop_items` 总量已达 2036 条，超过 1000 限制，该班级商品排在 1000 名之后被截断

### 问题 2：商品大量重复（88 条 → 应为 8 条）
- **现象**：3年3班有 112 条商品记录（同一商品重复 14 次）
- **根因**：`TT_shop_list` 返回空 → 设置页 `remoteShopItems.length === 0` → 误判为新班级 → 自动调用 `shopSave` 写入 8 条默认商品。每次进入设置页都重复一次，加上 auto-save debounce 可能并发，累积产生大量重复

## 解决方案
1. **修复云函数**：`TT_shop_list` 改为按 classId 精确查询 `_.or([{ classId }, { "data.classId": classId }])`，不再全表扫描
2. **部署云函数**：通过 MCP 部署修复版到线上
3. **清理重复数据**：编写临时云函数 `TT_cleanup_shop_dupes`，按 name 去重，每个班级每种商品只保留一条，全库删除 935 条重复记录
4. **添加 checklist**：将此问题加入 bug-checklist.md 防止复发

## 相关文件
- `app/cloudfunctions/TT_shop_list/index.js` — 添加 `_.or()` 按 classId 查询
- `app/src/routes/Store.tsx` — 布局改为 `lg:grid-cols-4`
- `app/src/routes/Settings.tsx` — 商品管理行 PC 端合并为单行
- `docs/guides/development/bug-checklist.md` — 新增 2.4 条目
