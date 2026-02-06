# 部署文档

> 版本：v1.2
> 最后更新：2026-02-07
> **唯一生产环境：`cloud1-3g9mi825a3a27f25`**
> （静态托管、云函数、数据库均在此环境，前端 `.env` 中 `VITE_TCB_ENV_ID` 与此一致）

---

## 1. 前置条件

- Node.js + npm 已安装
- 项目路径：`app/`
- 构建输出目录：`app/dist/`
- 云函数目录：`app/cloudfunctions/`

## 2. 安装工具

### CloudBase CLI

```bash
npm install -g @cloudbase/cli
```

若首次使用 CLI，需要登录：

```bash
tcb login
```

### CloudBase MCP（推荐）

在 AI 编辑器中配置 `@cloudbase/cloudbase-mcp`，可通过 MCP 工具直接部署，避免 CLI 的交互式提示和部分兼容性问题。

配置文件 `.mcp.json`：

```json
{
  "mcpServers": {
    "cloudbase": {
      "command": "npx",
      "args": ["-y", "@cloudbase/cloudbase-mcp@latest"]
    }
  }
}
```

## 3. 构建产物

在 `app/` 目录执行：

```bash
npm run build
```

产物输出到 `app/dist/`。

## 4. 部署静态网站

### 方式一：tcb CLI

```bash
tcb hosting deploy "app/dist" / -e cloud1-3g9mi825a3a27f25
```

### 方式二：MCP 工具（推荐）

使用 `uploadFiles` 工具，参数：

- `localPath`: `app/dist` 的绝对路径
- `cloudPath`: `/`

部署完成后，访问地址：

```
https://cloud1-3g9mi825a3a27f25-1368265332.tcloudbaseapp.com/
```

建议带缓存刷新参数：

```
https://cloud1-3g9mi825a3a27f25-1368265332.tcloudbaseapp.com/?v=YYYYMMDD-xxxx
```

## 5. 部署云函数

### 方式一：tcb CLI

```bash
tcb fn code update <函数名> -e cloud1-3g9mi825a3a27f25 --dir "app/cloudfunctions/<函数名>"
```

### 方式二：MCP 工具（推荐）

**更新已有函数代码** — 使用 `updateFunctionCode`：

- `name`: 函数名称
- `functionRootPath`: `app/cloudfunctions` 的绝对路径（父目录，不含函数名）

**创建或覆盖函数** — 使用 `createFunction`：

- `func.name`: 函数名称
- `func.runtime`: `Nodejs18.15`
- `func.handler`: `index.main`
- `func.timeout`: `15`
- `func.isWaitInstall`: `true`（开启在线安装依赖）
- `force`: `true`（覆盖已有同名函数）
- `functionRootPath`: `app/cloudfunctions` 的绝对路径

## 6. 查看 / 删除托管文件

```bash
tcb hosting list -e cloud1-3g9mi825a3a27f25
tcb hosting delete <cloudPath> -e cloud1-3g9mi825a3a27f25
```

## 7. admin 目录不部署

当前构建产物不包含 `admin/` 目录；若托管中已存在，可手动删除：

```bash
tcb hosting delete /admin -e cloud1-3g9mi825a3a27f25
```

若后续构建产物里意外包含 `admin/`，请检查构建配置或路由输出后再部署。

## 8. 控制台入口

- 静态网站托管：`https://tcb.cloud.tencent.com/dev?envId=cloud1-3g9mi825a3a27f25#/static-hosting`

---

## 9. 故障排查

### 9.1 云函数部署报 `LimitExceeded.CodeUnzip`

**现象**：部署或更新云函数时报 `code unZipped size Exceeded limit`。

**原因**：之前部署失败可能导致函数处于 `CreateFailed` 状态，且 `InstallDependency` 被设为 `FALSE`，再次部署时会尝试将所有依赖打包上传（超过大小限制）。

**解决**：使用 MCP `createFunction` 工具，设置 `force: true` + `isWaitInstall: true` 覆盖创建，让云端在线安装依赖而非本地打包上传。

### 9.2 云函数 CLI 部署 COS 上传报 `Request has expired`

**现象**：`tcb fn code update` 时 COS 上传超时。

**解决**：改用 MCP 工具部署，或检查网络环境后重试。

### 9.3 `tcb hosting` 报 `Env not exist in your account`

**现象**：执行 `tcb hosting` 命令时报环境不存在。

**原因**：使用了错误的环境 ID。本项目所有资源（静态托管、云函数、数据库）均在 `cloud1-3g9mi825a3a27f25` 环境中。

**解决**：所有命令统一使用 `-e cloud1-3g9mi825a3a27f25`，或改用 MCP 工具（会自动使用当前登录环境）。

### 9.4 MCP 部署到错误环境

**现象**：通过 MCP 工具部署云函数后，前端调用的函数仍是旧代码。

**原因**：MCP 默认连接的环境可能不是 `cloud1-3g9mi825a3a27f25`。部署到了其他环境（如 `cloudbase-9gsl8xh8e2560768`），而前端调用的是 `cloud1` 环境中的函数。

**解决**：部署前先用 MCP `login` 工具确认当前环境，或使用 `envQuery` 查询环境列表。若环境不对，使用 `login(forceUpdate: true)` 切换到 `cloud1-3g9mi825a3a27f25`。

### 9.5 刷新页面 404（NoSuchKey）

**现象**：在子路由（如 `/settings`）刷新页面时返回 COS 404 错误。

**原因**：SPA 使用了 `BrowserRouter`（history 模式），刷新时服务器尝试查找 `/settings` 文件但不存在。

**解决**：将 `BrowserRouter` 改为 `HashRouter`，URL 变为 `/#/settings` 格式，刷新不再 404。
