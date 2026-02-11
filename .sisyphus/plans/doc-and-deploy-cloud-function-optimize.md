# 记录云函数调用优化变更 + 部署上线

## TL;DR

> **Quick Summary**: 将 v1.5.9 云函数调用量优化的变更记录到文档中心（CHANGELOG + 开发日志），提交所有未提交代码，然后通过 MCP 部署前端到生产环境。
> 
> **Deliverables**:
> - 更新 `docs/CHANGELOG.md` 新增 v1.5.9 条目
> - 创建 `docs/dev-logs/2026-02/2026-02-11-cloud-function-optimize.md` 开发日志
> - Git 提交所有未提交改动
> - 前端构建并部署到 `cloud1-3g9mi825a3a27f25`
> 
> **Estimated Effort**: Quick
> **Parallel Execution**: NO - sequential (commit → build → deploy)
> **Critical Path**: Task 1 → Task 2 → Task 3 → Task 4

---

## Context

### Original Request
用户要求将云函数调用量优化的改动记录到文档中心，然后部署到生产环境。

### Current State
- 已提交 commit `5d50977`: signInAnonymously 集中化 + 请求去重层 + dev 计数器
- 未提交: `app/src/services/cloudApi.ts` (TTL 缓存层，最核心的优化)
- 未提交: `docs/CHANGELOG.md` (已有部分 v1.5.8 内容)
- 未提交: `docs/dev-logs/2026-02/2026-02-11-storage-traffic-optimize.md` (这是存储优化的日志，不是云函数的)
- 未提交: `.sisyphus/boulder.json` + `.sisyphus/plans/optimize-cloud-function-calls.md`
- 本次云函数优化不涉及任何云函数代码改动，只部署前端即可

---

## Work Objectives

### Core Objective
记录变更到文档中心 + 部署前端到生产环境

### Must Have
- CHANGELOG 新增 v1.5.9 条目，覆盖所有优化点
- 开发日志记录完整的优化过程
- 所有代码提交到 git
- 前端构建并部署到 `cloud1-3g9mi825a3a27f25`

### Must NOT Have (Guardrails)
- 不修改任何云函数代码
- 不部署云函数（本次优化全部是前端改动）
- 不改 CHANGELOG 中已有的 v1.5.8 内容
- 部署环境必须是 `cloud1-3g9mi825a3a27f25`，不能部署到其他环境

---

## Verification Strategy

### Test Decision
- **Automated tests**: None (文档 + 部署任务)
- **Agent-Executed QA**: 构建验证 + 部署后访问验证

---

## TODOs

