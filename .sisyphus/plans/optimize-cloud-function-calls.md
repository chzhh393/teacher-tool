# 优化云函数调用量

## TL;DR

> **Quick Summary**: 通过在前端 `callCloudFunction` 层添加请求去重 + TTL 缓存，并修复 Home/Settings 页面的重复请求 bug，将云函数调用量降低 40-60%，使月调用量控制在 20 万免费额度内。
> 
> **Deliverables**:
> - `cloudbaseFunctions.ts` 增加请求去重（dedup）层
> - `cloudApi.ts` 增加 TTL 缓存层（per-function 配置）
> - 修复 Home.tsx 双 useEffect 导致的重复刷新
> - 修复 Settings.tsx loadClassList + refresh 重复调 classList
> - 集中 signInAnonymously 到 App.tsx 一处调用
> - dev-only 调用计数器用于验证优化效果
> 
> **Estimated Effort**: Medium（~4-6小时实施）
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Task 1 → Task 2 → Task 3 → Task 5 (计数器 → 去重 → 缓存 → 验证)

---

## Context

### Original Request
云函数调用量 13.54万 / 20万（2月前11天），日均 ~1.23万次。按此趋势月底将达 ~34.4万次，远超 20万免费额度。用户要求优化调用量。

### 分析发现

**调用热点**（每次页面加载的云函数调用次数）：

| 场景 | 调用的云函数 | 次数 |
|------|------------|------|
| AppShell 加载 | classList + settingsGet | 2 |
| Home 页加载 | classGet + studentList + settingsGet | 3 |
| Settings 页加载 | classList + settingsGet + studentList + shopList | 4 |
| Store 页加载 | shopList + studentList + redeemList | 3 |
| Honors 页加载 | honorsList | 1 |
| 进首页（AppShell + Home） | 合计 | ~5 |
| 切到 Settings | 额外 | +4 |
| 切到 Store | 额外 | +3 |
| 标准一次浏览 | 首页→设置→商店→返回首页 | ~14+ |

**已识别 Bug**：
- Home.tsx 有两个 useEffect 在初始挂载时都会调用 `refresh(classId)`，导致重复请求
- Settings.tsx 的 `loadClassList` 和 `refresh` 都会调用 `classList`，挂载时双重调用

**signInAnonymously 说明**：此函数调用的是 CloudBase Auth SDK，**不计入**云函数调用次数配额。但仍值得集中化以减少不必要的异步开销和代码重复。

### Metis Review
**Identified Gaps** (addressed):
- signInAnonymously 不消耗云函数配额 → 调整优先级，降为最后处理
- 需要 per-function TTL 而非统一 TTL → 已在方案中按函数配置
- 缓存必须是内存级、非持久化 → 已明确约束
- 缓存失效必须在写操作返回前同步完成 → 已设计为同步失效模式
- 识别了 Home 双 useEffect bug 和 Settings 双 classList bug → 已加入修复任务
- post-score refresh 中 settingsGet 可缓存但 classGet/studentList 不可 → 已在缓存策略中区分

---

## Work Objectives

### Core Objective
在不改变任何用户可见行为的前提下，将云函数调用量降低 40%+，使月调用量控制在 20 万免费额度内。

### Concrete Deliverables
- `app/src/lib/cloudbaseFunctions.ts` — 增加 dedup + 计数器
- `app/src/services/cloudApi.ts` — 增加 TTL 缓存层 + 写操作缓存失效
- `app/src/routes/Home.tsx` — 修复双 useEffect 重复刷新
- `app/src/routes/Settings.tsx` — 修复 loadClassList + refresh 重复 classList
- `app/src/lib/cloudbaseAuth.ts` — 改造为单例模式
- `app/src/App.tsx` — 集中 signInAnonymously
- `app/src/components/AppShell.tsx` — 移除 signInAnonymously 调用

### Definition of Done
- [ ] `npm run build` 成功，零错误
- [ ] 标准流程（登录 → 首页 → 设置 → 商店 → 返回首页）调用次数从 ~14+ 降至 ≤8
- [ ] 切换班级后所有页面正确显示新班级数据
- [ ] 评分后数据立即更新，无陈旧显示
- [ ] Settings 自动保存正常工作

