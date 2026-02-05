# 班级积分管理系统 - 产品需求文档 (PRD)

> 版本：v1.0  
> 最后更新：2026-02-03  
> 状态：需求讨论中

---

## 一、项目概述

### 1.1 产品定位
一款游戏化的班级积分管理系统，将传统的学生行为评价转化为"幻兽养成"游戏，通过虚拟宠物的成长激励学生养成良好习惯。

### 1.2 核心理念
- **积分 = 食物**：学生通过良好表现获得积分，积分用于喂养幻兽
- **幻兽成长**：幻兽随积分增加而升级进化，满级获得成就徽章
- **积分消费**：积分可在"小卖部"兑换奖励，形成激励闭环

### 1.3 目标用户
| 角色 | 使用场景 | 本版本支持 |
|------|----------|------------|
| 老师 | 电脑 Web 端操作，管理班级、加减分 | ✅ |
| 学生 | 教室大屏/希沃触摸屏查看自己的幻兽 | ✅ |
| 家长 | 查看孩子的成长进度 | ❌ 后续版本 |

### 1.4 使用设备
- **老师端**：电脑浏览器（Chrome/Edge/Safari）
- **展示端**：教室投影、希沃触摸教学机

---

## 二、幻兽宠物系统 (Fantasy Beast System)

### 2.1 幻兽种类
采用**多元化幻兽方案**，共计 **30种** 幻兽，分为"梦幻系"和"热血系"两大类，满足不同学生的审美偏好。

#### 分类清单

**梦幻系（女生推荐，15种）**
> 风格关键词：可爱、唯美、魔法、治愈、马卡龙色

| 序号 | 中文名 | 英文名 | 特点 |
|------|--------|--------|------|
| 1 | 独角兽 | Unicorn | 梦幻粉紫色，螺旋角，彩虹鬃毛 |
| 2 | 仙女龙 | Fairy Dragon | 蝴蝶翅膀，花朵环绕，粉蓝配色 |
| 3 | 星空猫 | Starry Cat | 深紫夜空色，带翅膀，身上有星座图案 |
| 4 | 月兔 | Moon Rabbit | 坐在月亮上，长耳朵，发光围巾 |
| 5 | 彩虹飞马 | Pegasus | 洁白身体，由于彩虹羽翼 |
| 6 | 九色鹿 | Nine-colored Deer | 东方神兽，优雅灵动，九色光环 |
| 7 | 冰雪狐 | Snow Fox | 雪白皮毛，冰晶尾巴，高冷可爱 |
| 8 | 人鱼公主 | Mermaid | 贝壳装饰，珍珠光泽，海底特效 |
| 9 | 花仙子 | Flower Spirit | 从花朵中诞生，植物系特效 |
| 10 | 糖果熊 | Candy Bear | 软糖质感，周围飘着糖果 |
| 11 | 治愈羊 | Angel Sheep | 天使光环，云朵般的羊毛 |
| 12 | 宝石鸟 | Gem Bird | 羽毛像宝石一样闪耀 |
| 13 | 幸运龙 | Clover Dragon | 四叶草元素，带来好运 |
| 14 | 梦幻水母 | Dream Jellyfish | 透明飘逸，霓虹光效，浮空 |
| 15 | 极光鹿 | Aurora Elk | 角上挂着极光，神秘优雅 |

**热血系（男生推荐，15种）**
> 风格关键词：帅气、力量、机械、元素、高饱和色

