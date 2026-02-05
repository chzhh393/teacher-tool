import type { ClassSummary, ScoreRule, ShopItem, Student } from "../types"

export const classSummary: ClassSummary = {
  id: "class-5-2",
  name: "五年二班",
  studentCount: 30,
  totalBadges: 12,
  averageLevel: 4.2,
  totalScore: 1860,
}

export const students: Student[] = [
  { id: "stu-01", name: "陈思远", beastId: "unicorn", beastName: "独角兽", level: 9, totalScore: 156, availableScore: 48, badges: 2, progress: 78 },
  { id: "stu-02", name: "王梓萱", beastId: "fairy-dragon", beastName: "仙女龙", level: 8, totalScore: 132, availableScore: 35, badges: 2, progress: 65 },
  { id: "stu-03", name: "李俊熙", beastId: "starry-cat", beastName: "星空猫", level: 7, totalScore: 108, availableScore: 42, badges: 1, progress: 54 },
  { id: "stu-04", name: "张雨桐", beastId: "moon-rabbit", beastName: "月兔", level: 6, totalScore: 89, availableScore: 28, badges: 1, progress: 72 },
  { id: "stu-05", name: "刘浩宇", beastId: "pegasus", beastName: "彩虹飞马", level: 6, totalScore: 85, availableScore: 31, badges: 1, progress: 45 },
  { id: "stu-06", name: "杨子涵", beastId: "nine-deer", beastName: "九色鹿", level: 5, totalScore: 72, availableScore: 24, badges: 0, progress: 88 },
  { id: "stu-07", name: "黄诗琪", beastId: "snow-fox", beastName: "冰雪狐", level: 5, totalScore: 68, availableScore: 19, badges: 1, progress: 62 },
  { id: "stu-08", name: "赵明轩", beastId: "mermaid", beastName: "人鱼公主", level: 5, totalScore: 65, availableScore: 22, badges: 0, progress: 35 },
  { id: "stu-09", name: "周欣怡", beastId: "flower-spirit", beastName: "花仙子", level: 4, totalScore: 58, availableScore: 18, badges: 1, progress: 82 },
  { id: "stu-10", name: "吴宇航", beastId: "candy-bear", beastName: "糖果熊", level: 4, totalScore: 55, availableScore: 15, badges: 0, progress: 55 },
  { id: "stu-11", name: "郑雅琳", beastId: "angel-sheep", beastName: "治愈羊", level: 4, totalScore: 52, availableScore: 20, badges: 0, progress: 28 },
  { id: "stu-12", name: "孙逸辰", beastId: "gem-bird", beastName: "宝石鸟", level: 3, totalScore: 45, availableScore: 12, badges: 0, progress: 75 },
  { id: "stu-13", name: "马思彤", beastId: "unicorn", beastName: "独角兽", level: 3, totalScore: 42, availableScore: 16, badges: 0, progress: 42 },
  { id: "stu-14", name: "朱晨曦", beastId: "fairy-dragon", beastName: "仙女龙", level: 3, totalScore: 38, availableScore: 10, badges: 0, progress: 18 },
  { id: "stu-15", name: "胡嘉豪", beastId: "starry-cat", beastName: "星空猫", level: 2, totalScore: 32, availableScore: 14, badges: 0, progress: 85 },
  { id: "stu-16", name: "林可馨", beastId: "moon-rabbit", beastName: "月兔", level: 2, totalScore: 28, availableScore: 8, badges: 0, progress: 56 },
  { id: "stu-17", name: "何子墨", beastId: "pegasus", beastName: "彩虹飞马", level: 2, totalScore: 25, availableScore: 11, badges: 0, progress: 25 },
  { id: "stu-18", name: "高雨萱", beastId: "nine-deer", beastName: "九色鹿", level: 2, totalScore: 22, availableScore: 6, badges: 0, progress: 68 },
  { id: "stu-19", name: "罗天佑", beastId: "snow-fox", beastName: "冰雪狐", level: 1, totalScore: 18, availableScore: 18, badges: 0, progress: 90 },
  { id: "stu-20", name: "谢语嫣", beastId: "mermaid", beastName: "人鱼公主", level: 1, totalScore: 15, availableScore: 15, badges: 0, progress: 75 },
  { id: "stu-21", name: "唐睿阳", beastId: "flower-spirit", beastName: "花仙子", level: 1, totalScore: 12, availableScore: 12, badges: 0, progress: 60 },
  { id: "stu-22", name: "韩诗涵", beastId: "candy-bear", beastName: "糖果熊", level: 1, totalScore: 10, availableScore: 10, badges: 0, progress: 50 },
  { id: "stu-23", name: "冯博文", beastId: "angel-sheep", beastName: "治愈羊", level: 1, totalScore: 8, availableScore: 8, badges: 0, progress: 40 },
  { id: "stu-24", name: "曹梦瑶", beastId: "gem-bird", beastName: "宝石鸟", level: 1, totalScore: 6, availableScore: 6, badges: 0, progress: 30 },
  { id: "stu-25", name: "彭俊杰", beastId: "unicorn", beastName: "独角兽", level: 1, totalScore: 5, availableScore: 5, badges: 0, progress: 25 },
  { id: "stu-26", name: "蒋欣悦", beastId: "", beastName: "", level: 1, totalScore: 3, availableScore: 3, badges: 0, progress: 15 },
  { id: "stu-27", name: "蔡子轩", beastId: "", beastName: "", level: 1, totalScore: 2, availableScore: 2, badges: 0, progress: 10 },
  { id: "stu-28", name: "潘雅婷", beastId: "", beastName: "", level: 1, totalScore: 2, availableScore: 2, badges: 0, progress: 10 },
  { id: "stu-29", name: "董浩然", beastId: "", beastName: "", level: 1, totalScore: 1, availableScore: 1, badges: 0, progress: 5 },
  { id: "stu-30", name: "袁思琪", beastId: "", beastName: "", level: 1, totalScore: 0, availableScore: 0, badges: 0, progress: 0 },
]

