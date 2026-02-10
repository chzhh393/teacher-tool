# 2026-02-10 触屏设备 hover 导致 click 失效修复

## 本日目标
修复智慧黑板（欧帝 DC800CH 触屏设备）上使用360浏览器时，点击学生卡片宠物无反应的问题。

## 完成内容
- 分析根因：`hover:-translate-y-1` 在触屏设备上导致卡片位移，浏览器 hit-test 检测到目标移动后取消 click 事件合成
- 实施三层防护机制修复问题

## 遇到的问题
触摸卡片 → 浏览器触发 `:hover` → 卡片向上位移 4px + 宠物图片放大 110% → 浏览器 hit-test 检测到目标移动 → 取消 click 事件合成。360浏览器基于较旧 Chromium 内核，触摸事件的容差更小。

## 解决方案
三层防护，桌面端零影响：

| 层级 | 机制 | 覆盖场景 |
|------|------|---------|
| `hoverOnlyWhenSupported` | `@media (hover: hover)` | 现代浏览器触屏设备 |
| `@media (pointer: coarse)` | CSS 兜底 | 旧版浏览器（360等） |
| `touch-action: manipulation` | 触摸行为优化 | 消除300ms延迟，兜底 |

## 相关文件
- `app/tailwind.config.js` — 启用 `future.hoverOnlyWhenSupported`
- `app/src/index.css` — 添加 `@media (pointer: coarse)` 兜底规则
- `app/src/routes/Home.tsx` — 学生卡片添加 `touch-manipulation` 类
- `docs/CHANGELOG.md` — 新增 v1.5.1 版本条目
