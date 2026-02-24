# 2026-02-24 已领养不可重复领养

## 本日目标
防止学生在满级后重新领养时误选已收集的幻兽。

## 完成内容
- BeastPickerModal 新增 `collectedBeasts` prop
- 已收集的幻兽卡片灰度显示 + "已收集"角标 + 禁止点击
- Home.tsx 传递当前学生的 collectedBeasts 给弹窗

## 遇到的问题
无，纯前端改动，逻辑简单。

## 解决方案
在 BeastPickerModal 渲染时判断 `collectedBeasts.includes(beast.id)`，对已收集的宠物设置 `disabled` + `opacity-50` + `grayscale` + `cursor-not-allowed`。

## 相关文件
- `app/src/components/BeastPickerModal.tsx`
- `app/src/routes/Home.tsx`
