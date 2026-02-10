import type { ClassSettings } from "../types"

/** 从远程/源设置中只提取业务字段，过滤掉 _id、classId、data 等数据库元信息 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const pickSettings = (
  remote: any,
  fallback: ClassSettings
): ClassSettings => ({
  systemName: (remote.systemName as string) || fallback.systemName,
  themeColor: (remote.themeColor as string) || fallback.themeColor,
  scoreRules: (remote.scoreRules as ClassSettings["scoreRules"]) || fallback.scoreRules,
  levelThresholds: (remote.levelThresholds as number[]) || fallback.levelThresholds,
})

export const getDefaultSettings = (): ClassSettings => ({
  systemName: "幻兽学院",
  themeColor: "coral",
  levelThresholds: [0, 5, 12, 22, 35, 50, 70, 95, 125, 160],
  scoreRules: [
    { id: "rule-01", name: "早读打卡", score: 1, icon: "📖", pinyin: "zddk", order: 1, type: "add" },
    { id: "rule-05", name: "积极举手", score: 1, icon: "✋", pinyin: "jjjs", order: 2, type: "add" },
    { id: "rule-08", name: "课外阅读", score: 1, icon: "📚", pinyin: "kwyd", order: 3, type: "add" },
    { id: "rule-02", name: "答对问题", score: 2, icon: "💡", pinyin: "ddwt", order: 4, type: "add" },
    { id: "rule-04", name: "完成背诵", score: 2, icon: "🎤", pinyin: "wcbs", order: 5, type: "add" },
    { id: "rule-06", name: "帮助同学", score: 2, icon: "❤️", pinyin: "bztx", order: 6, type: "add" },
    { id: "rule-07", name: "值日认真", score: 2, icon: "✨", pinyin: "zrrz", order: 7, type: "add" },
    { id: "rule-03", name: "作业优秀", score: 3, icon: "⭐", pinyin: "zyyx", order: 8, type: "add" },
    { id: "rule-09", name: "进步明显", score: 3, icon: "🌱", pinyin: "jbmx", order: 9, type: "add" },
    { id: "rule-11", name: "迟到", score: -1, icon: "⏰", pinyin: "cd", order: 101, type: "subtract" },
    { id: "rule-13", name: "打瞌睡", score: -1, icon: "😴", pinyin: "dks", order: 102, type: "subtract" },
    { id: "rule-12", name: "课堂讲话", score: -2, icon: "🗣️", pinyin: "ktjh", order: 103, type: "subtract" },
    { id: "rule-14", name: "未交作业", score: -2, icon: "❌", pinyin: "wjzy", order: 104, type: "subtract" },
  ],
})