### Must Have
- 请求去重层（相同参数的并发调用只发一次）
- TTL 缓存层（per-function 可配置的内存缓存）
- 写操作同步失效相关缓存
- 修复 Home/Settings 的重复请求 bug
- dev-only 调用计数器

### Must NOT Have (Guardrails)
- **不引入新的 npm 依赖**（不用 React Query、SWR 等）
- **不修改任何云函数代码**（纯前端优化）
- **不修改 Settings 自动保存逻辑**（debounce + JSON snapshot 保持不变）
- **不缓存写操作**（scoreBatch, settingsSave, shopSave, studentUpsert 等必须实际发送）
- **不将缓存持久化到 localStorage/sessionStorage**（仅内存缓存）
- **不修改 classStore/authStore 的 localStorage 持久化模式**
- **不重构组件结构或路由**
- **不改变 classId 传播链**（classStore → localStorage → useEffect 依赖链不动）
- **不触碰 post-score refresh 中的 classGet/studentList**（评分后必须获取最新数据）

---

## Verification Strategy

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.

### Test Decision
- **Infrastructure exists**: NO
- **Automated tests**: None（项目无测试基础设施）
- **Framework**: none

### Agent-Executed QA Scenarios (PRIMARY verification method)

每个任务的验证通过以下方式完成：
1. `npm run build` 编译检查
2. dev-only console 计数器对比优化前后
3. Playwright 浏览器自动化验证功能正确性

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: 添加 dev-only 调用计数器（基线测量）
└── Task 4: 集中 signInAnonymously（独立，不影响其他任务）

Wave 2 (After Task 1):
├── Task 2: 请求去重层（依赖 Task 1 的计数器验证效果）
├── Task 3: TTL 缓存层（依赖 Task 1，可与 Task 2 同时开发但需在之后集成）
└── Task 5: 修复 Home/Settings 重复请求 bug

Wave 3 (After All):
└── Task 6: 端到端验证 + 构建检查

Critical Path: Task 1 → Task 2 → Task 3 → Task 6
Parallel Speedup: Task 4 与 Wave 1 并行，Task 5 与 Wave 2 并行
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 3, 6 | 4 |
| 2 | 1 | 3, 6 | 4, 5 |
| 3 | 2 | 6 | 4, 5 |
| 4 | None | 6 | 1, 2, 3, 5 |
| 5 | None | 6 | 1, 2, 3, 4 |
| 6 | 1, 2, 3, 4, 5 | None | None (final) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1, 4 | task(category="quick") parallel |
| 2 | 2+3 (sequential), 5 | task(category="unspecified-high") + task(category="quick") parallel |
| 3 | 6 | task(category="unspecified-low", load_skills=["playwright"]) |

---

## TODOs

