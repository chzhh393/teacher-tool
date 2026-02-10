# 2026-02-10 手机端成长记录入口

## 本日目标
让主账号在手机端也能访问成长记录页面并使用撤销功能。

## 完成内容
1. 主账号手机端底部导航从 4 Tab 改为 5 Tab，新增「记录」入口
2. Records 页面手机端响应式优化（标题、搜索框、列表项、分页）

## 遇到的问题
- 主账号手机端底部导航只有 4 个 Tab（首页、光荣榜、小卖部、设置），缺少成长记录入口
- 子账号已有「记录」Tab，但主账号没有
- Records 页面没有针对手机端做字号和间距适配

## 解决方案
- AppShell.tsx：在主账号的底部 Tab 数组中，在「小卖部」和「设置」之间插入「记录」Tab，复用已有的 records 图标 SVG
- Records.tsx：对照 Home.tsx 的手机端适配风格，添加 Tailwind 响应式断点类（text-lg md:text-2xl、py-1.5 md:py-2 等），记录条目加 truncate + min-w-0 flex-1 / shrink-0 防溢出

## 相关文件
- `app/src/components/AppShell.tsx` — 底部导航添加记录 Tab
- `app/src/routes/Records.tsx` — 手机端响应式样式优化
