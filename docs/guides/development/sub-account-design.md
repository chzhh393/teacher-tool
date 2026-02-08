# 子账号系统设计方案

> 状态：**已完成** | 创建时间：2026-02-07 | Review：2026-02-08 | 实现完成：2026-02-08

## 1. 背景与目标

当前系统是单一老师所有制：每个班级通过 `userId` 绑定一个老师，没有角色/权限系统。两个实际场景需要支持：

1. **班干部代管**：老师下课后把加减分权限临时交给班干部
2. **多老师协作**：语文、数学、英语等多个老师对同一班级学生做加减分

### 解决方案

**主账号 + 子账号模式**：
- 主账号（老师）可创建子账号，设置用户名/密码/昵称
- 主账号授权子账号可访问的班级（支持多个班级）
- 子账号仅有加减分权限，共享主账号设定的积分规则
- 所有操作留痕，记录操作人信息

---

## 2. 数据模型变更

### 2.1 `TT_users` 集合 — 新增字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `role` | `"main" \| "sub"` | 账号类型，默认 `"main"` |
| `nickname` | `string` | 显示名（如"数学张老师"、"班长小明"） |
| `parentUserId` | `string \| null` | 子账号指向主账号 `_id`，主账号为 `null` |
| `authorizedClassIds` | `string[]` | 子账号可访问的班级 ID 列表，主账号为 `[]` |
| `canRedeem` | `boolean` | 子账号是否有小卖部兑换权限，默认 `false` |

**兼容策略**：现有用户无 `role` 字段时，代码中一律视为 `"main"`。

**用户名全局唯一**：子账号与主账号共用 `TT_users` 表，用户名必须在所有账号（主+子）中全局唯一，否则登录时无法区分。`TT_subaccount_manage` 的 `create` action 必须校验全表唯一性。

```json
{
  "_id": "user-sub-001",
  "username": "math_zhang",
  "passwordHash": "...",
  "activated": true,
  "role": "sub",
  "nickname": "数学张老师",
  "parentUserId": "user-1738510000000",
  "authorizedClassIds": ["class-5-1", "class-5-2"],
  "canRedeem": false,
  "createdAt": "2026-02-07T00:00:00.000Z",
  "updatedAt": "2026-02-07T00:00:00.000Z"
}
```

### 2.2 `TT_sessions` 集合 — 新增字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `role` | `"main" \| "sub"` | 账号类型 |
| `nickname` | `string` | 显示名 |
| `authorizedClassIds` | `string[]` | 仅子账号有值，避免每次 `verifyToken` 再查用户表 |
| `canRedeem` | `boolean` | 子账号是否有兑换权限 |

### 2.3 `TT_score_records` 集合 — 新增字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `operatorId` | `string` | 操作人 userId |
| `operatorName` | `string` | 操作人昵称/用户名 |

旧记录无此字段，UI 显示时兼容处理。

---

## 3. 权限模型

### 3.1 权限矩阵

| 功能 | 主账号 | 子账号 |
|------|--------|--------|
| 查看授权班级的学生 | ✅ | ✅ |
| 加分/减分 | ✅ | ✅ |
| 查看积分规则 | ✅ | ✅ |
| 查看积分记录 | ✅ | ✅ |
| 查看光荣榜 | ✅ | ✅ |
| 查看小卖部 | ✅ | ✅ |
| 撤销积分（自己的） | ✅ | ✅ |
| 撤销积分（他人的） | ✅ | ❌ |
| 管理学生名单 | ✅ | ❌ |
| 修改班级设置 | ✅ | ❌ |
| 创建/删除班级 | ✅ | ❌ |
| 管理小卖部商品 | ✅ | ❌ |
| 商品兑换操作 | ✅ | 可配置（`canRedeem`） |
| 幻兽领养/更换 | ✅ | ❌ |
| 管理子账号 | ✅ | ❌ |

### 3.2 统一权限判断函数

```js
const canAccessClass = (user, classRaw) => {
  if (user.role !== "sub") return classRaw.userId === user.userId
  return (user.authorizedClassIds || []).includes(classRaw._id)
}
```

### 3.3 安全约束

- **classId 归属校验**：`TT_subaccount_manage` 的 `create`/`update` action 中，必须校验传入的 `authorizedClassIds` 全部属于当前主账号名下的班级，防止授权他人班级。
- **主账号停用级联**：子账号登录时（`TT_auth_login`），若 `role === "sub"`，需额外查询 `parentUserId` 对应的主账号是否仍然 `activated === true`，主账号停用则子账号也无法登录。

---

## 4. 云函数变更

### 4.0 当前鉴权现状（Review 发现）

以下云函数**当前不接收 token、不做任何鉴权**，本次需一并补齐：

