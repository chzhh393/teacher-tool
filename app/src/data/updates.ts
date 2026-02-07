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
    id: "store-custom-items",
    date: "2026-02-07",
    title: "小卖部商品支持自定义",
    summary: "老师可自定义小卖部商品内容，满足不同班级需求。",
    highlights: ["可新增、编辑、下架商品", "支持设置积分价格与库存"],
    tags: ["功能"],
  },
  {
    id: "pwa-install",
    date: "2026-02-07",
    title: "支持安装到桌面，全屏像 App 使用",
    summary: "应用可安装到手机/电脑桌面，全屏打开更专注。",
    highlights: ["安装后可全屏使用", "打开速度更快，体验更流畅"],
    tags: ["功能"],
  },
]
