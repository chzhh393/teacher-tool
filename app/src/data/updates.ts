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
    id: "copy-class-settings",
    date: "2026-02-08",
    version: "v1.1.2",
    title: "新建班级支持复制已有班级设置",
    summary: "创建新班级时可选择从已有班级复制积分规则和商品，不必每次从头配置。",
    highlights: [
      "新建班级弹窗新增「初始设置」选择：默认模板或从已有班级复制",
      "复制内容包括积分规则、成长阈值和小卖部商品",
      "创建后仍可在设置页面继续个性化修改",
    ],
    tags: ["功能"],
  },
  {
    id: "honor-board-upgrade",
    date: "2026-02-08",
    version: "v1.1.0",
    title: "光荣榜全新升级",
    summary: "徽章展示收集的满级幻兽，积分体系更清晰。",
    highlights: [
      "满级幻兽自动记录为徽章，光荣榜展示收集图鉴，悬停可查看大图",
      "新增累计积分：历史总获得，不受兑换和换幻兽影响，排名更公平",
      "成长值决定幻兽等级，可用积分用于小卖部兑换，概念一目了然",
    ],
    tags: ["功能", "优化"],
  },
  {
    id: "sort-settings",
    date: "2026-02-07",
    version: "v1.0.9",
    title: "小卖部与积分项支持排序",
    summary: "加分项、减分项和小卖部商品支持自定义排序。",
    highlights: ["设置页拖拽排序", "保存后列表按新顺序展示"],
    tags: ["功能"],
  },
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