- [ ] 1. 添加 dev-only 云函数调用计数器

  **What to do**:
  - 在 `callCloudFunction` 中添加计数器，仅在 `import.meta.env.DEV` 时激活
  - 记录每个函数名 + 调用次数到 `window.__cfCallLog` 数组
  - 提供 `window.__cfCallCount` 汇总和 `window.__cfReset()` 重置方法
  - 每次调用在 console 输出 `[CF] TT_xxx_xxx (第N次)`
  - 不影响生产构建（tree-shake 掉）

  **Must NOT do**:
  - 不在生产环境输出任何日志
  - 不引入外部依赖
  - 不改变 callCloudFunction 的返回类型或行为

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 单文件、<20 行改动、逻辑简单
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 4)
  - **Blocks**: Tasks 2, 3, 6
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `app/src/lib/cloudbaseFunctions.ts:1-18` — 当前 callCloudFunction 完整实现，需要在此文件内部添加计数器逻辑

  **API/Type References**:
  - `import.meta.env.DEV` — Vite 环境变量，用于条件编译，确保生产构建 tree-shake

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Build succeeds with counter code
    Tool: Bash
    Preconditions: None
    Steps:
      1. cd app && npm run build
      2. Assert: exit code 0
      3. Assert: no errors in output
    Expected Result: Build completes successfully
    Evidence: Build output captured

  Scenario: Counter does not appear in production bundle
    Tool: Bash
    Preconditions: Build completed
    Steps:
      1. grep -r "__cfCallLog" app/dist/ || echo "NOT_FOUND"
      2. Assert: output is "NOT_FOUND"
    Expected Result: Counter code tree-shaken from production
    Evidence: grep output captured
  ```

  **Commit**: YES
  - Message: `perf(cloudApi): add dev-only cloud function call counter for optimization baseline`
  - Files: `app/src/lib/cloudbaseFunctions.ts`
  - Pre-commit: `cd app && npm run build`

---

- [ ] 2. 实现请求去重层（Dedup Layer）

  **What to do**:
  - 在 `callCloudFunction` 内部添加去重逻辑
  - 用一个 `Map<string, Promise>` 存储正在进行的请求（key = functionName + JSON.stringify(data)）
  - 如果相同 key 的请求正在进行中，直接返回已有的 Promise（共享结果）
  - 请求完成（resolve 或 reject）后从 Map 中移除 key
  - **错误传播**：所有共享 Promise 的调用者必须都能收到 rejection
  - 不影响写操作（写操作的参数通常含时间戳/唯一数据，key 自然不同）

  **Must NOT do**:
  - 不限制或节流请求（只去重完全相同的并发请求）
  - 不缓存结果（去重 ≠ 缓存，请求完成后立即清除）
  - 不修改函数签名或返回类型

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 涉及 Promise 并发控制，需要仔细处理错误传播和 Map 清理的边界情况
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sequential after Task 1)
  - **Blocks**: Task 3, 6
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `app/src/lib/cloudbaseFunctions.ts:1-18` — 当前完整实现，去重逻辑直接加在 `callCloudFunction` 函数内部
  - `app/src/components/AppShell.tsx:29-55` — AppShell useEffect 同时调 classList + settingsGet，与 Home 页的 settingsGet 构成并发重复调用的典型场景

  **API/Type References**:
  - `app/src/services/cloudApi.ts:62` — `getToken()` 函数，token 作为 data 的一部分参与 dedup key 计算

  **关键实现细节**:
  - dedup key 生成：`${name}::${JSON.stringify(data)}` — 包含 token 在内的完整参数
  - Map 的清理时机：在 `.finally()` 中清理，确保无论成功/失败都移除
  - Promise 共享方式：多个 caller 拿到的是同一个 Promise 引用，自然共享 resolve/reject

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Build succeeds with dedup layer
    Tool: Bash
    Preconditions: Task 1 completed (counter exists)
    Steps:
      1. cd app && npm run build
      2. Assert: exit code 0
    Expected Result: Build succeeds
    Evidence: Build output captured

  Scenario: Dedup layer exports correct types
    Tool: Bash
    Preconditions: Code written
    Steps:
      1. cd app && npx tsc --noEmit
      2. Assert: exit code 0, no type errors
    Expected Result: TypeScript type check passes
    Evidence: tsc output captured
  ```

  **Commit**: YES
  - Message: `perf(cloudApi): add request dedup layer to prevent duplicate concurrent calls`
  - Files: `app/src/lib/cloudbaseFunctions.ts`
  - Pre-commit: `cd app && npm run build`

---

