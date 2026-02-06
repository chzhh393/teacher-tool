# 小卖部模块

> 学生使用可用积分兑换实物商品、特权和装饰品。

## 功能概述

### 商品类型

| 类型 | 说明 | 示例 |
|------|------|------|
| 实物商品 | 教师准备的实体奖品 | 文具、贴纸、小玩具 |
| 特权 | 课堂或作业相关的特殊权利 | 免写作业一次、选座位 |
| 装饰品 | 幻兽系统的装饰元素 | 头饰、背景、特效 |

### 商品管理

- 教师可创建、编辑、删除商品
- 每件商品包含：名称、描述、价格（可用积分）、库存数量、每人限购数量
- 支持设置商品的上下架状态

### 兑换规则

- 消费的是学生的 **可用积分（availableScore）**，不影响累计积分
- 受库存限制 —— 库存为 0 时无法兑换
- 受每人限购限制 —— 达到限购上限后该学生无法再次兑换
- 兑换成功后生成兑换记录，供教师核销

### 兑换记录

- 记录每次兑换的学生、商品、时间
- 教师可查看兑换记录列表，用于实际发放奖品时核对

## 关键文件

| 文件 | 说明 |
|------|------|
| `app/src/routes/Store.tsx` | 小卖部页面（商品展示与兑换操作） |
| `app/src/services/cloudApi.ts` | API 封装 |

## 云函数 / API

| 云函数 | API 方法 | 说明 |
|--------|----------|------|
| `TT_shop_list` | `shopList` | 获取商品列表 |
| `TT_shop_redeem` | `shopRedeem` | 兑换商品 |
| `TT_redeem_list` | `redeemList` | 获取兑换记录 |

## 数据集合

### 商品数据（通过 TT_shop_list 管理）

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | string | 商品 ID |
| `classId` | string | 所属班级 ID |
| `name` | string | 商品名称 |
| `description` | string | 商品描述 |
| `price` | number | 价格（可用积分） |
| `stock` | number | 库存数量 |
| `limitPerStudent` | number | 每人限购数量 |
| `type` | string | 商品类型：physical / privilege / decoration |

### 兑换记录

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | string | 记录 ID |
| `studentId` | string | 学生 ID |
| `itemId` | string | 商品 ID |
| `itemName` | string | 商品名称（冗余存储） |
| `price` | number | 兑换时的价格 |
| `createdAt` | number | 兑换时间戳 |

## 注意事项

- 兑换操作会同时扣减 `availableScore` 和商品库存，由云函数保证原子性
- `totalScore` 不受兑换影响，学生的等级和进化进度不会因消费而倒退
- 兑换记录中冗余存储了商品名称，避免商品删除后记录无法展示
- 商品管理入口在 [设置页面](../class-management/README.md) 中
