# 认证模块

> 提供用户注册、登录、Token 验证、登出及激活码设备绑定功能。

## 功能概述

### 基础认证流程

1. **注册** —— 用户名 + 密码创建账户
2. **登录** —— 用户名 + 密码验证，返回 Token
3. **Token 验证** —— 每次请求携带 Token，后端校验有效性
4. **登出** —— 清除会话与本地 Token

### 激活码系统

- 激活码格式：6 位字母数字混合（如 `A3B7K9`）
- 设备绑定：每个激活码最多绑定 **3 台设备**
- 激活流程：用户首次使用时输入激活码，系统记录设备信息并绑定
- 激活码状态：未使用 / 已激活 / 已撤销

### Token 存储

- Token 保存在浏览器 `localStorage` 中
- 页面加载时自动调用 `authVerify` 校验 Token 有效性
- Token 过期或无效时自动跳转到登录页

## 关键文件

| 文件 | 说明 |
|------|------|
| `app/src/routes/Auth.tsx` | 登录 / 注册页面 |
| `app/src/routes/Activate.tsx` | 激活码输入页面 |
| `app/src/stores/authStore.ts` | 认证状态管理（Zustand） |
| `app/src/services/cloudApi.ts` | API 封装（见下方接口列表） |

## 云函数 / API

| 云函数 | API 方法 | 说明 |
|--------|----------|------|
| `TT_auth_register` | `authRegister` | 用户注册 |
| `TT_auth_login` | `authLogin` | 用户登录 |
| `TT_auth_activate` | `authActivate` | 激活码激活 |
| `TT_auth_verify` | `authVerify` | Token 验证 |
| `TT_auth_logout` | `authLogout` | 用户登出 |

## 数据集合

### TT_users

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | string | 用户 ID |
| `username` | string | 用户名（唯一） |
| `password` | string | 密码哈希 |
| `activationCode` | string | 绑定的激活码 |
| `createdAt` | number | 注册时间戳 |

### TT_sessions

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | string | 会话 ID |
| `userId` | string | 用户 ID |
| `token` | string | 会话 Token |
| `expiresAt` | number | 过期时间戳 |

### TT_activation_codes

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | string | 记录 ID |
| `code` | string | 激活码（6 位） |
| `devices` | array | 已绑定设备列表（最多 3 个） |
| `status` | string | 状态：unused / active / revoked |
| `createdAt` | number | 创建时间戳 |

## 注意事项

- 密码在云函数端做哈希处理，前端不存储明文
- 激活码绑定设备数达到上限后，新设备无法使用该激活码
- 管理员可通过 [管理后台](../admin/README.md) 清除设备绑定或撤销激活码
- Token 有效期由云函数控制，前端无需关心过期逻辑
