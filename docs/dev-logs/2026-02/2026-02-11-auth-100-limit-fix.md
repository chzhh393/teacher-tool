# 2026-02-11 认证函数100条限制修复

## 本日目标

修复用户反馈的"激活码无效"问题（手机号 13706903387，激活码 FH4O30）

## 完成内容

1. 定位根因：`TT_users` 已有 108 条记录，三个认证云函数（activate/login/register）使用 `.get()` 全表扫描只返回前 100 条，第 101+ 的用户全部查不到
2. 修复三个云函数，改用 `.where()` + `_.or()` 双路径精确查询
3. 修复前端 `Activate.tsx` 错误提示匹配顺序（`includes("不存在")` 在 `includes("用户不存在")` 之前，导致显示"激活码无效"而非"账号不存在"）
4. 清理重复用户记录（同一手机号因注册函数漏检重名而注册了两条）
5. 部署三个云函数：`TT_auth_activate`、`TT_auth_login`、`TT_auth_register`
6. Bug 检查清单新增两条规则

## 遇到的问题

### 问题链
1. `findUserByUsername` 用 `.get()` 无 `.limit()`，默认只返回 100 条 → 用户 108 人后新用户查不到
2. 云函数抛出"用户不存在"
3. 前端 `includes("不存在")` 在 `includes("用户不存在")` 之前匹配 → 显示"激活码无效"
4. 用户以为激活码有问题，反复尝试

### 连锁影响
- 注册函数同样全表扫描检测重名 → 超 100 人后漏检 → 同一手机号注册了两条记录

## 解决方案

### 云函数修复（3个函数统一修改）
```javascript
// 修改前：全表扫描 + JS 过滤
const result = await db.collection("TT_users").get()
const user = (result.data || []).find(row => row.username === username)

// 修改后：数据库端精确查询
const _ = db.command
const result = await db.collection("TT_users")
  .where(_.or([{ username }, { "data.username": username }]))
  .limit(10).get()
```

### 前端错误匹配修复
```javascript
// 修改前：短串在前，长串被吃掉
if (message.includes("不存在")) { ... }
else if (message.includes("用户不存在")) { ... } // 永远不执行

// 修改后：先长后短
if (message.includes("用户不存在")) { ... }
else if (message.includes("不存在")) { ... }
```

## 相关文件

- `app/cloudfunctions/TT_auth_activate/index.js` — 修复 findUserByUsername
- `app/cloudfunctions/TT_auth_login/index.js` — 修复用户查询
- `app/cloudfunctions/TT_auth_register/index.js` — 修复重名检测
- `app/src/routes/Activate.tsx` — 修复错误提示匹配顺序
- `docs/guides/development/bug-checklist.md` — 新增 2.2 节、6.2 节