| 序号 | 中文名 | 英文名 | 特点 |
|------|--------|--------|------|
| 16 | 霸王龙 | T-Rex | 经典的绿色霸主，强壮威武 |
| 17 | 雷狼 | Thunder Wolf | 附带闪电特效，刺猬头，酷炫蓝色 |
| 18 | 机甲龙 | Mecha Dragon | 机械装甲，发光核心，未来感 |
| 19 | 火焰狮 | Flame Lion | 鬃毛是燃烧的火焰，霸气侧漏 |
| 20 | 暗影豹 | Shadow Leopard | 若隐若现，紫色暗影，忍者风格 |
| 21 | 地狱犬 | Cerberus | 三个头（萌版），带火焰项圈 |
| 22 | 狮鹫 | Griffin | 鹰头狮身，金色羽毛，守卫者 |
| 23 | 深海巨鲨 | Mecha Shark | 机械改造鲨鱼，背负鱼雷（玩具版） |
| 24 | 玄武 | Rock Tortoise | 岩石背甲，稳重厚实，防御力满点 |
| 25 | 剑齿虎 | Saber Tooth | 巨大的牙齿，冰河时代风格 |
| 26 | 熔岩怪 | Lava Golem |石头与岩浆组成，憨厚有力 |
| 27 | 机械甲虫 | Mecha Beetle | 金属光泽，变形机甲风 |
| 28 | 幽灵龙 | Ghost Dragon | 半透明身体，幽悠鬼火，帅气不死族 |
| 29 | 冰原猛马 | Ice Mammoth | 巨大象牙，寒冰盔甲 |
| 30 | 功夫熊猫 | Kungfu Panda | 武道服，手持竹棍，中国风 |

### 2.2 进化阶段
每只幻兽有 **5个成长阶段**（新增"完全体"）：

```
🥚 幻兽蛋（EGG）
    ↓ 领养选择（依据阵营不同而不同）
👶 幼年期 (Baby) Lv.1-2
    ↓ 萌系/Q版，刚破壳，甚至还带着蛋壳
� 少年期 (Juvenile) Lv.3-5
    ↓ 特征开始显现，体型变大，动作变多
� 成熟期 (Adult) Lv.6-8
    ↓ 外形帅气/美丽，具备完整特征
👑 完全体 (Ultimate) Lv.9-10
    ↓ 满级形态，增加华丽特效/光环/拖尾/装甲升级
```

### 2.3 等级系统
- **总计 10 级**
- 每级所需积分（食物）**可由老师自定义**
- 默认配置示例：

| 等级 | 累计所需积分 | 本级所需 | 阶段 |
|------|-------------|---------|------|
| Lv.1 | 0 | - | 幼年期 |
| Lv.2 | 5 | 5 | 幼年期 |
| Lv.3 | 12 | 7 | 少年期 |
| Lv.4 | 22 | 10 | 少年期 |
| Lv.5 | 35 | 13 | 少年期 |
| Lv.6 | 50 | 15 | 成熟期 |
| Lv.7 | 70 | 20 | 成熟期 |
| Lv.8 | 95 | 25 | 成熟期 |
| Lv.9 | 125 | 30 | 完全体 |
| Lv.10 | 160 | 35 | 完全体 (MAX) |

### 2.4 徽章系统
- 每次**满级（Lv.10）养成成功**，获得一枚**对应幻兽的徽章**
- 徽章永久保存在学生的收藏中
- 满级后可选择**重新孵化新幻兽**（可换阵营/种类），开始新一轮养成
- **全图鉴成就**：收集满同一系别所有徽章有额外奖励

### 2.5 装饰系统（v1.5）

#### 装饰品类型
| 类型 | 位置 | 举例 |
|------|------|------|
| 头饰 | 头部 | 皇冠、耳机、光环、蝴蝶结 |
| 面饰 | 面部 | 墨镜、眼罩、面纹 |
| 颈饰/背饰 | 身体 | 围巾、小书包、翅膀（通用）、披风 |
| 背景 | 卡片背景 | 魔法森林、赛博城市、海底世界、浩瀚星空 |
| 特效 | 整体 | 飘落樱花、雷电环绕、气泡上升 |

#### 获取方式
- **积分小卖部购买**
- **升级奖励**
- **成就解锁**

### 2.6 互动系统（v2.0）

#### 互动反馈
- **点击反馈**：点击幻兽会播放动作和音效（如独角兽嘶鸣、霸王龙吼叫）
- **状态反馈**：
  - **开心**：近期获得积分（跳跃、转圈）
  - **饥饿**：长时间无积分（垂头丧气、肚子叫图标）
  - **睡觉**：非上课时间/晚上（趴着睡觉气泡）

#### 喂食展示
- 获得积分时，屏幕出现因为积分类型不同的"食物"（如：作业优秀=鸡腿，帮助同学=糖果）飞入幻兽嘴里
- 幻兽做出进食动作并冒爱心

