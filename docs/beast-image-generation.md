# 幻兽图片生成指南

本文档说明如何使用火山引擎即梦AI生成幻兽图片。

## 概述

- **API**: 火山引擎即梦AI图片生成 4.0
- **生成脚本**: `scripts/generate-beasts/test.py`
- **输出目录**: `app/public/beasts/`
- **提示词库**: `app/public/beasts/prompts_library.md`

## 前置准备

### 1. 安装依赖

```bash
pip install volcengine
```

### 2. API凭证

在 `test.py` 中配置火山引擎的 AK/SK：

```python
ACCESS_KEY_ID = "你的AccessKeyId"
SECRET_ACCESS_KEY = "你的SecretAccessKey"
```

> 凭证获取：登录火山引擎控制台 → 访问控制 → API密钥管理

## 提示词结构

每个提示词由三部分组成：

| 部分 | 内容 | 作用 |
|------|------|------|
| 前缀 | `3D cute cartoon style, blind box toy style, C4D render, clean white background, high quality, 8k, ` | 统一风格 |
| 主体 | 具体幻兽描述 | 定义角色 |
| 后缀 | ` --no multiple views, no split screen, no text, no human` | 排除干扰 |

## 进化阶段设计规范

每个幻兽有5个进化阶段：

### 1. 蛋 (Egg)
```
One single {Beast} Egg, solo, mystical egg with {color} swirling patterns,
glowing cracks, magical energy, about to hatch, {element} essence,
baby creature shape visible inside, white background
```

### 2. 幼体 (Baby)
```
One single Baby {Beast}, solo, sitting playfully, head tilted,
extremely small and round body, big head, huge eyes, {tiny features},
very {texture}, {colors}, chibi, white background
```

### 3. 少年 (Juvenile)
```
One single Young {Beast}, solo, standing alert, curious expression,
lean athletic body, developing {features}, {growing traits},
playful but maturing, {colors}, dynamic pose, white background
```

### 4. 成年 (Adult)
```
One single Adult {Beast}, solo, powerful battle stance, fierce expression,
muscular defined body, {full features}, {element} effects,
intense aura, {colors}, battle-ready pose, white background
```

### 5. 究极 (Ultimate)
```
One single Ultimate {Beast} {Title}, solo, massive divine {beast type},
mature serene powerful expression not cute, god-like presence,
{transcendent features}, {overwhelming element effects},
god-like majestic and enlightened presence, mature and transcendent,
low angle epic shot, white background
```

## 生成步骤

### 1. 编辑 test.py

修改以下配置：

```python
# 测试用的提示词 - 从 prompts_library.md 复制
TEST_PROMPT = "One single Baby Unicorn, solo, sitting playfully..."

# 输出文件名
OUTPUT_FILENAME = "unicorn_2_baby.png"
```

### 2. 运行脚本

```bash
cd scripts/generate-beasts
python3 test.py
```

### 3. 等待结果

脚本会：
1. 提交异步任务到即梦API
2. 轮询任务状态（每2秒检查一次）
3. 下载生成的图片到 `app/public/beasts/` 目录

## 文件命名规范

```
{beast_id}_{stage_number}_{stage_name}.png
```

| 阶段 | 编号 | 示例 |
|------|------|------|
| 蛋 | 1 | unicorn_1_egg.png |
| 幼体 | 2 | unicorn_2_baby.png |
| 少年 | 3 | unicorn_3_juvenile.png |
| 成年 | 4 | unicorn_4_adult.png |
| 究极 | 5 | unicorn_5_ultimate.png |

## 幻兽ID列表

### 梦幻系 (Dreamy Series)

| 中文名 | ID |
|--------|-----|
| 独角兽 | unicorn |
| 精灵龙 | fairy_dragon |
| 月兔 | moon_rabbit |
| 凤凰 | phoenix |
| 水精灵 | water_spirit |
| 花仙子 | flower_fairy |
| 星光鹿 | star_deer |
| 云羊 | cloud_sheep |
| 彩虹蛇 | rainbow_snake |
| 梦境蝶 | dream_butterfly |
| 晨露狐 | dawn_fox |
| 珍珠龟 | pearl_turtle |
| 糖果熊 | candy_bear |
| 魔法猫 | magic_cat |
| 水晶蜗牛 | crystal_snail |

### 热血系 (Hot-Blooded Series)

| 中文名 | ID |
|--------|-----|
| 霸王龙 | trex |
| 雷狼 | thunder_wolf |
| 机甲龙 | mecha_dragon |
| 火焰狮 | flame_lion |
| 暗影豹 | shadow_leopard |
| 地狱犬 | cerberus |
| 狮鹫 | griffin |
| 深海巨鲨 | mecha_shark |
| 玄武 | rock_tortoise |
| 剑齿虎 | saber_tooth |
| 熔岩怪 | lava_golem |
| 机械甲虫 | mecha_beetle |
| 幽灵龙 | ghost_dragon |
| 冰原猛犸 | ice_mammoth |
| 功夫熊猫 | kungfu_panda |

## API 参数说明

```python
form = {
    "req_key": "jimeng_t2i_v40",  # 即梦4.0服务标识
    "prompt": full_prompt,         # 完整提示词
    "width": 1024,                 # 图片宽度
    "height": 1024,                # 图片高度
    "scale": 0.5,                  # 文本影响程度 [0,1]
    "force_single": True,          # 强制单图
}
```

## 常见问题

### Q: 生成超时怎么办？
A: 脚本最多等待3分钟（90次×2秒），如果超时可以重新运行。

### Q: 图片风格不一致怎么办？
A: 确保使用统一的前缀和后缀，主体描述中避免风格相关的词语。

### Q: 如何添加新幻兽？
A:
1. 在 `prompts_library.md` 中添加5个阶段的提示词
2. 按照命名规范生成图片
3. 更新 `app/src/data/beasts.ts` 中的数据

## 批量生成建议

由于API有调用频率限制，建议：
- 每次生成间隔至少5秒
- 单次会话不超过20张图片
- 保存所有成功的提示词到 `prompts_final.md`

## 相关文件

| 文件 | 说明 |
|------|------|
| [test.py](../scripts/generate-beasts/test.py) | 生成脚本 |
| [prompts_library.md](../app/public/beasts/prompts_library.md) | 提示词库 |
| [prompts_final.md](../app/public/beasts/prompts_final.md) | 最终使用的提示词 |
| [beasts.ts](../app/src/data/beasts.ts) | 幻兽数据定义 |
