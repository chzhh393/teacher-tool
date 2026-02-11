# 2026-02-11 存储流量优化

## 背景

CloudBase 个人版环境 `cloud1-3g9mi825a3a27f25` 存储流量已超额：

| 指标 | 数值 | 状态 |
|------|------|------|
| 调用次数 | 13.54万 / 20万 | 正常 |
| 存储流量 | 6.25GB | 已超额，按量计费中 |

## 问题分析

静态托管构建产物总计 **180M**，其中：

| 资源类别 | 大小 | 占比 | 说明 |
|---------|------|------|------|
| 幻兽图片 (PNG) | 177M | 98.3% | 159 兽 × 5 阶段 = 795 张，单张 600K~1.4M |
| JS 代码包 | 1.6M | 0.9% | 已做代码分割，未做 gzip 预压缩 |
| CSS | 48K | <0.1% | Tailwind PurgeCSS 已优化 |
| 其他 | ~1.1M | 0.6% | PWA 图标等 |

云存储仅 10 个小文件（CSV 导出 + 任务照片），约 400KB，可忽略。

## 优化计划

### P0 - 图片格式转换 + 降分辨率 ✅

- [x] PNG → WebP 批量转换（cwebp -q 85）
- [x] 1024×1024 → 512×512 降分辨率（覆盖所有 2x 屏需求，最大显示 384×384 CSS = 768 物理像素）
- [x] 155 张图片：142.2M (PNG 1024px) → 4.3M (WebP 512px)（压缩 **97%**）
- [x] 更新 `beasts.ts`、`ShareView.tsx` 中所有 `.png` → `.webp` 引用
- [x] 更新 `vite.config.ts` PWA 配置（includeAssets、globPatterns、urlPattern）
- [x] PWA 预缓存移除图片（337 entries → 27 entries），图片改为按需加载 + CacheFirst 30天缓存
- [x] 删除原始 PNG 文件
- [x] 无需 PNG fallback（WebP 浏览器支持率 > 97%）

### P1 - Vite 构建压缩 ✅

- [x] 安装并配置 `vite-plugin-compression`（gzip，threshold 10KB）
- [x] 构建验证通过，10 个 JS/CSS 文件已生成 .gz 压缩版本

### P2 - 垃圾文件清理 ✅

- [x] 删除 `public/beasts/test/` 测试目录 (4.8M)
- [x] 删除 `public/beasts/prompts_*.md` (97K)
- [x] 删除项目内所有 `.DS_Store` 文件

### P3 - 长期策略（可选）

- [ ] 幻兽图片懒加载优化：按需加载当前阶段图片
- [ ] 图片 CDN 分离：将图片迁移到独立 CDN，减轻静态托管压力
- [ ] 路由级代码分割：Records、Settings 等页面动态导入

## 实际效果

| 优化项 | 优化前 | 优化后 | 节省 |
|-------|--------|--------|------|
| 幻兽图片 | 142.2M (PNG 1024px) | 4.3M (WebP 512px) | **97%** |
| JS/CSS (gzip) | 1.9M | ~520K | **73%** |
| 垃圾文件 | 4.8M | 0 | **100%** |
| PWA 首次加载 | 13.4M (337 entries) | 2.3M (27 entries) | **83%** |
| **dist 总大小** | **180M** | **7.7M** | **96%** |

## 进度记录

- 2026-02-11: 完成分析，建立优化任务跟踪
- 2026-02-11: P0/P1/P2 全部完成，dist 从 180M 降至 17M
- 2026-02-11: 图片降分辨率 1024→512 + PWA 按需加载，dist 降至 7.7M

## 修改文件清单

- `app/vite.config.ts` — 添加 gzip 压缩插件，更新 PWA 配置
- `app/src/data/beasts.ts` — 图片路径 .png → .webp
- `app/src/routes/ShareView.tsx` — fallback 图片路径 .png → .webp
- `app/public/beasts/` — 155 张 PNG 转为 WebP，删除测试目录和垃圾文件
- `app/package.json` — 新增 devDependency: vite-plugin-compression