| 云函数 | 当前状态 | 本次需加 |
|--------|----------|----------|
| `TT_score_batch` | ❌ 无鉴权 | token 鉴权 + canAccessClass + 操作人记录 |
| `TT_score_revoke` | ❌ 无鉴权 | token 鉴权 + 子账号仅撤自己的 |
| `TT_record_list` | ❌ 无鉴权 | token 鉴权 + canAccessClass（只读） |
| `TT_record_export` | ❌ 无鉴权 | token 鉴权 + canAccessClass（只读） |
| `TT_honors_list` | ❌ 无鉴权 | token 鉴权 + canAccessClass（只读） |
| `TT_shop_list` | ❌ 无鉴权 | token 鉴权 + canAccessClass（只读） |
| `TT_shop_save` | ❌ 无鉴权 | token 鉴权 + 子账号禁止 |
| `TT_shop_redeem` | ❌ 无鉴权 | token 鉴权 + 子账号禁止 |
| `TT_redeem_list` | ❌ 无鉴权 | token 鉴权 + canAccessClass（只读） |
| `TT_student_upsert` | ❌ 无鉴权 | token 鉴权 + 子账号禁止 |
| `TT_student_delete` | ❌ 无鉴权 | token 鉴权 + 子账号禁止 |

前端 `cloudApi.ts` 中对应的 11 个方法也需补传 `token: getToken()`。

### 4.1 新建：`TT_subaccount_manage`

通过 `action` 参数分派，仅主账号可调用：

| action | 功能 | 关键逻辑 |
|--------|------|----------|
| `list` | 列出我的子账号 | `where({ parentUserId: user.userId })` |
| `create` | 创建子账号 | 校验用户名**全局唯一**，校验 `authorizedClassIds` 归属当前主账号，bcrypt 密码，`activated: true`，`role: "sub"`，可选 `canRedeem` |
| `update` | 修改子账号 | 可改昵称/密码/授权班级/`canRedeem`（需校验 classId 归属），同时更新其活跃 session |
| `delete` | 删除子账号 | 删用户记录 + 清除其所有 session |

### 4.2 修改现有云函数

#### Auth 相关（阶段 1）

| 云函数 | 变更内容 |
|--------|----------|
| `TT_auth_login` | session 写入 `role`/`nickname`/`authorizedClassIds`，返回值新增 `role`/`nickname`。**子账号登录时额外检查主账号是否仍 activated** |
| `TT_auth_verify` | 返回值新增 `role`/`nickname` |
| `TT_auth_register` | 新用户默认 `role: "main"`，`parentUserId: null`，`authorizedClassIds: []` |
| `TT_auth_activate` | **（Review 补充）** session 写入 `role`/`nickname`/`authorizedClassIds`，与 login 保持一致 |

#### 权限控制（阶段 2）

**子账号可读写（加减分）：**

| 云函数 | 变更内容 |
|--------|----------|
| `TT_class_list` | 子账号查询 `_id in authorizedClassIds` |
| `TT_class_get` | **（Review 补充）** 用 `canAccessClass` 替代直接 userId 比较 |
| `TT_student_list` | 用 `canAccessClass` 替代直接 userId 比较 |
| `TT_settings_get` | 用 `canAccessClass`，子账号可读 |
| `TT_score_batch` | 补充 token 鉴权 + `canAccessClass` + 写入 `operatorId`/`operatorName` |
| `TT_score_revoke` | 补充 token 鉴权，子账号只能撤销 `operatorId === userId` 的记录 |

**子账号只读：**

| 云函数 | 变更内容 |
|--------|----------|
| `TT_record_list` | **（Review 补充）** 补充 token 鉴权 + canAccessClass |
| `TT_record_export` | **（Review 补充）** 补充 token 鉴权 + canAccessClass |
| `TT_honors_list` | **（Review 补充）** 补充 token 鉴权 + canAccessClass |
| `TT_shop_list` | **（Review 补充）** 补充 token 鉴权 + canAccessClass |
| `TT_redeem_list` | **（Review 补充）** 补充 token 鉴权 + canAccessClass |

**子账号禁止：**

| 云函数 | 变更内容 |
|--------|----------|
| `TT_settings_save` | 子账号禁止 |
| `TT_class_upsert` | 子账号禁止 |
| `TT_class_delete` | 子账号禁止 |
| `TT_student_upsert` | 补充 token 鉴权 + 子账号禁止 |
| `TT_student_delete` | 补充 token 鉴权 + 子账号禁止 |
| `TT_shop_save` | 补充 token 鉴权 + 子账号禁止 |
| `TT_shop_redeem` | **（Review 补充）** 补充 token 鉴权 + `canRedeem` 可配置权限（无权限子账号禁止，有权限走 `authorizedClassIds` 校验） |

---

## 5. 前端变更

### 5.1 状态管理

`authStore` 新增 `role`、`nickname`、`canRedeem` 字段，同步存储到 localStorage。

### 5.2 cloudApi.ts — token 补传（Review 补充）

以下 11 个方法当前**不传 token**，需统一补上 `token: getToken()`：

```
scoreBatch, scoreRevoke, studentUpsert, studentDelete,
recordList, recordExport, shopList, shopSave, shopRedeem,
redeemList, honorsList
```

同时更新 `authLogin`、`authVerify` 的返回类型以包含 `role`/`nickname`/`canRedeem`。

新增方法：`subAccountList` / `subAccountCreate` / `subAccountUpdate` / `subAccountDelete`。

