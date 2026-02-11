# 2026-02-11 开发日志

## 本日目标
优化云函数调用量，降低 CloudBase 个人版环境成本，确保月度调用量控制在 20 万次免费额度内。

## 完成内容

### 1. 背景
- CloudBase 个人版环境 `cloud1-3g9mi825a3a27f25` 云函数调用量预警。
- 2 月前 11 天已消耗 13.54 万次（日均 ~1.23 万），预估月底将达到 ~34.4 万次，远超 20 万次免费额度。
- 目标：通过纯前端优化降低调用量 40%+，将月度消耗控制在免费额度内。

### 2. 优化措施
- **signInAnonymously 单例化**：解决应用生命周期内多处重复调用匿名登录的问题。
- **请求去重层 (Dedup)**：解决并发请求导致的重复云函数调用。
- **TTL 内存缓存层**：减少短时间内的重复读操作。
- **修复重复请求 Bug**：
  - `Home.tsx`：修复双 `useEffect` 导致的重复初始化。
  - `Settings.tsx`：移除重复的 `classList` 获取逻辑。

### 3. 技术实现细节
- **`cloudbaseAuth.ts`**：引入 `loginStatePromise` 单例模式和 `isLoggingIn` 标志位，确保全局只有一个登录进程。
- **`cloudbaseFunctions.ts`**：实现 `inflightRequests` Map，通过 `dedupKey`（函数名+参数哈希）拦截正在进行的相同请求。
- **`cloudApi.ts`**：
  - 引入 `CACHE_TTL` 配置表，为不同接口设置差异化缓存时长。
  - 引入 `INVALIDATION_MAP` 失效映射，在执行写操作时自动清除相关的读缓存。
  - 封装 `cachedCall` 包装器，统一处理缓存逻辑。
- **Dev 计数器**：在开发环境下提供 `window.__cfCallCount`、`window.__cfCallLog` 和 `window.__cfReset()`，方便实时监控调用情况。

### 4. 缓存配置表
```typescript
const CACHE_TTL: Record<string, number> = {
  TT_class_list: 300,      // 5 minutes
  TT_settings_get: 60,     // 1 minute
  TT_student_list: 15,     // 15 seconds
  TT_shop_list: 60,        // 1 minute
  TT_honors_list: 30,      // 30 seconds
  TT_class_get: 30,        // 30 seconds
  TT_redeem_list: 30,      // 30 seconds
  TT_record_summary: 30,   // 30 seconds
}
```

### 5. 失效映射表
```typescript
const INVALIDATION_MAP: Record<string, string[]> = {
  TT_settings_save: ["TT_settings_get"],
  TT_shop_save: ["TT_shop_list"],
  TT_student_upsert: ["TT_student_list", "TT_honors_list", "TT_class_get"],
  TT_student_delete: ["TT_student_list", "TT_honors_list", "TT_class_get"],
  TT_score_batch: ["TT_student_list", "TT_honors_list", "TT_class_get", "TT_record_list", "TT_record_summary"],
  TT_score_revoke: ["TT_student_list", "TT_honors_list", "TT_class_get", "TT_record_list", "TT_record_summary"],
  TT_shop_redeem: ["TT_student_list", "TT_redeem_list", "TT_shop_list"],
  TT_class_upsert: ["TT_class_list", "TT_class_get"],
  TT_class_delete: ["TT_class_list"],
  TT_group_manage: ["TT_honors_list"],
}
```

## 遇到的问题
- 匿名登录在多个路由组件中被重复触发，导致不必要的调用。
- 并发请求（如 `Home` 页面初始化）在登录未完成时会排队触发多次登录和数据请求。
- 频繁的读操作（如学生列表、荣誉榜）在短时间内数据变化不大的情况下消耗了大量调用量。

## 解决方案
- 实施登录状态单例化，确保全局共享登录 Promise。
- 增加请求去重层，拦截重复的并发请求。
- 引入 TTL 缓存机制，并配合失效映射表保证数据一致性。

## 明日计划
- 持续监控 CloudBase 控制台调用量数据。
- 验证缓存失效逻辑在复杂交互场景下的准确性。

## 相关文件
- `app/src/lib/cloudbaseAuth.ts`
- `app/src/lib/cloudbaseFunctions.ts`
- `app/src/services/cloudApi.ts`
- `app/src/components/AppShell.tsx`
- `app/src/routes/Home.tsx`
- `app/src/routes/Settings.tsx`
- `app/src/routes/Auth.tsx`
- `app/src/routes/Activate.tsx`
- `app/src/routes/WeChatBind.tsx`
- `app/src/routes/ShareView.tsx`
