export type UpdateTag = "功能" | "体验" | "修复" | "优化" | "内容" | "公告"

export interface UpdateEntry {
  id: string
  date: string
  title: string
  summary: string
  highlights?: string[]
  tags: UpdateTag[]
  version?: string
}

export const updates: UpdateEntry[] = [
  {
    id: "pwa-install",
    date: "2026-02-07",
    version: "v1.0.8",
    title: "支持安装到桌面，全屏像 App 使用",
    summary: "应用可安装到手机/电脑桌面，全屏打开更专注。",
    highlights: ["安装后可全屏使用", "打开速度更快，体验更流畅"],
    tags: ["功能"],
  },
  {
    id: "store-custom-items",
    date: "2026-02-07",
    version: "v1.0.8",
    title: "小卖部商品支持自定义",
    summary: "老师可自定义小卖部商品内容，满足不同班级需求。",
    highlights: ["可新增、编辑、下架商品", "支持设置积分价格与库存"],
    tags: ["功能"],
  },
  {
    id: "v1.0.4",
    date: "2026-02-07",
    version: "v1.0.4",
    title: "Excel 导入学生名单",
    summary: "支持上传 Excel 批量导入学生名单，减少手工录入。",
    highlights: [
      "上传 .xlsx/.xls 文件，自动识别姓名列并预览确认",
      "拖拽上传，文件大小限制 5MB",
    ],
    tags: ["功能"],
  },
  {
    id: "v1.0.3",
    date: "2026-02-07",
    version: "v1.0.3",
    title: "进化升级全屏庆祝动画",
    summary: "加分导致进化时展示沉浸式全屏动画。",
    highlights: [
      "白色闪光、发光环、星星粒子与新形态居中展示",
      "支持批量模式连续播放多个进化动画",
    ],
    tags: ["功能"],
  },
  {
    id: "v1.0.2",
    date: "2026-02-06",
    version: "v1.0.2",
    title: "新班级默认积分规则",
    summary: "创建班级后自动预置积分规则，开班即可使用。",
    highlights: ["默认 13 条规则（9 加分 + 4 减分）"],
    tags: ["功能"],
  },
  {
    id: "v1.0.0",
    date: "2026-02-05",
    version: "v1.0.0",
    title: "幻兽学院核心系统上线",
    summary: "完整的班级积分与幻兽成长系统首次发布。",
    highlights: [
      "幻兽系统、积分系统、商店系统与荣誉系统",
      "记录系统、设置系统、认证与激活码管理",
    ],
    tags: ["功能"],
  },
]
