# 2026-02-15 开发日志

## 本日目标
- 登录页添加记住密码功能
- 实现忘记密码通过激活码重置的完整流程

## 完成内容

### 1. 记住密码
- 登录 tab 密码框下方新增"记住密码"复选框
- 勾选后登录成功将凭据 base64 编码存入 localStorage（key: `tt-remember-me`）
- 页面加载时自动恢复，取消勾选登录后清除

### 2. 忘记密码重置
- 新建云函数 `TT_auth_reset`：接收 username + code + newPassword
  - 校验用户已激活、激活码有效
  - 允许用户用自己的旧激活码重置（不消耗新码）
  - bcrypt 哈希新密码，更新 `TT_users.passwordHash`
  - 创建 session 自动登录
- 前端 `cloudApi.ts` 新增 `authReset` 方法
- `Activate.tsx` 根据 `purpose` 区分激活/重置两种场景
  - reset 场景：显示用户名输入框 + 激活码 + 新密码 + 确认密码
  - activate 场景：保持原有逻辑不变

### 3. 体验优化
- 未激活账号登录时直接跳转激活页（原来只显示文字提示）
- 激活页标题和提示文案根据场景区分

## 遇到的问题

### 1. 忘记密码流程不通
- **问题**：原来点"忘记密码"跳到激活页，但 `TT_auth_activate` 对已激活用户直接报错"账号已激活"
- **解决**：新建独立云函数 `TT_auth_reset`，只服务已激活用户

### 2. 激活码已使用报错
- **问题**：用户用自己的旧激活码重置密码时被拒绝
- **解决**：校验激活码时，如果 `usedBy` 或 `usedByUsername` 匹配当前用户则放行

### 3. 用户名未传递
- **问题**：用户在登录页未填用户名就点"忘记密码"，跳到重置页后用户名为空
- **解决**：reset 场景下显示可编辑的用户名输入框，而非只读的用户卡片

## 相关文件
- `app/src/routes/Auth.tsx` — 记住密码、未激活跳转、忘记密码入口
- `app/src/routes/Activate.tsx` — 重置密码 UI、purpose 区分逻辑
- `app/src/services/cloudApi.ts` — 新增 authReset 方法
- `app/cloudfunctions/TT_auth_reset/index.js` — 新建云函数
- `app/cloudfunctions/TT_auth_reset/package.json` — 依赖 tcb-admin-node + bcryptjs