### 5.3 UI 适配

- **AppShell**：子账号隐藏"老师设置"导航项，用户名旁显示角色标签
- **Settings**：子账号访问时重定向到首页；主账号新增"子账号管理" Tab
- **Home**：子账号隐藏幻兽领养/更换按钮和创建班级入口
- **Records**：有 `operatorName` 时显示操作人信息
- **Store**：子账号兑换权限由 `canRedeem` 配置项控制；无权限时商品卡片显示"仅查看"，有权限时正常显示兑换按钮

### 5.4 新建组件

`SubAccountManager.tsx`：集成到 Settings 页"子账号管理" Tab，支持子账号的创建、编辑、删除。创建/编辑表单包含"允许兑换小卖部商品"权限开关。子账号列表中有兑换权限的显示"可兑换"标签。

---

## 6. 实施阶段

### 阶段 1：后端基础（Auth + 子账号管理）

- 新建 `TT_subaccount_manage` 云函数
- 修改 `TT_auth_login`、`TT_auth_verify`、`TT_auth_register`、`TT_auth_activate`

**涉及文件**：
- `app/cloudfunctions/TT_subaccount_manage/index.js`（新建）
- `app/cloudfunctions/TT_subaccount_manage/package.json`（新建）
- `app/cloudfunctions/TT_auth_login/index.js`
- `app/cloudfunctions/TT_auth_verify/index.js`
- `app/cloudfunctions/TT_auth_register/index.js`
- `app/cloudfunctions/TT_auth_activate/index.js`

### 阶段 2：后端权限控制

- 修改 `TT_class_list`、`TT_class_get` 支持子账号
- 为所有无鉴权的云函数补充 token 鉴权 + 角色限制
- `TT_score_batch`、`TT_score_revoke` 加操作人记录

**涉及文件**：
- `app/cloudfunctions/TT_class_list/index.js`
- `app/cloudfunctions/TT_class_get/index.js`
- `app/cloudfunctions/TT_class_upsert/index.js`
- `app/cloudfunctions/TT_class_delete/index.js`
- `app/cloudfunctions/TT_score_batch/index.js`
- `app/cloudfunctions/TT_score_revoke/index.js`
- `app/cloudfunctions/TT_record_list/index.js`
- `app/cloudfunctions/TT_record_export/index.js`
- `app/cloudfunctions/TT_honors_list/index.js`
- `app/cloudfunctions/TT_settings_get/index.js`
- `app/cloudfunctions/TT_settings_save/index.js`
- `app/cloudfunctions/TT_student_list/index.js`
- `app/cloudfunctions/TT_student_upsert/index.js`
- `app/cloudfunctions/TT_student_delete/index.js`
- `app/cloudfunctions/TT_shop_list/index.js`
- `app/cloudfunctions/TT_shop_save/index.js`
- `app/cloudfunctions/TT_shop_redeem/index.js`
- `app/cloudfunctions/TT_redeem_list/index.js`

### 阶段 3：前端 Auth + UI 适配

- 扩展 `authStore`、`cloudApi`（补传 token + 新增子账号 API）、类型定义
- `AppShell` 导航过滤 + 角色标识
- `Settings` 页子账号拦截
- `Home` 页隐藏管理按钮
- `Records` 显示操作人
- `Store` 页子账号只读

**涉及文件**：
- `app/src/stores/authStore.ts`
- `app/src/services/cloudApi.ts`
- `app/src/types/api.ts`
- `app/src/types/index.ts`
- `app/src/components/AppShell.tsx`
- `app/src/routes/Settings.tsx`
- `app/src/routes/Home.tsx`
- `app/src/routes/Records.tsx`
- `app/src/routes/Store.tsx`

### 阶段 4：子账号管理 UI

- 新建 `SubAccountManager` 组件
- 集成到 Settings 页作为新 Tab

**涉及文件**：
- `app/src/components/SubAccountManager.tsx`（新建）
- `app/src/routes/Settings.tsx`

---

## 7. 验证清单

- [x] 主账号创建子账号（设置用户名/密码/昵称，勾选授权班级）
- [x] 子账号登录 → 仅看到授权的班级
- [x] 子账号给学生加分 → 积分记录中有操作人信息
- [x] 子账号尝试访问设置页 → 被重定向
- [x] 子账号尝试直接调用管理接口 → 返回"无权限"
- [x] 主账号在积分记录中看到子账号的操作留痕
- [x] 主账号修改子账号授权班级 → 子账号刷新后仅看到新授权的班级
- [x] 现有主账号功能不受影响（向后兼容）
- [x] 子账号尝试授权非主账号的班级 → 创建失败
- [x] 主账号停用后子账号无法登录
- [x] 子账号用户名与已有用户名重复 → 创建失败
- [x] 旧积分记录（无 operatorName）正常显示，不报错
- [x] 创建子账号勾选"允许兑换" → 该子账号可在小卖部兑换
- [x] 创建子账号不勾选 → 小卖部商品可见但无兑换按钮，显示"仅查看"
- [x] 编辑子账号切换兑换权限 → 重新登录后生效