- [ ] 3. 实现 TTL 缓存层（Cache Layer）

  **What to do**:
  - 在 `cloudApi.ts` 中添加缓存配置和缓存逻辑
  - 创建一个内部缓存 Map：`Map<string, { data: unknown, expiry: number }>`
  - 缓存 key = functionName + JSON.stringify(params)
  - **Per-function TTL 配置**：

    | 云函数 | TTL | 理由 |
    |--------|-----|------|
    | TT_class_list | 300s (5min) | 班级列表极少变化 |
    | TT_settings_get | 60s | 可能在其他设备修改 |
    | TT_student_list | 15s | 评分时需要快速刷新 |
    | TT_shop_list | 60s | 商品很少在使用中变化 |
    | TT_honors_list | 30s | 派生自学生数据 |
    | TT_class_get | 30s | 班级概要信息 |
    | TT_redeem_list | 30s | 兑换记录 |
    | TT_record_list | 0 (不缓存) | 分页数据，参数常变 |
    | TT_record_summary | 30s | 统计概览 |
    | 所有写操作 | 0 (不缓存) | 必须实际发送 |

  - **写操作缓存失效映射**（同步失效，在 callCloudFunction 发出请求之前清除）：

    | 写操作 | 失效的缓存 |
    |--------|-----------|
    | TT_settings_save | TT_settings_get (same classId) |
    | TT_shop_save | TT_shop_list (same classId) |
    | TT_student_upsert | TT_student_list, TT_honors_list, TT_class_get (same classId) |
    | TT_student_delete | TT_student_list, TT_honors_list, TT_class_get (same classId) |
    | TT_score_batch | TT_student_list, TT_honors_list, TT_class_get, TT_record_list, TT_record_summary (same classId) |
    | TT_score_revoke | TT_student_list, TT_honors_list, TT_class_get, TT_record_list, TT_record_summary (same classId) |
    | TT_shop_redeem | TT_student_list, TT_redeem_list, TT_shop_list (same classId) |
    | TT_class_upsert | TT_class_list, TT_class_get |
    | TT_class_delete | TT_class_list + 该 classId 下所有缓存 |
    | TT_group_manage (save) | TT_honors_list (same classId) |

  - **实现方式**：在 `cloudApi.ts` 中创建 `cachedCall` 包装函数替代直接调用 `callCloudFunction`
  - 提供 `CloudApi._clearCache()` 方法供 dev 调试用
  - Token 失效/认证错误时清除全部缓存

  **Must NOT do**:
  - 不缓存任何 auth 相关函数（auth_login, auth_verify, auth_register, auth_activate, auth_logout）
  - 不缓存 wechat 相关函数
  - 不缓存 activation_admin、ops_overview（管理后台函数）
  - 不缓存 share_create（包含 list/create/revoke 三种 action）
  - 不将缓存持久化到 localStorage
  - 不修改 CloudApi 对外的函数签名
  - 不修改 Settings.tsx 的 auto-save debounce 逻辑

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 缓存失效映射复杂，需要仔细处理 classId 匹配逻辑和多种写操作的失效组合
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (依赖 Task 2 的 dedup 层)
  - **Parallel Group**: Wave 2 (sequential after Task 2)
  - **Blocks**: Task 6
  - **Blocked By**: Task 2

  **References**:

  **Pattern References**:
  - `app/src/services/cloudApi.ts:1-381` — 完整的 CloudApi 对象，所有方法的结构，需要逐一判断哪些加缓存、哪些不加
  - `app/src/lib/cloudbaseFunctions.ts` — `callCloudFunction` 底层调用，缓存层应在 cloudApi.ts 层面而非此处
  - `app/src/routes/Settings.tsx:256-264` — auto-save 调用 settingsSave + shopSave 的模式，缓存失效需要与此协调
  - `app/src/routes/Home.tsx:240-298` — handleScore 后的 refresh 流程，scoreBatch 后 studentList/classGet 不能走缓存

  **API/Type References**:
  - `app/src/services/cloudApi.ts:62` — `getToken()` 用于获取 token，token 变更时应清除所有缓存
  - `app/src/types/api.ts` — 所有请求/响应类型定义

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Build succeeds with cache layer
    Tool: Bash
    Preconditions: Tasks 1-2 completed
    Steps:
      1. cd app && npm run build
      2. Assert: exit code 0
    Expected Result: Build succeeds
    Evidence: Build output captured

  Scenario: TypeScript type check passes
    Tool: Bash
    Preconditions: Code written
    Steps:
      1. cd app && npx tsc --noEmit
      2. Assert: exit code 0
    Expected Result: No type errors
    Evidence: tsc output captured

  Scenario: Cache configuration is complete for all read functions
    Tool: Bash
    Preconditions: Code written
    Steps:
      1. grep -c "TT_class_list\|TT_settings_get\|TT_student_list\|TT_shop_list\|TT_honors_list\|TT_class_get" app/src/services/cloudApi.ts
      2. Assert: all cacheable functions have TTL configuration
    Expected Result: All planned functions have cache config
    Evidence: grep output
  ```

  **Commit**: YES
  - Message: `perf(cloudApi): add TTL cache layer with per-function config and write invalidation`
  - Files: `app/src/services/cloudApi.ts`
  - Pre-commit: `cd app && npm run build`

---

- [ ] 4. 集中 signInAnonymously 调用

  **What to do**:
  - 在 `App.tsx` 的 bootstrap 流程中调用一次 `signInAnonymously`，设置一个 ready 标志
  - 移除以下位置的 `signInAnonymously` 调用：
    - `app/src/components/AppShell.tsx:32` — 移除 `await signInAnonymously()`
    - `app/src/routes/Home.tsx:114` — 移除 `const state = await signInAnonymously()`，改为直接调用 refresh
    - `app/src/routes/Auth.tsx:41` — 移除 `await signInAnonymously()`
    - `app/src/routes/Activate.tsx:47` — 移除 `await signInAnonymously()`
    - `app/src/routes/WeChatBind.tsx:52` — 移除 `await signInAnonymously()`
    - `app/src/routes/ShareView.tsx:327` — 移除 `await signInAnonymously()`
  - App.tsx 已有一处调用（line 74），确保它在渲染子路由前完成
  - 在 `cloudbaseAuth.ts` 中改造 `signInAnonymously` 为单例模式：如果已调用过且成功，直接返回缓存的 loginState

  **Must NOT do**:
  - 不改变用户可见的加载行为（loading 状态保持不变）
  - 不删除 `cloudbaseAuth.ts` 文件
  - 不修改匿名登录的底层逻辑

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 模式简单（移除调用 + 确保入口处调用），改动分散在多个文件但每处只删几行
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Task 6
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `app/src/lib/cloudbaseAuth.ts:1-15` — 当前 signInAnonymously 实现，已有 getLoginState 检查，需要加单例缓存
  - `app/src/App.tsx:72-74` — 现有的匿名登录调用位置（微信回调处理中），需要评估是否可以提升为通用入口
  - `app/src/App.tsx:103-124` — bootstrap useEffect，token 验证流程，是放置统一匿名登录的候选位置

  **需要移除 signInAnonymously 调用的文件**：
  - `app/src/components/AppShell.tsx:32` — load() 中的 `await signInAnonymously()`
  - `app/src/routes/Home.tsx:114` — connect() 中的 `const state = await signInAnonymously()`
  - `app/src/routes/Auth.tsx:41` — handleLogin() 中的 `await signInAnonymously()`
  - `app/src/routes/Activate.tsx:47` — handleActivate() 中的 `await signInAnonymously()`
  - `app/src/routes/WeChatBind.tsx:52` — handleBind() 中的 `await signInAnonymously()`
  - `app/src/routes/ShareView.tsx:327` — fetchData() 中的 `await signInAnonymously()`

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Build succeeds after signInAnonymously centralization
    Tool: Bash
    Preconditions: signInAnonymously calls removed from 6 files
    Steps:
      1. cd app && npm run build
      2. Assert: exit code 0
    Expected Result: Build succeeds
    Evidence: Build output

  Scenario: No remaining scattered signInAnonymously calls
    Tool: Bash
    Preconditions: Code changes complete
    Steps:
      1. grep -rn "signInAnonymously" app/src/ --include="*.ts" --include="*.tsx" | grep -v "cloudbaseAuth.ts" | grep -v "App.tsx" | grep -v "import "
      2. Assert: output is empty (no actual calls outside App.tsx and the definition file)
    Expected Result: Only App.tsx and cloudbaseAuth.ts contain signInAnonymously
    Evidence: grep output
  ```

  **Commit**: YES
  - Message: `refactor(auth): centralize signInAnonymously to single call in App.tsx`
  - Files: `app/src/lib/cloudbaseAuth.ts`, `app/src/App.tsx`, `app/src/components/AppShell.tsx`, `app/src/routes/Home.tsx`, `app/src/routes/Auth.tsx`, `app/src/routes/Activate.tsx`, `app/src/routes/WeChatBind.tsx`, `app/src/routes/ShareView.tsx`
  - Pre-commit: `cd app && npm run build`