- [x] 1. 更新 CHANGELOG + 创建开发日志

  **What to do**:
  - 在 `docs/CHANGELOG.md` 顶部（v1.5.8 之前）新增 v1.5.9 条目，内容覆盖：
    - **优化 - 云函数调用量优化**：
      - `signInAnonymously` 单例模式：从每个页面重复调用改为 App 启动时单次调用 + Promise 去重
      - 请求去重层（dedup）：相同并发请求共享 Promise，避免重复调用云函数
      - TTL 内存缓存层：读操作按函数配置缓存（classList 5分钟、settingsGet 1分钟、studentList 15秒等），写操作自动失效关联缓存
      - 修复 Home.tsx 双 useEffect 重复刷新 bug
      - 修复 Settings.tsx refresh() 中重复的 classList 调用
    - **开发工具**：
      - DEV 模式云函数调用计数器：`window.__cfCallCount`、`window.__cfCallLog`、`window.__cfReset()`，生产构建自动 tree-shake
  - 创建 `docs/dev-logs/2026-02/2026-02-11-cloud-function-optimize.md`，参考 TEMPLATE.md 格式，包含：
    - 背景：2月前11天用了 13.54万次（日均~1.23万，预估月底~34.4万，超过20万免费额度）
    - 优化措施：4 项（单例化、去重、TTL缓存、修复重复请求 bug）
    - 技术实现细节：缓存配置表、失效映射表
    - 修改文件清单

  **Must NOT do**:
  - 不修改 v1.5.8 的已有内容
  - 不添加未实现的功能到 CHANGELOG

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`sync-updates`] — 如果需要同步到前端更新页面
    - 但本次只是写文档，不需要同步前端，所以无额外 skill

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential — Task 1
  - **Blocks**: Task 2
  - **Blocked By**: None

  **References**:
  - `docs/CHANGELOG.md:1-19` — 现有 v1.5.8 格式，新版本条目需插入在其前面
  - `docs/dev-logs/TEMPLATE.md` — 开发日志模板格式
  - `docs/dev-logs/2026-02/2026-02-11-storage-traffic-optimize.md` — 参考同类日志的详细程度
  - `app/src/services/cloudApi.ts:62-97` — TTL 缓存配置和失效映射（写入日志的技术细节来源）
  - `app/src/lib/cloudbaseFunctions.ts:24-62` — 请求去重层实现（写入日志的技术细节来源）
  - `app/src/lib/cloudbaseAuth.ts` — signInAnonymously 单例化（写入日志的技术细节来源）

  **Acceptance Criteria**:
  - [ ] `docs/CHANGELOG.md` 顶部有 v1.5.9 条目
  - [ ] `docs/dev-logs/2026-02/2026-02-11-cloud-function-optimize.md` 文件存在且内容完整
  - [ ] `grep "v1.5.9" docs/CHANGELOG.md` → 有匹配

  **Commit**: YES
  - Message: `docs: v1.5.9 云函数调用量优化变更日志`
  - Files: `docs/CHANGELOG.md`, `docs/dev-logs/2026-02/2026-02-11-cloud-function-optimize.md`

---

- [ ] 2. 提交所有未提交的代码改动

  **What to do**:
  - `git add` 以下文件：
    - `app/src/services/cloudApi.ts` — TTL 缓存层（核心优化）
    - `.sisyphus/boulder.json` — 计划状态更新
    - `.sisyphus/plans/optimize-cloud-function-calls.md` — 计划完成标记
    - `docs/CHANGELOG.md` — 在 Task 1 中已更新
    - `docs/dev-logs/2026-02/2026-02-11-storage-traffic-optimize.md` — 已有的存储优化日志更新
    - `docs/dev-logs/2026-02/2026-02-11-cloud-function-optimize.md` — Task 1 新建的日志
  - 提交时把文档和代码分开 commit（Task 1 的文档已经 commit 了），所以这里只 commit 代码：
    - `app/src/services/cloudApi.ts`
    - `.sisyphus/boulder.json`
    - `.sisyphus/plans/optimize-cloud-function-calls.md`
    - `docs/dev-logs/2026-02/2026-02-11-storage-traffic-optimize.md`（如果 Task 1 没有包含的话）

  **Must NOT do**:
  - 不提交 `.sisyphus/notepads/` 下的临时文件
  - 不修改任何代码内容，只是提交已有的改动

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`git-master`]
    - `git-master`: git 提交操作

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential — Task 2
  - **Blocks**: Task 3
  - **Blocked By**: Task 1

  **References**:
  - `git status` 输出 — 确认待提交文件列表
  - `git diff app/src/services/cloudApi.ts` — 确认 TTL 缓存改动内容

  **Acceptance Criteria**:
  - [ ] `git status` 显示 working tree clean（除 `.sisyphus/notepads/` untracked）
  - [ ] `git log --oneline -1` 包含云函数优化相关 commit message

  **Commit**: YES
  - Message: `perf(frontend): 云函数调用量优化 — TTL缓存层+请求去重`
  - Files: `app/src/services/cloudApi.ts`, `.sisyphus/boulder.json`, `.sisyphus/plans/optimize-cloud-function-calls.md`, `docs/dev-logs/2026-02/2026-02-11-storage-traffic-optimize.md`

---

