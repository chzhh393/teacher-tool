# 幻兽系统

> 30 只幻兽分为两大系列，通过积分驱动 5 阶段进化与 10 级成长，达到满级获得徽章并循环。

## 功能概述

### 幻兽阵容

共 **30 只幻兽**，分为两大系列：

| 系列 | 风格 | 数量 |
|------|------|------|
| 梦幻系列 | 柔和、可爱、梦幻风格 | 15 只 |
| 热血系列 | 酷炫、力量、热血风格 | 15 只 |

每个学生可选择一只幻兽作为自己的伙伴。

### 进化阶段

幻兽拥有 **5 个进化阶段**，随等级提升自动进化：

```
🥚 蛋 (egg) → 👶 幼体 (baby) → 🧒 少年 (juvenile) → 🧑 成年 (adult) → ⭐ 究极 (ultimate)
```

每个阶段对应不同的外观图片。进化时触发全屏庆祝动画：白色闪光 → 新形态幻兽居中放大（带发光环和星星粒子）→ 「已升级!」文字提示 → 自动淡出。检测逻辑为客户端前后对比（加分前快照等级，刷新后对比进化阶段），仅加分时触发。

### 等级系统

- 共 **10 个等级**，每个等级需要达到对应的积分阈值
- 积分阈值可由教师自定义配置
- 等级与进化阶段的对应关系由阈值配置决定

### 徽章机制

- 学生达到 **满级（10 级）** 时，获得当前幻兽的 **徽章**
- 获得徽章后，等级重置，可选择新的幻兽重新培养
- 徽章永久保留，在荣誉榜中展示

## 关键文件

| 文件 | 说明 |
|------|------|
| `app/src/data/beasts.ts` | 30 只幻兽的完整数据定义 |
| `app/src/components/EvolutionCelebration.tsx` | 进化全屏庆祝动画组件（framer-motion） |
| `app/src/components/EvolutionStage.tsx` | 进化阶段展示组件 |
| `app/src/components/BeastPickerModal.tsx` | 幻兽选择弹窗 |
| `app/src/components/PetSelection.tsx` | 宠物选择组件 |
| `app/src/utils/evolution.ts` | 共享工具函数（getEvolutionStage、stageNames） |
| `app/src/stores/beastStore.ts` | 幻兽状态管理（Zustand） |

### 图片资源

幻兽图片的生成规范和提示词详见 [beast-image-generation.md](../../beast-image-generation.md)。

## 云函数 / API

幻兽系统的数据主要存储在学生记录中（`TT_students` 集合的 `beastId`、`level`、`badges` 字段），等级变更由评分云函数在积分更新时联动计算。

| 关联云函数 | 说明 |
|------------|------|
| `TT_score_batch` | 评分时自动计算等级变化和进化 |
| `TT_student_upsert` | 更新学生的幻兽选择 |

## 数据结构

### 幻兽定义（beasts.ts）

```typescript
{
  id: string          // 幻兽唯一标识
  name: string        // 幻兽名称
  series: 'dreamy' | 'hot-blooded'  // 所属系列
  stages: {           // 5 个进化阶段的图片路径
    egg: string
    baby: string
    juvenile: string
    adult: string
    ultimate: string
  }
}
```

### 学生幻兽数据（TT_students）

| 字段 | 类型 | 说明 |
|------|------|------|
| `beastId` | string | 当前幻兽 ID |
| `level` | number | 当前等级（1-10） |
| `badges` | array | 已获得的徽章列表 `[{ beastId, earnedAt }]` |

## 注意事项

- 学生未选择幻兽时，系统会引导进行首次选择
- 进化阶段的切换由前端根据等级自动计算，无需后端参与
- 等级阈值配置存储在班级设置中，不同班级可设置不同阈值
- 获得徽章后的幻兽重选不影响已有徽章记录