---

- [ ] 5. 修复 Home/Settings 重复请求 Bug

  **What to do**:

  **Bug 1: Home.tsx 双 useEffect 重复刷新**
  - 位置：`app/src/routes/Home.tsx` lines 110-135
  - 问题：第一个 useEffect（空依赖 `[]`）调用 `refresh(classId)`；第二个 useEffect（`[classId]`）在 `classId && classId !== summary?.id` 时也调用 `refresh(classId)`。初始挂载时 summary 为 null，所以两个都触发。
  - 修复：移除第一个 useEffect 中的 `refresh(classId)` 调用，让第二个 useEffect 统一负责数据加载。或将两个 useEffect 合并为一个。

  **Bug 2: Settings.tsx loadClassList + refresh 重复 classList**
  - 位置：`app/src/routes/Settings.tsx` lines 151-226
  - 问题：`loadClassList`（line 154）调用 `CloudApi.classList()`，`refresh`（line 182）也调用 `CloudApi.classList()`。两个 useEffect 在挂载时都触发，导致 classList 被调用两次。
  - 修复：从 `refresh()` 中移除 `CloudApi.classList()` 调用，让 `loadClassList` 单独负责班级列表获取。`refresh` 只负责获取当前班级的 settingsGet + studentList + shopList。

  **Must NOT do**:
  - 不改变 Settings 的 auto-save debounce 逻辑
  - 不改变 classId 依赖的 useEffect 触发时机
  - 不改变数据加载后的状态更新逻辑
  - 不改变 UI 或用户可见行为

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 两处 bug 修复，每处改动 <15 行，逻辑清晰
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 3)
  - **Blocks**: Task 6
  - **Blocked By**: None (can start immediately, but logically belongs in Wave 2)

  **References**:

  **Pattern References**:
  - `app/src/routes/Home.tsx:77-108` — `refresh()` 函数的完整实现，调用 classGet + studentList + settingsGet
  - `app/src/routes/Home.tsx:110-127` — 第一个 useEffect（connect 函数），调用 signInAnonymously + refresh
  - `app/src/routes/Home.tsx:129-135` — 第二个 useEffect，classId 变化时调用 refresh。这两个 useEffect 在初始挂载时都触发导致重复
  - `app/src/routes/Settings.tsx:151-173` — `loadClassList` 函数，调用 CloudApi.classList()
  - `app/src/routes/Settings.tsx:175-222` — `refresh` 函数，也调用 CloudApi.classList() 作为 4 个并行请求之一
  - `app/src/routes/Settings.tsx:224-226` — useEffect 触发 loadClassList
  - `app/src/routes/Settings.tsx:238-240` — useEffect 触发 refresh。两个 effect 在挂载时同时触发

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Build succeeds after bug fixes
    Tool: Bash
    Preconditions: Both bugs fixed
    Steps:
      1. cd app && npm run build
      2. Assert: exit code 0
    Expected Result: Build succeeds
    Evidence: Build output

  Scenario: TypeScript type check passes
    Tool: Bash
    Preconditions: Code changes complete
    Steps:
      1. cd app && npx tsc --noEmit
      2. Assert: exit code 0
    Expected Result: No type errors
    Evidence: tsc output
  ```

  **Commit**: YES
  - Message: `fix(pages): eliminate duplicate API calls on Home and Settings mount`
  - Files: `app/src/routes/Home.tsx`, `app/src/routes/Settings.tsx`
  - Pre-commit: `cd app && npm run build`

---

- [ ] 6. 端到端验证 + 构建检查

  **What to do**:
  - 运行 `npm run build` 确认零错误
  - 启动 dev server，用 Playwright 执行完整功能验证流程
  - 通过 dev-only console 计数器对比优化前后的调用次数
  - 验证所有核心功能正常工作

  **Must NOT do**:
  - 不修改任何代码（纯验证任务）
  - 不跳过任何验证场景

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: 验证任务，不涉及复杂逻辑
  - **Skills**: [`playwright`]
    - `playwright`: 浏览器自动化验证 UI 功能

  **Parallelization**:
  - **Can Run In Parallel**: NO (final verification)
  - **Parallel Group**: Wave 3 (after all other tasks)
  - **Blocks**: None
  - **Blocked By**: Tasks 1, 2, 3, 4, 5

  **References**:

  **Pattern References**:
  - All files modified in Tasks 1-5

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Production build succeeds
    Tool: Bash
    Preconditions: All tasks 1-5 completed
    Steps:
      1. cd app && npm run build
      2. Assert: exit code 0
      3. Assert: dist/ directory exists and contains index.html
    Expected Result: Build succeeds with no errors
    Evidence: Build output captured

  Scenario: Dev server starts successfully
    Tool: Bash
    Preconditions: Build succeeded
    Steps:
      1. cd app && npm run dev &
      2. Wait 5 seconds
      3. curl -s http://localhost:5173 | head -5
      4. Assert: HTML response received
    Expected Result: Dev server running
    Evidence: curl output

  Scenario: Login and Home page load
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running on localhost:5173
    Steps:
      1. Navigate to: http://localhost:5173/#/auth
      2. Wait for: input visible (timeout: 10s)
      3. Fill login credentials
      4. Click submit
      5. Wait for: navigation to /#/ (Home)
      6. Assert: page contains student list or class info
      7. Screenshot: .sisyphus/evidence/task-6-home-load.png
    Expected Result: Login succeeds, Home loads with data
    Evidence: .sisyphus/evidence/task-6-home-load.png

  Scenario: Tab navigation triggers minimal API calls
    Tool: Playwright (playwright skill)
    Preconditions: Logged in, on Home page
    Steps:
      1. Open browser console, run: window.__cfReset()
      2. Navigate to Settings tab
      3. Wait for settings page to load
      4. Navigate to Store tab
      5. Wait for store page to load
      6. Navigate back to Home tab
      7. Run in console: JSON.stringify(window.__cfCallCount)
      8. Assert: total calls ≤ 8 for this navigation sequence
    Expected Result: Significantly fewer calls than baseline (~14+)
    Evidence: Console output of __cfCallCount
  ```

  **Commit**: NO (verification only)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `perf(cloudApi): add dev-only cloud function call counter for optimization baseline` | cloudbaseFunctions.ts | npm run build |
