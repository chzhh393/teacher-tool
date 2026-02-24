# 2026-02-12 设置覆盖 Bug 修复

## 本日目标

修复用户反馈的"自定义积分规则被重置为默认"问题。

## 遇到的问题

### 现象

用户 ivy828（冬至班）反馈：昨天自定义的积分规则，今天打开变回了默认规则。进一步排查发现 chzhh333 的 405 班和 3年3班也受影响。

### 根因分析

`Home.tsx` 的 `refresh()` 中有一段防御性写入逻辑：

```typescript
// 旧代码（有 bug）
const settingsResult = await CloudApi.settingsGet({ classId: effectiveId })
if (!settingsResult.settings?.scoreRules?.length) {
  const defaults = getDefaultSettings()
  await CloudApi.settingsSave({ classId: effectiveId, settings: defaults })
  setRules(defaults.scoreRules)
} else {
  setRules(settingsResult.settings.scoreRules)
}
```

当 `settingsGet` 返回的 `scoreRules` 为空或 `null` 时，Home 页面会**主动写入默认设置**，覆盖用户已保存的自定义规则。

这个逻辑在 v1.5.9 数据库请求优化中被引入，本意是"远端没有设置时用默认填充"，但实际上：
- 用户可能删除了所有规则（合法操作）
- `settingsGet` 可能因网络/缓存原因返回空

**Home 页面作为展示页，不应有写数据库的行为。**

### 受影响数据

| 用户 | 班级 | settings 被覆盖时间 |
|------|------|-------------------|
| ivy828 | 冬至班 | 2026-02-12 12:58:36 |
| chzhh333 | 405 | 2026-02-10 22:57:06 |
| chzhh333 | 3年3班 | 2026-02-12 13:10:54 |

## 解决方案

### 修复 1：Home.tsx 改为纯读取（不再写数据库）

移除 `settingsSave` 调用，简化为：

```typescript
const settingsResult = await CloudApi.settingsGet({ classId: effectiveId })
setRules(settingsResult.settings?.scoreRules || [])
```

Home 页面只负责读取和展示，不管远端返回什么都原样展示。

同时移除了加分后冗余的 `settingsGet` 调用（原 270-283 行），因为 `refresh()` 已经包含了 settings 读取。

### 修复 2：新建班级时写入默认设置

排查 `Settings.tsx` 新建班级流程，发现只有"从已有班级复制"模板会写入设置，**默认模板不写入设置和商品**。这意味着用默认模板创建的班级在数据库中没有 settings 记录。

修复：新建班级时，无论选择哪种模板都写入初始数据：

```typescript
if (templateSource === "copy" && sourceClassId) {
  // 从已有班级复制设置和商品
  // ...（原有逻辑不变）
} else {
  // 默认模板：写入默认设置和商品
  await Promise.all([
    CloudApi.settingsSave({ classId: newClassId, settings: getDefaultSettings() }),
    CloudApi.shopSave({ classId: newClassId, items: getDefaultShopItems() }),
  ])
}
```

### 职责分离原则

| 场景 | 负责写入 | 负责读取 |
|------|---------|---------|
| 新建班级初始化设置 | Settings.tsx（创建班级时） | - |
| 用户修改设置 | Settings.tsx（保存按钮） | - |
| 首页展示积分规则 | - | Home.tsx（纯读取） |

## 完成内容

1. Home.tsx 移除 `settingsSave` 调用，改为纯读取
2. Home.tsx 移除加分后冗余的 `settingsGet`
3. Home.tsx 移除不再需要的 `getDefaultSettings` 导入
4. Settings.tsx 新建班级默认模板时写入默认设置和商品
5. 前端构建通过，已部署

## 相关文件

| 文件 | 改动 |
|------|------|
| `app/src/routes/Home.tsx` | 移除 settingsSave、冗余 settingsGet、getDefaultSettings 导入 |
| `app/src/routes/Settings.tsx` | 新建班级默认模板写入默认设置和商品 |