- [ ] 3. 构建前端

  **What to do**:
  - 在 `app/` 目录执行 `npm run build`
  - 确认构建成功，`app/dist/` 产物生成

  **Must NOT do**:
  - 不修改任何代码
  - 不安装新依赖

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential — Task 3
  - **Blocks**: Task 4
  - **Blocked By**: Task 2

  **References**:
  - `docs/guides/deployment/deployment.md:48-56` — 构建命令和输出目录

  **Acceptance Criteria**:
  - [ ] `npm run build` 退出码 0
  - [ ] `ls app/dist/index.html` 文件存在

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Frontend build succeeds
    Tool: Bash
    Steps:
      1. cd app && npm run build
      2. Assert: exit code 0
      3. ls dist/index.html → file exists
      4. ls dist/assets/ → JS/CSS files exist
    Expected Result: Build completes without errors
  ```

  **Commit**: NO

---

- [ ] 4. MCP 部署前端到生产环境

  **What to do**:
  - **先确认环境**：使用 MCP `envQuery(action="info")` 确认当前连接的是 `cloud1-3g9mi825a3a27f25`
    - 如果不是，使用 `login(forceUpdate=true)` 切换
  - **上传静态文件**：使用 MCP `uploadFiles` 工具
    - `localPath`: `app/dist` 的绝对路径（即 `/Users/shulie/Desktop/SynologyDrive/个人/cursor/teacher-tool/app/dist`）
    - `cloudPath`: `/`
  - **验证部署**：访问生产地址确认页面加载正常

  **Must NOT do**:
  - 不部署云函数（本次优化全部是前端改动）
  - 不部署到其他环境
  - 不删除任何托管文件

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential — Task 4 (final)
  - **Blocks**: None
  - **Blocked By**: Task 3

  **References**:
  - `docs/guides/deployment/deployment.md:58-83` — MCP 部署静态网站方法
  - `docs/guides/deployment/deployment.md:157-163` — MCP 部署到错误环境的排查

  **Acceptance Criteria**:
  - [ ] MCP `envQuery` 确认环境为 `cloud1-3g9mi825a3a27f25`
  - [ ] MCP `uploadFiles` 成功完成
  - [ ] 访问 `https://cloud1-3g9mi825a3a27f25-1368265332.tcloudbaseapp.com/` 页面正常加载

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Verify deployment via browser
    Tool: Playwright (playwright skill)
    Preconditions: Deployment completed
    Steps:
      1. Navigate to: https://cloud1-3g9mi825a3a27f25-1368265332.tcloudbaseapp.com/?v=20260211
      2. Wait for: page loaded (timeout: 15s)
      3. Assert: page title or main content visible (not 404 or blank)
      4. Screenshot: .sisyphus/evidence/task-4-deploy-verify.png
    Expected Result: Production site loads successfully with latest build
    Evidence: .sisyphus/evidence/task-4-deploy-verify.png
  ```

  **Commit**: NO

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `docs: v1.5.9 云函数调用量优化变更日志` | `docs/CHANGELOG.md`, `docs/dev-logs/2026-02/2026-02-11-cloud-function-optimize.md` | grep v1.5.9 |
| 2 | `perf(frontend): 云函数调用量优化 — TTL缓存层+请求去重` | `app/src/services/cloudApi.ts`, `.sisyphus/*`, storage dev-log | git status clean |
| 3 | (no commit) | | npm run build → 0 |
| 4 | (no commit) | | 访问生产 URL |

---

## Success Criteria

### Verification Commands
```bash
grep "v1.5.9" docs/CHANGELOG.md                    # Expected: match found
ls docs/dev-logs/2026-02/2026-02-11-cloud-function-optimize.md  # Expected: exists
git status                                          # Expected: clean (除 notepads)
ls app/dist/index.html                              # Expected: exists
```

### Final Checklist
- [ ] CHANGELOG v1.5.9 条目完整
- [ ] 开发日志文件存在且内容详尽
- [ ] 所有代码已提交
- [ ] 前端构建成功
- [ ] 部署到 `cloud1-3g9mi825a3a27f25` 成功
- [ ] 生产环境页面正常加载