### 2.7 美术资源生成指南 (AI Prompts)

为确保美术风格统一，请使用以下提示词模板进行 AI 生图（推荐 Midjourney / Stable Diffusion）：

#### 通用风格关键词 (Base Prompt)
> `3D cute cartoon style, blind box toy style, C4D render, oc render, soft lighting, clean white background, high quality, 8k, isometric view`

#### 各阶段特定描述 (Stage Prompts)

**1. 幻兽蛋 (Egg)**
> `[幻兽名/属性] egg, pattern related to [Element], simple, cracked texture if hatching`
> * 示例（独角兽蛋）：`Unicorn egg, pastel pink and purple with soft spiral patterns, sparkling, magical aura`

**2. 幼年期 (Baby) - Lv.1-2**
> `Baby [幻兽名], extremely small and round body, big head, large sparkling eyes, tiny features, sitting playfully, very soft fur/texture, simple and innocent`
> * 关键词：`chibi, kawaii, innocent, small`

**3. 少年期 (Juvenile) - Lv.3-5**
> `Juvenile [幻兽名], medium size, standing on all four legs, slightly awkward teenage proportions yet cute, features starting to grow (e.g., small wings/horns), playful expression`
> * 关键词：`growing, energetic, playful`

**4. 成熟期 (Adult) - Lv.6-8**
> `Adult [幻兽名], full grown but cute style, elegant/strong standing pose, distinct features (e.g., full mane, long tail), beautiful/handsome, graceful and composed`
> * 关键词：`elegant, strong, confident`

**5. 完全体 (Ultimate) - Lv.9-10**
> `Ultimate [幻兽名] (God Form), MASSIVE and MAJESTIC, dynamic angle, wearing ornate armor/crown, glowing magical aura, intense elemental effects (fire/ice/star), looking powerful and divine, camera low angle to emphasize size`
> * 关键词：`majestic, divine, glowing, effects, armor, crown`


---

## 三、积分系统

### 3.1 积分概念
- **积分 = 食物（🍖）**
- 积分用于：①喂养恐龙升级 ②小卖部兑换奖励
- 积分分为两种用途：
  - **养成积分**：累计用于升级，不可消耗
  - **可用积分**：可在小卖部消费

### 3.2 加分规则（预设，可自定义）

| 项目 | 默认分值 | 图标 |
|------|---------|------|
| 早读打卡 | +5 | 📖 |
| 答对问题 | +3 | 💡 |
| 作业优秀 | +10 | ⭐ |
| 作业工整 | +5 | 📝 |
| 完成背诵 | +8 | 🎤 |
| 积极举手 | +5 | ✋ |
| 帮助同学 | +3 | 🤝 |
| 主动打扫 | +5 | 🧹 |
| 考试进步 | +15 | 📈 |
| 获得表扬 | +10 | 🏆 |

### 3.3 扣分规则（预设，可自定义）

| 项目 | 默认分值 | 图标 |
|------|---------|------|
| 迟到 | -3 | ⏰ |
| 早退 | -3 | 🚪 |
| 上课走神 | -2 | 😴 |
| 作业未交 | -5 | ❌ |
| 打扰课堂 | -3 | 🔇 |
| 不遵守纪律 | -5 | ⚠️ |

### 3.4 积分操作功能
- **单个加减分**：点击学生卡片，选择加/扣分项
- **批量加减分**：选择多个学生，统一加减分
- **全班加分**：一键全班加分（自动跳过满级学生）
- **撤回操作**：支持撤回最近一次操作
- **首字母搜索**：输入拼音首字母快速定位（如"cd"→"迟到"）

---

## 四、小卖部（积分兑换商城）

### 4.1 功能概述
学生用**可用积分**兑换奖励，奖励由老师自定义配置。

### 4.2 预设奖励（可自定义）

**实物类**
| 奖励名称 | 所需积分 | 说明 |
|---------|---------|------|
| 铅笔 | 10 | 一支铅笔 |
| 钢笔 | 30 | 一支钢笔 |
| 作业本 | 15 | 一本作业本 |
| 小零食 | 20 | 老师准备的小零食 |
| 涂改液 | 15 | 一瓶涂改液 |