export const scoreRules: ScoreRule[] = [
  // 加分项
  { id: "rule-01", name: "早读打卡", score: 1, icon: "📖", pinyin: "zddk", order: 1, type: "add" },
  { id: "rule-02", name: "答对问题", score: 2, icon: "💡", pinyin: "ddwt", order: 2, type: "add" },
  { id: "rule-03", name: "作业优秀", score: 3, icon: "⭐", pinyin: "zyyx", order: 3, type: "add" },
  { id: "rule-04", name: "完成背诵", score: 2, icon: "🎤", pinyin: "wcbs", order: 4, type: "add" },
  { id: "rule-05", name: "积极举手", score: 1, icon: "✋", pinyin: "jjjs", order: 5, type: "add" },
  { id: "rule-06", name: "帮助同学", score: 2, icon: "❤️", pinyin: "bztx", order: 6, type: "add" },
  { id: "rule-07", name: "值日认真", score: 2, icon: "✨", pinyin: "zrrz", order: 7, type: "add" },
  { id: "rule-08", name: "课外阅读", score: 1, icon: "📚", pinyin: "kwyd", order: 8, type: "add" },
  { id: "rule-09", name: "进步明显", score: 3, icon: "🌱", pinyin: "jbmx", order: 9, type: "add" },
  { id: "rule-10", name: "才艺展示", score: 3, icon: "🎭", pinyin: "cyzs", order: 10, type: "add" },
  // 扣分项
  { id: "rule-11", name: "迟到", score: -1, icon: "⏰", pinyin: "cd", order: 101, type: "subtract" },
  { id: "rule-12", name: "课堂讲话", score: -2, icon: "🗣️", pinyin: "ktjh", order: 102, type: "subtract" },
  { id: "rule-13", name: "打瞌睡", score: -1, icon: "😴", pinyin: "dks", order: 103, type: "subtract" },
  { id: "rule-14", name: "未交作业", score: -2, icon: "❌", pinyin: "wjzy", order: 104, type: "subtract" },
]

export const shopItems: ShopItem[] = [
  { id: "item-01", name: "免作业卡", description: "免写一次作业", cost: 50, icon: "🎫", type: "privilege", stock: 10, limitPerStudent: 1, order: 1 },
  { id: "item-02", name: "前排座位券", description: "选择一周的座位", cost: 30, icon: "🪑", type: "privilege", stock: 15, limitPerStudent: 1, order: 2 },
  { id: "item-03", name: "铅笔", description: "一支铅笔", cost: 10, icon: "✏️", type: "physical", stock: 50, limitPerStudent: 2, order: 3 },
]
