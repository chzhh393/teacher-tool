# 2026-02-16 课堂工具箱 + 静音挑战

## 本日目标
- 搭建课堂小工具框架（Dock + Overlay）
- 开发第一个工具：声音监测（后更名为"静音挑战"）
- 实现安静奖励功能（连续安静达标后全班加分）

## 完成内容

### 1. 工具箱框架
- `ToolDock`：桌面端右侧悬浮 Dock，鼠标悬停展开，4 个工具入口（随机点名、考勤管理、作业收集、静音挑战）
- `ToolOverlay`：全屏遮罩容器，ESC 关闭，阻止背景滚动，Portal 渲染
- `PlaceholderTool`：未开发工具的占位组件
- 集成到 `AppShell`，仅桌面端显示

### 2. 静音挑战（NoiseMeter）
- Web Audio API 采集麦克风音量（ScriptProcessorNode）
- SVG 仪表盘展示实时分贝，三级颜色区间（安静/正常/吵闹）
- 可调阈值滑块 + 超阈值红色脉冲警告
- 峰值记录

### 3. 安静奖励
- 开关控制，可设置目标安静时长（1-30 分钟）和奖励分数（1-10 分）
- 圆形进度环展示安静倒计时
- 达标弹出确认框，老师确认后调用 `CloudApi.scoreBatch` 全班加分
- 加分中显示 loading 状态，防止重复点击

### 4. 布局迭代
- 最终方案：上方左右两个等大仪表盘（分贝 + 安静进度），下方统一设置栏（阈值 + 奖励开关/设置 + 开始/停止按钮）

## 遇到的问题

### 1. 麦克风无声音数据
- 症状：`getUserMedia` 成功但数据全为 0/128（静音）
- 尝试：`AudioContext.resume()`、`AnalyserNode` 换 `ScriptProcessorNode`、ref 防 GC
- 根因：macOS 系统级麦克风权限未授予 Chrome（与浏览器层权限独立）
- 解决：用户在 macOS 系统设置 → 隐私与安全 → 麦克风中授权 Chrome

### 2. 仪表盘弧线扭曲
- 症状：分贝弧线偶尔歪斜变形
- 根因：`transition-all duration-150` 作用于 SVG `<path>` 的 `d` 属性，浏览器对路径字符串做数值插值导致弧线变形
- 解决：移除 CSS transition，依赖音频处理中的 0.6/0.4 加权平滑

### 3. 安静奖励计数翻倍
- 症状：点一次确认，显示"已奖励 2 次"
- 根因：`setConfirmOpen(true)` 放在 `setQuietSeconds` 的状态更新函数内，React 严格模式下更新函数执行两次（副作用检测）
- 解决：将 `setConfirmOpen` 移到独立 `useEffect` 中监听 `quietSeconds` 达标，加 `rewardTriggeredRef` 防重复触发

### 4. 50 刻度被遮挡
- 症状：仪表盘顶部 50 刻度标签不可见
- 根因：刻度 y 坐标为负值，超出 SVG viewBox
- 解决：viewBox 起始 y 改为 -15（`viewBox="0 -15 300 300"`），刻度外推至 GAUGE_R + GAUGE_STROKE + 20

## 解决方案
见上方各问题的解决方案。

## 相关文件
| 文件 | 操作 |
|------|------|
| `app/src/components/ToolDock.tsx` | 新增 |
| `app/src/components/ToolOverlay.tsx` | 新增 |
| `app/src/components/tools/NoiseMeter.tsx` | 新增 |
| `app/src/components/tools/PlaceholderTool.tsx` | 新增 |
| `app/src/components/AppShell.tsx` | 修改 — 集成 ToolDock + ToolOverlay |