**特权类**
| 奖励名称 | 所需积分 | 说明 |
|---------|---------|------|
| 免作业卡 | 50 | 免写一次作业 |
| 前排座位券 | 30 | 选择一周的座位 |
| 选同桌券 | 40 | 选择下周的同桌 |
| 当一天班长 | 60 | 体验一天班长 |
| 小组长体验 | 40 | 当一周小组长 |
| 电影时间 | 80 | 班级看电影时选片权 |

### 4.3 商品管理
- 老师可**添加/编辑/删除**商品
- 可设置**库存数量**或**每人限购次数**
- 兑换记录可追溯

---

## 五、光荣榜

### 5.1 排名规则
- 根据**收集的徽章数量**排名
- 徽章数相同时，按**当前等级**排序
- 等级相同时，按**当前积分**排序

### 5.2 展示内容
- 排名（前三名金银铜特殊样式）
- 学生姓名
- 恐龙名称 + 等级
- 徽章数量
- 当前养成进度

---

## 六、成长记录

### 6.1 记录内容
- 每一次加减分操作
- 操作时间（精确到分钟）
- 操作人（老师）
- 操作内容（如："+10 作业优秀"）
- 撤回记录

### 6.2 管理功能
- 按日期分组展示
- 支持翻页浏览
- **导出 CSV**：方便存档或分析
- **清理记录**：开启新学期时清空

---

## 七、班级管理

### 7.1 多班级支持
- 支持创建**多个班级**
- 每个班级数据独立
- 可快速切换当前班级

### 7.2 学生管理
- **添加学生**：手动输入姓名
- **批量导入**：支持批量粘贴名单
- **编辑学生**：修改姓名
- **删除学生**：移除学生（需二次确认）
- **排序**：支持手动调整顺序
- **一键分配幻兽**：随机为全班分配幻兽

### 7.3 数据同步
- 数据存储在**腾讯云云开发**
- 支持多设备数据同步
- 自动保存，防止数据丢失

---

## 八、老师设置

### 8.1 基础设置
| 设置项 | 说明 |
|--------|------|
| 系统名称 | 自定义显示名称（如"幻兽学院"） |
| 班级名称 | 当前班级的名称 |
| 主题颜色 | 10种预设颜色可选 |

### 8.2 等级设置
- 自定义每级所需的积分阈值
- 最高等级固定为 Lv.10

### 8.3 积分规则设置
- 添加/编辑/删除 加分项
- 添加/编辑/删除 扣分项
- 调整默认分值
- 调整排序顺序

---

## 九、界面设计要求

### 9.1 整体风格
- **游戏化视觉**：活泼、明亮、有趣
- **卡片式布局**：每个学生一张卡片
- **柔和配色**：马卡龙色系（粉、紫、黄、绿）
- **幻兽形象**：Q版萌系风格，3D或2D插画均可

### 9.2 学生卡片包含
- 幻兽形象
- 学生姓名
- 幻兽名称
- 当前等级（Lv.X）
- 本级进度条
- 当前积分/还差多少升级
- 满级标识（金色"完全体"标签）

### 9.3 动效要求
- **升级动效**：升级时有庆祝特效（礼花、星星）
- **喂食动效**：加分时幻兽有进食反应
- **满级特效**：完全体形态有光环/闪烁效果

### 9.4 响应式设计
- 适配电脑浏览器（主要操作端）
- 适配大屏投影/希沃触摸屏（展示端）

---

## 十、技术方案

### 10.1 前端技术栈
- **框架**：React + Vite
- **路由**：React Router v6
- **UI组件**：Tailwind CSS + Headless UI（或 shadcn/ui）
- **状态管理**：Zustand
- **动效**：Framer Motion（用于装饰/互动动画）
- **部署**：腾讯云开发 - 静态网站托管

### 10.2 后端技术栈
- **平台**：腾讯云云开发
- **云函数**：处理 API 接口（增删改查、积分操作等）
- **云数据库**：存储班级、学生、积分、兑换记录等数据
- **云存储**：存储幻兽图片资源（30种 × 5阶段 = 150张图）

