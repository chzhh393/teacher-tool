# CloudBase 集成指南

## 环境配置

项目使用两个 CloudBase 环境：

| 环境 | 环境 ID | 用途 |
|------|---------|------|
| 主环境 | `cloud1-3g9mi825a3a27f25` | 静态托管 + 数据库 + 云函数（生产） |
| 备用环境 | `cloudbase-9gsl8xh8e2560768` | 云函数备份 |

## 前端 SDK 初始化

- **SDK 初始化**：`app/src/lib/cloudbase.ts`
- **环境变量配置**：`app/src/config/env.ts`

## 认证

使用匿名登录，封装在 `app/src/lib/cloudbaseAuth.ts`。用户首次访问时自动完成匿名认证，后续请求携带认证凭据。

## 云函数调用

### 调用链路

```
页面组件
  → app/src/services/cloudApi.ts    # API 层（23 个方法）
    → app/src/lib/cloudbaseFunctions.ts  # callCloudFunction 通用封装
      → CloudBase SDK
```

### callCloudFunction 封装

`cloudbaseFunctions.ts` 提供统一的云函数调用包装器，处理错误捕获和响应解析。

### API 服务层

`cloudApi.ts` 包含 23 个业务方法，按模块划分：
- 幻兽系统（获取/进化/重置）
- 积分系统（加分/减分/记录）
- 商店系统（购买/库存）
- 荣誉系统（授予/撤销）
- 激活码系统（生成/验证/管理）
- 设置系统（获取/更新）

## 部署

### 静态文件部署

```bash
# 方式一：通过 MCP uploadFiles 工具
# 上传 app/dist/ 目录到静态托管

# 方式二：通过 tcb CLI
tcb hosting deploy app/dist/ -e cloud1-3g9mi825a3a27f25
```

### 云函数部署

```bash
# 通过 MCP 工具部署（推荐）
# updateFunctionCode — 更新已有函数，需设置 isWaitInstall: true
# createFunction — 创建新函数，需设置 isWaitInstall: true

# isWaitInstall: true 确保依赖安装完成后才返回
```

## 常见陷阱：数据嵌套问题

tcb-admin-node 返回的数据会嵌套在 `data` 属性下。直接使用 `collection.where()` 查询时，字段路径需要考虑这层嵌套。

**推荐方案**：使用 `listAll` 获取全量数据后，先 unwrap（提取 `data` 属性），再在内存中进行过滤。

```javascript
// 错误：where 查询可能无法匹配嵌套字段
const result = await collection.where({ used: true }).get();

// 正确：listAll + unwrap + 内存过滤
const allData = await listAll(collection);
const unwrapped = allData.map(item => ({ id: item._id, ...item.data }));
const filtered = unwrapped.filter(item => item.used === true);
```

这个 unwrap 模式在整个项目中统一使用，确保数据查询的一致性。
