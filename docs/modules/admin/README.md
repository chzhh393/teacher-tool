# 管理后台模块

> 提供激活码管理和幻兽素材管理功能，仅开发环境可访问。

## 功能概述

### 访问控制

- 管理后台页面 **仅在开发模式下可访问**
- 生产环境访问管理后台路由时，自动重定向到首页（`/`）
- 无独立的管理员角色，通过环境变量控制入口可见性

### 激活码管理（ActivationAdmin）

| 功能 | 说明 |
|------|------|
| 生成激活码 | 批量生成指定数量的 6 位激活码 |
| 列表查看 | 展示所有激活码及其状态、绑定设备数 |
| 筛选过滤 | 按状态（未使用/已激活/已撤销）筛选 |
| 搜索 | 按激活码内容搜索 |
| 撤销激活码 | 将激活码标记为已撤销，关联用户将无法继续使用 |
| 清除设备 | 清空某个激活码的设备绑定列表，释放绑定额度 |
| 导出 | 将激活码列表导出为文件 |

### 统计信息

- 激活码总数
- 各状态数量（未使用 / 已激活 / 已撤销）
- 设备绑定情况统计

### 幻兽管理（BeastAdmin）

- 目前为预留功能，用于后续管理幻兽图片素材
- 功能包括：上传、替换、预览幻兽各进化阶段的图片

## 关键文件

| 文件 | 说明 |
|------|------|
| `app/src/routes/admin/ActivationAdmin.tsx` | 激活码管理页面 |
| `app/src/routes/admin/BeastAdmin.tsx` | 幻兽素材管理页面（预留） |
| `app/cloudfunctions/TT_activation_admin/index.js` | 激活码管理云函数 |

## 云函数 / API

管理后台使用单一云函数 `TT_activation_admin`，通过 `action` 参数区分操作：

| action | 说明 |
|--------|------|
| `stats` | 获取激活码统计信息 |
| `list` | 获取激活码列表（支持筛选和搜索） |
| `generate` | 批量生成新激活码 |
| `clearDevices` | 清除指定激活码的设备绑定 |
| `revoke` | 撤销指定激活码 |

### 调用示例

```typescript
// 获取统计信息
cloudApi.activationAdmin({ action: 'stats' })

// 生成 10 个激活码
cloudApi.activationAdmin({ action: 'generate', count: 10 })

// 清除设备绑定
cloudApi.activationAdmin({ action: 'clearDevices', code: 'A3B7K9' })
```

## 数据集合

管理后台操作的数据集合为 `TT_activation_codes`，结构详见 [认证模块](../auth/README.md)。

## 注意事项

- 生产环境中管理后台路由会被重定向，但云函数本身没有环境限制，需注意接口安全
- 撤销激活码是不可逆操作，撤销后关联用户需要使用新的激活码
- 清除设备绑定后，原有设备需要重新激活才能使用
- BeastAdmin 目前为空壳页面，图片资源的生成规范见 [beast-image-generation.md](../../beast-image-generation.md)
- 激活码管理云函数采用单函数多 action 模式，减少云函数数量便于维护