### 10.3 命名规范（TT 前缀）

#### 云函数命名
| 功能 | 云函数名称 |
|------|------------|
| 获取班级概览 | `TT_class_get` |
| 获取学生列表 | `TT_student_list` |
| 添加/更新学生 | `TT_student_upsert` |
| 删除学生 | `TT_student_delete` |
| 批量加分/扣分 | `TT_score_batch` |
| 撤回操作 | `TT_score_revoke` |
| 获取成长记录 | `TT_record_list` |
| 导出成长记录 | `TT_record_export` |
| 获取小卖部商品 | `TT_shop_list` |
| 商品兑换 | `TT_shop_redeem` |
| 兑换记录 | `TT_redeem_list` |
| 获取光荣榜 | `TT_honors_list` |
| 保存班级设置 | `TT_settings_save` |

#### 数据库集合命名
| 集合用途 | 集合名称 |
|----------|----------|
| 班级 | `TT_classes` |
| 学生 | `TT_students` |
| 积分记录 | `TT_score_records` |
| 兑换记录 | `TT_redeem_records` |
| 商品 | `TT_shop_items` |
| 配置 | `TT_settings` |
| 装饰品 | `TT_decorations` |
| 成就 | `TT_achievements` |
| 恐龙数据 | `TT_dinosaurs` |

### 10.4 架构图
```
┌─────────────────────────────────────────────┐
│  腾讯云开发                                   │
│                                             │
│  ┌─────────────┐      ┌─────────────┐       │
│  │ 静态网站托管  │ ←──→ │   云函数     │       │
│  │ Next.js     │      │  (API)     │       │
│  │ 静态导出     │      │            │       │
│  └─────────────┘      └──────┬──────┘       │
│                              │              │
│                              ▼              │
│  ┌─────────────┐      ┌─────────────┐       │
│  │   云存储     │      │   云数据库   │       │
│  │ (恐龙图片)   │      │ (业务数据)  │       │
│  └─────────────┘      └─────────────┘       │
│                                             │
└─────────────────────────────────────────────┘
```

### 10.5 美术资源
- **风格**：3D 萌系
- **生成方式**：AI 生成（Midjourney / DALL-E / Stable Diffusion）
- **数量**：30种幻兽 × 5个进化阶段 = 150张图片
- **格式**：PNG（透明背景），建议尺寸 512×512 或 1024×1024

### 10.6 数据模型

