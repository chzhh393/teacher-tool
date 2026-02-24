# 部署

先阅读部署文档 `docs/guides/deployment/deployment.md`，然后按照以下流程执行：

## 部署前检查

1. 确认当前环境为 `cloud1-3g9mi825a3a27f25`（使用 MCP `envQuery` 验证，如不对则用 `login(forceUpdate: true)` 切换）
2. 询问用户要部署什么：前端静态文件、云函数、还是两者都部署

## 部署前端

1. 在 `app/` 目录执行 `npm run build`
2. 使用 MCP `uploadFiles` 工具将 `app/dist` 上传到 `/`
3. 提供访问地址：`https://learn-fun.cn/?v=当前日期`

## 部署云函数

1. 确认要部署的云函数名称
2. 使用 MCP `updateFunctionCode` 工具更新，`functionRootPath` 指向 `app/cloudfunctions` 的绝对路径
3. 如果 `updateFunctionCode` 失败，改用 `createFunction`（设置 `force: true` + `isWaitInstall: true`）
4. 部署后使用 `invokeFunction` 验证函数是否正常

## 关键约束

- **唯一生产环境**：`cloud1-3g9mi825a3a27f25`，绝不部署到其他环境
- 云函数运行时：`Nodejs18.15`，handler：`index.main`
- 遇到问题参考部署文档的故障排查章节
