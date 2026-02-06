# 2026-02-06 开发日志

## 本日目标

修复激活码管理页面"已使用"筛选功能的 Bug。

## 完成内容

1. 修复后端 `list` action 的查询逻辑（`where` 查询改为 `listAll` + 内存过滤）
2. 将 BrowserRouter 切换为 HashRouter，解决静态托管页面刷新 404
3. 通过 MCP 工具完成云函数和静态文件部署
4. 移除页面标题中的个人姓名
5. 更新部署文档，补充故障排查章节

## 遇到的问题

1. **数据库 where 查询无法匹配嵌套字段** — `collection.where({ used: true })` 返回空结果，因为 tcb-admin-node 数据嵌套在 `data` 属性下
2. **tcb CLI 部署失败** — 报 CodeUnzip limit 错误，函数包体积超限
3. **COS 上传超时** — CLI 方式上传静态文件到对象存储时超时
4. **部署到错误环境** — MCP 工具默认连接了备用环境而非主环境
5. **页面刷新 404** — BrowserRouter 在静态托管下无法处理前端路由

## 解决方案

1. 改用 `listAll` 获取全量数据 + `unwrap` 解嵌套 + 内存 `filter`，与 `stats` action 保持一致
2. 使用 MCP `createFunction` 工具替代 CLI，设置 `force: true` + `isWaitInstall: true`
3. 放弃 CLI，全部改用 MCP 工具上传
4. 切换 MCP 连接环境为 `cloud1-3g9mi825a3a27f25`
5. 将 `BrowserRouter` 替换为 `HashRouter`

## 明日计划

- 观察线上运行情况
- 收集用户反馈

## 相关文件

- `app/cloudfunctions/TT_activation_admin/index.js`
- `app/src/App.tsx`
- `app/index.html`
- `docs/guides/deployment/deployment.md`