```typescript
// ==================== 核心模型 (v1.0) ====================

// 班级
interface Class {
  id: string
  name: string              // 班级名称
  teacherId: string         // 老师ID（预留，v1.0可为空）
  settings: ClassSettings
  createdAt: Date
  updatedAt: Date
}

// 班级设置
interface ClassSettings {
  systemName: string        // 系统名称，如"恐龙乐园"
  themeColor: string        // 主题颜色
  levelThresholds: number[] // 等级阈值 [0, 5, 12, 22, ...]
  scoreRules: ScoreRule[]   // 积分规则
  shopItems: ShopItem[]     // 商店商品
}

// 积分规则
interface ScoreRule {
  id: string
  name: string              // 规则名称，如"作业优秀"
  score: number             // 分值，正数加分，负数扣分
  icon: string              // 图标标识
  pinyin: string            // 拼音首字母，用于快捷搜索
  order: number             // 排序顺序
}

// 商店商品
interface ShopItem {
  id: string
  name: string              // 商品名称
  description: string       // 商品描述
  cost: number              // 所需积分
  icon: string              // 图标
  type: 'physical' | 'privilege' | 'decoration'  // 实物/特权/装饰品
  decorationId?: string     // 如果是装饰品，关联装饰品ID
  stock: number             // 库存，-1表示无限
  limitPerStudent: number   // 每人限购，-1表示无限
  order: number             // 排序顺序
}

// 学生
interface Student {
  id: string
  classId: string
  name: string              // 姓名
  
  // 幻兽相关
  beastId: string           // 当前幻兽ID
  beastName: string         // 幻兽中文名（冗余，方便展示）
  
  // 积分相关
  totalScore: number        // 累计积分（用于升级，只增不减）
  availableScore: number    // 可用积分（用于兑换，可消费）
  level: number             // 当前等级 1-10
  
  // 成就相关
  badges: number            // 徽章数量
  completedBeasts: string[]     // 已养成的幻兽ID列表
  
  // 装饰相关 (v1.5)
  equippedDecorations: EquippedDecoration  // 当前装扮
  ownedDecorations: string[]  // 拥有的装饰品ID列表
  
  // 互动相关 (v2.0)
  lastScoreTime: Date       // 最后一次获得积分时间（用于心情计算）
  
  // 元数据
  order: number             // 排序顺序
  createdAt: Date
  updatedAt: Date
}

// 当前装扮
interface EquippedDecoration {
  headwear?: string         // 头饰ID
  eyewear?: string          // 眼镜ID
  neckwear?: string         // 颈饰ID
  background?: string       // 背景ID
  effect?: string           // 特效ID
}

// 积分记录
interface ScoreRecord {
  id: string
  classId: string
  studentId: string
  studentName: string       // 冗余，方便展示
  type: 'add' | 'subtract' | 'revoke'
  ruleId: string            // 关联的规则ID
  ruleName: string          // 冗余，方便展示
  score: number             // 变动分数
  note?: string             // 备注（可选）
  createdAt: Date
}

// 兑换记录
interface RedeemRecord {
  id: string
  classId: string
  studentId: string
  studentName: string       // 冗余
  itemId: string            // 商品ID
  itemName: string          // 冗余
  cost: number              // 消耗积分
  status: 'pending' | 'completed'  // 待核销/已完成
  completedAt?: Date        // 核销时间
  createdAt: Date
}

// ==================== 装饰系统 (v1.5) ====================

// 装饰品定义
interface Decoration {
  id: string
  name: string              // 名称
  type: 'headwear' | 'eyewear' | 'neckwear' | 'background' | 'effect'
  rarity: 'common' | 'rare' | 'epic' | 'legendary'  // 稀有度
  imageUrl: string          // 图片URL
  
  // 定位信息（用于图层叠加）
  anchor: {
    x: number               // 锚点X (0-100%)
    y: number               // 锚点Y (0-100%)
  }
  scale: number             // 缩放比例
  zIndex: number            // 层级
  
  // 获取方式
  obtainMethod: 'shop' | 'level' | 'achievement' | 'graduation'
  obtainCondition?: {
    type: 'level' | 'achievement' | 'graduation'
    value: number | string  // 等级数值 或 成就ID
  }
}

// ==================== 成就系统 (v2.0 预留) ====================

// 成就定义
interface Achievement {
  id: string
  name: string              // 成就名称
  description: string       // 描述
  icon: string              // 图标
  condition: {
    type: 'consecutive_days' | 'total_score' | 'level_reach' | 'dinosaur_count'
    value: number
  }
  reward: {
    type: 'decoration' | 'badge' | 'title'
    itemId: string
  }
}

// ==================== 幻兽数据 (静态配置) ====================

// 幻兽定义
interface Beast {
  id: string                // 唯一标识，如 "unicorn"
  name: string              // 中文名
  englishName: string       // 英文名
  series: 'dreamy' | 'hot-blooded'  // 系列
  description: string       // 简介
  
  // 各阶段图片
  images: {
    egg: string             // 蛋
    baby: string            // 幼年期 Lv.1-2
    juvenile: string        // 少年期 Lv.3-5
    adult: string           // 成熟期 Lv.6-8
    ultimate: string        // 完全体 Lv.9-10
  }
}
```

---

## 十一、版本规划

### v1.0 - 核心功能版
> 目标：跑通完整的养成+积分+兑换闭环

| 模块 | 功能点 |
|------|--------|
| 幻兽养成 | 30种幻兽、5阶段进化、10级成长、徽章系统 |
| 积分系统 | 加减分规则、单个/批量操作、撤回、首字母搜索 |
| 小卖部 | 实物+特权奖励、积分兑换、核销管理 |
| 光荣榜 | 徽章排名、等级排名 |
| 成长记录 | 操作日志、导出CSV、清理 |
| 班级管理 | 多班级、学生增删改、批量导入、幻兽分配 |
| 老师设置 | 系统名称、主题颜色、等级阈值、规则配置 |
| 数据存储 | 腾讯云云开发（云函数+云数据库） |

