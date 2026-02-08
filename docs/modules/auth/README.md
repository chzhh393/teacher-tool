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

### 子账号系统

- 主账号可创建子账号，设置用户名/密码/昵称
- 子账号授权可访问的班级（支持多个班级）
- 子账号仅有加减分权限，所有操作留痕记录操作人
- 子账号可选配"小卖部兑换权限"（`canRedeem`）
- 详细设计方案见 [子账号设计方案](../../guides/development/sub-account-design.md)

### Token 存储

- Token 保存在浏览器 `localStorage` 中
- 页面加载时自动调用 `authVerify` 校验 Token 有效性
- Token 过期或无效时自动跳转到登录页

## 关键文件

| 文件 | 说明 |
|------|------|
| `app/src/routes/Auth.tsx` | 登录 / 注册页面 |
| `app/src/routes/Activate.tsx` | 激活码输入页面 |
| `app/src/stores/authStore.ts` | 认证状态管理（Zustand），含 role/nickname/canRedeem |
| `app/src/services/cloudApi.ts` | API 封装（见下方接口列表） |
| `app/src/components/SubAccountManager.tsx` | 子账号管理 UI（创建/编辑/删除） |

## 云函数 / API

| 云函数 | API 方法 | 说明 |
|--------|----------|------|
| `TT_auth_register` | `authRegister` | 用户注册 |
| `TT_auth_login` | `authLogin` | 用户登录 |
| `TT_auth_activate` | `authActivate` | 激活码激活 |
| `TT_auth_verify` | `authVerify` | Token 验证 |
| `TT_auth_logout` | `authLogout` | 用户登出 |
| `TT_subaccount_manage` | `subAccountList/Create/Update/Delete` | 子账号管理（仅主账号） |

## 数据集合

### TT_users

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | string | 用户 ID |
| `username` | string | 用户名（全局唯一，含子账号） |
| `passwordHash` | string | 密码哈希（bcrypt） |
| `activated` | boolean | 是否已激活 |
| `role` | string | 账号类型：`"main"` 或 `"sub"` |
| `nickname` | string | 显示名（如"数学张老师"） |
| `parentUserId` | string \| null | 子账号指向主账号 ID，主账号为 null |
| `authorizedClassIds` | string[] | 子账号可访问的班级 ID 列表 |
| `canRedeem` | boolean | 子账号是否有小卖部兑换权限，默认 false |
| `activationCode` | string | 绑定的激活码 |
| `createdAt` | Date | 注册时间 |

### TT_sessions

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | string | 会话 ID |
| `userId` | string | 用户 ID |
| `username` | string | 用户名 |
| `token` | string | 会话 Token（48 位 hex） |
| `role` | string | 账号类型 |
| `nickname` | string | 显示名 |
| `authorizedClassIds` | string[] | 子账号授权班级（冗余存储，避免每次查用户表） |
| `canRedeem` | boolean | 子账号兑换权限 |
| `expiredAt` | Date | 过期时间（30 天） |

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