| 2 | `perf(cloudApi): add request dedup layer to prevent duplicate concurrent calls` | cloudbaseFunctions.ts | npm run build |
| 3 | `perf(cloudApi): add TTL cache layer with per-function config and write invalidation` | cloudApi.ts | npm run build |
| 4 | `refactor(auth): centralize signInAnonymously to single call in App.tsx` | 8 files | npm run build |
| 5 | `fix(pages): eliminate duplicate API calls on Home and Settings mount` | Home.tsx, Settings.tsx | npm run build |
| 6 | — | — | Full E2E verification |

---

## Success Criteria

### Verification Commands
```bash
cd app && npm run build        # Expected: exit code 0, zero errors
cd app && npx tsc --noEmit     # Expected: exit code 0, zero type errors
```

### Quantitative Target
- **Before**: 标准流程（Home → Settings → Store → Home）~14+ 次云函数调用
- **After**: 同流程 ≤ 8 次
- **Reduction**: ≥ 40%
- **Monthly projection**: 从 ~34.4万 降至 ~20万以内

### Final Checklist
- [ ] All "Must Have" present（dedup、cache、失效映射、bug fix、计数器）
- [ ] All "Must NOT Have" absent（无新依赖、无云函数修改、无持久化缓存）
- [ ] `npm run build` passes
- [ ] 标准流程调用次数 ≤ 8
- [ ] 评分后数据立即更新
- [ ] 班级切换后所有页面显示正确数据
- [ ] Settings 自动保存正常工作
