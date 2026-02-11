# 2026-02-11 成长记录概览统计

## 本日目标

在成长记录页面新增"概览统计"视图，让老师能快速查看一周或一月内的加减分汇总情况，不用逐条翻看明细。

## 需求背景

当前成长记录页面（`/records`）只有分页明细列表，老师无法直观了解一段时间内班级的整体积分动态。需要一个概览视图，从三个维度汇总展示：

1. **班级整体** — 总加分、总扣分、净得分、活跃学生数
2. **学生排行** — 每位学生的加分/扣分次数与总分、净得分排行
3. **规则统计** — 每条加分/扣分规则的使用频次和总分

## 功能设计方案

### 云函数：`TT_record_summary`

新建云函数，在服务端完成数据聚合（避免前端受分页限制）。

**入参**：
```json
{
  "token": "string",
  "classId": "string (可选)",
  "timeRange": "week | month"
}
```

**出参**：
```json
{
  "timeRange": {
    "type": "week | month",
    "startDate": "2026-02-10",
    "endDate": "2026-02-11"
  },
  "studentSummaries": [
    {
      "studentId": "xxx",
      "studentName": "张三",
      "addCount": 5,
      "addTotal": 15,
      "subtractCount": 1,
      "subtractTotal": 3,
      "netScore": 12
    }
  ],
  "ruleSummaries": [
    {
      "ruleId": "xxx",
      "ruleName": "上课积极",
      "type": "add",
      "count": 20,
      "totalScore": 60
    }
  ],
  "classSummary": {
    "totalAddCount": 45,
    "totalAddScore": 135,
    "totalSubtractCount": 8,
    "totalSubtractScore": 24,
    "totalOperations": 53,
    "netScore": 111,
    "activeStudentCount": 30
  }
}
```

**核心逻辑**：
- 认证：复用 `TT_record_list` 的 `verifyToken` + `verifyClassAccess` + `getClassId`
- 时间范围计算：
  - 本周 = 周一 00:00:00 ~ 今天 23:59:59（Asia/Shanghai）
  - 本月 = 本月 1 日 00:00:00 ~ 今天 23:59:59
- 查询条件：`_.or` 双路径 + 时间范围过滤 + 排除已撤回记录
- 显式 `.limit(10000)`
- 云函数内循环聚合，按 studentId 和 ruleId+type 分别汇总

### 前端 UI

在 Records.tsx 中：
1. **Tab 切换器**：标题下方，"明细记录" | "概览统计"
2. **时间范围选择器**：本周 / 本月 按钮组，下方显示具体日期范围
3. **班级整体统计**：2x2 网格卡片（手机端 2 列，桌面 4 列）
   - 总加分（绿色背景）
   - 总扣分（红色背景）
   - 净得分（蓝色背景）
   - 活跃学生数（橙色背景）
4. **学生排行**：列表形式，排名徽章（金银铜）+ 姓名 + 加分/扣分/净得分
5. **规则统计**：列表形式，规则名 + 使用次数 + 总分，加分规则绿色、扣分规则红色

### 交互逻辑

- 切换到概览 tab 时自动加载本周数据
- 点击本周/本月切换重新请求
- 切换班级后在概览 tab 也重新请求
- 加载中显示 loading 状态
- 无记录显示空状态提示

## 技术要点与注意事项

1. **双路径查询**：所有 `.where()` 必须用 `_.or([{ field }, { "data.field": value }])`
2. **数据解包**：`const raw = item.data || item`
3. **显式 limit**：`.limit(10000)` 不依赖默认 100 条
4. **排除撤回**：过滤 `revoked !== true && type !== "revoke"`
5. **时间戳比较**：用原始数值，不用格式化后的字符串
6. **时区统一**：Asia/Shanghai

## 修改文件清单

| 操作 | 文件 |
|------|------|
| 新建 | `app/cloudfunctions/TT_record_summary/package.json` |
| 新建 | `app/cloudfunctions/TT_record_summary/index.js` |
| 修改 | `app/src/types/api.ts` |
| 修改 | `app/src/services/cloudApi.ts` |
| 修改 | `app/src/routes/Records.tsx` |
