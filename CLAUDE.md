# 幻兽学院 - 项目指南

## 部署环境（重要）

**所有资源使用同一个 CloudBase 环境，不要部署到其他环境：**

| 资源 | 环境 ID |
|------|---------|
| 静态托管 | `cloud1-3g9mi825a3a27f25` |
| 云函数 | `cloud1-3g9mi825a3a27f25` |
| 数据库 | `cloud1-3g9mi825a3a27f25` |

前端 `app/.env` 中 `VITE_TCB_ENV_ID=cloud1-3g9mi825a3a27f25` 与此一致。

**MCP 部署前必须确认环境**：使用 `envQuery` 或 `login` 确认当前连接的是 `cloud1-3g9mi825a3a27f25`，而非其他环境。

## 项目结构

- `app/` — 前端应用（React + Vite + TypeScript）
- `app/cloudfunctions/` — CloudBase 云函数
- `docs/` — 文档中心（[导航](docs/README.md)）

## 技术栈

- React 19 + Vite + TypeScript + Tailwind CSS + Zustand
- 腾讯云 CloudBase（tcb-admin-node）
- 路由：HashRouter（不要改回 BrowserRouter，静态托管不支持）

## 开发

```bash
cd app && npm install && npm run dev
```

## 部署

**当用户提到"部署"、"上线"、"发布"时，必须先阅读 `docs/guides/deployment/deployment.md`，然后按流程执行：**
1. 用 MCP `envQuery` 确认当前环境是 `cloud1-3g9mi825a3a27f25`
2. 询问部署范围（前端 / 云函数 / 全部）
3. 按部署文档步骤执行，部署后验证

## 编码后必查

修改云函数或前端逻辑后，必须按 [`docs/guides/development/bug-checklist.md`](docs/guides/development/bug-checklist.md) 逐项检查，重点关注：

1. **数据嵌套双路径**：`.where()` 必须用 `_.or([{ field }, { "data.field": value }])` 兼容两种存储格式
2. **结果解包**：查询结果用 `row?.data || row` 解包
3. **查询限制**：`.get()` 前必须加 `.limit()`（默认只返回 100 条）
4. **数值边界**：加分封顶、扣分兜底、徽章不为负
5. **前后端默认值一致**：新增配置时前后端同步

## 注意事项

- 云函数中 tcb-admin-node 的数据嵌套在 `data` 属性下，查询时使用 `_.or()` 双路径查询 + `unwrap` 解包
- 管理后台（`/activation-admin`、`/beast-admin`）仅开发模式可访问