### v1.5 - 装饰系统版
> 目标：增加个性化和收集乐趣

| 模块 | 功能点 |
|------|--------|
| 装饰品 | 头饰、眼镜、颈饰、背景、特效 |
| 获取方式 | 积分购买、升级解锁、成就奖励、满级奖励 |
| 装扮功能 | 学生可自由搭配已拥有的装饰品 |
| 稀有度 | 普通/稀有/史诗/传说，不同边框颜色 |
| 图层系统 | 恐龙+装饰品的叠加展示 |

### v2.0 - 互动升级版
> 目标：增强趣味性和家长参与

| 模块 | 功能点 |
|------|--------|
| 点击互动 | 点击恐龙有动作反馈 |
| 心情系统 | 根据积分获取频率显示不同心情 |
| 喂食动画 | 加分时的喂食动效 |
| 成就系统 | 连续打卡、累计积分等成就 |
| 幻兽图鉴 | 收集展示已养成的幻兽 |
| 家长端 | 小程序/H5，查看孩子进度 |
| 成长报告 | 每周自动生成，分享到家长群 |

### v3.0 - 社交竞技版（远期）
> 目标：班级间互动，更多玩法

| 模块 | 功能点 |
|------|--------|
| 班级守护神 | 全班目标达成解锁班级神兽 |
| 班级PK | 多班级积分竞赛 |
| 幻兽对战 | 趣味小游戏（可选） |
| 老师登录 | 账号体系，多端同步 |

---

## 十二、待确认事项

- [x] 美术风格最终确认 → **3D 萌系**
- [x] 幻兽图片资源来源 → **AI 生成**
- [x] 前端框架 → **React + Vite**
- [x] 部署方式 → **腾讯云开发静态网站托管**
- [x] 装饰/互动系统 → **v1.5/v2.0 实现，v1.0 预留数据结构**
- [ ] 腾讯云云开发配置信息（环境ID等）
- [ ] 老师登录系统 → v1.0 暂不需要，v3.0 加入
- [ ] 域名配置

---

## 附录

### A. 参考产品
- 小红书"全班养宠物"案例（见 `/cankao` 文件夹）

### B. 竞品特点总结
- 卡片式布局，每个学生独立展示
- 宠物升级有明确的进度反馈
- 积分操作支持首字母快捷搜索
- 小卖部提供实物+特权两类奖励
- 撤回功能防止误操作
- 数据可导出CSV

---

## 交互流程参考（对齐“班级宠物园_使用教学”）

### 1. 初始配置流程
1. 进入设置页 → 修改系统名称与班级名称
2. 学生管理 → 支持单个添加 / 批量粘贴名单（自动去重）
3. 规则配置 → 自定义加分 / 扣分项（名称、图标、分值）
4. 成长设置 → 配置 10 级成长阈值（累计食物数）

### 2. 宠物领养与养成
1. 领养方式：
   - 老师在设置页“一键分配恐龙”
   - 学生在主界面点击“蛋”自选恐龙
2. 日常加减分：点击学生卡片 → 选择加/扣分项
3. 升级与毕业：
   - 达到阶段阈值自动升级
   - 达到满级（Lv.10）进入毕业流程 → 获得徽章
   - 毕业后可重置为“蛋”，循环养成

### 3. 日常运维操作
1. 搜索学生：支持模糊搜索
2. 批量模式：多选学生统一加/扣分
3. 撤回机制：
   - 底部提示条快速撤回
   - 进入“撤回模式”点击卡片撤销最后一次操作
4. 多班级管理：顶部班级名切换 / 新建 / 重命名 / 删除

### 4. 奖励与统计
1. 小卖部：商品列表 → 兑换 → 兑换记录
2. 光荣榜：按徽章数/等级/积分排序
3. 成长记录：操作历史流水 + 导出 CSV
