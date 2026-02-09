import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { signInAnonymously } from "../lib/cloudbaseAuth"
import { CloudApi } from "../services/cloudApi"
import { beasts } from "../data/beasts"
import { getEvolutionStage, stageNames } from "../utils/evolution"
import type {
  TTShareViewClassData,
  TTShareViewStudentData,
} from "../types/api"

const MAX_LEVEL = 10

const ShareLoading = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <p className="text-text-secondary">加载中...</p>
  </div>
)

const ShareError = ({ message }: { message: string }) => (
  <div className="min-h-screen bg-background flex items-center justify-center p-4">
    <div className="max-w-sm w-full bg-white/80 backdrop-blur rounded-2xl border border-white/60 shadow-sm p-8 text-center">
      <div className="text-6xl mb-4">😢</div>
      <h2 className="text-lg font-bold text-text-primary mb-2">无法加载分享内容</h2>
      <p className="text-sm text-text-secondary">{message}</p>
      <p className="text-xs text-text-tertiary mt-4">请确认链接是否有效或联系老师重新分享</p>
    </div>
  </div>
)

// 班级概览
const ShareClassView = ({ data, onRefresh }: { data: TTShareViewClassData; onRefresh: () => void }) => {
  const sortedStudents = data.students

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/85 backdrop-blur border-b border-white/60 shadow-soft">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-base font-bold text-text-primary">
            幻兽学院 · {data.className}
          </h1>
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-lg border border-gray-200 bg-white/80 px-2.5 py-1 text-xs text-text-secondary active:bg-gray-100"
          >
            刷新
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-3 pt-4">
        {/* Student Grid — 复用 Home 手机端卡片 */}
        <div className="grid grid-cols-2 gap-2">
          {sortedStudents.map((student, index) => {
            const beast = beasts.find((b) => b.id === student.beastId)
            const stage = getEvolutionStage(student.level)
            const stageName = stageNames[stage]
            const isMaxLevel = student.level >= MAX_LEVEL
            const hasAdopted = !!student.beastId

            // 前三名高亮
            const rankStyle =
              index === 0
                ? "border-amber-300 bg-amber-50/60"
                : index === 1
                  ? "border-gray-300 bg-gray-50/60"
                  : index === 2
                    ? "border-orange-300 bg-orange-50/60"
                    : "border-gray-100 bg-white"

            return (
              <div
                key={`${student.name}-${index}`}
                className={`rounded-2xl border p-2 shadow-sm ${rankStyle}`}
              >
                {/* 名字行：排名角标 + 名字 + 等级 + 幻兽名 */}
                <div className="mb-1 flex items-center gap-1 text-[10px] leading-tight">
                  {index < 3 && (
                    <span className="shrink-0 text-sm leading-none">
                      {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                    </span>
                  )}
                  <span className="shrink-0 text-xs font-bold text-text-primary">{student.name}</span>
                  {hasAdopted && (
                    <span className={`shrink-0 rounded px-1 py-0.5 font-semibold ${isMaxLevel ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"}`}>
                      {isMaxLevel ? "MAX" : `Lv.${student.level}`}
                    </span>
                  )}
                  <span className="truncate text-text-tertiary">
                    {beast ? `${beast.name}·${isMaxLevel ? "收集完成" : stageName}` : "未领养"}
                  </span>
                </div>

                {/* 幻兽图片 */}
                <div className={`aspect-square max-h-28 mx-auto rounded-2xl p-2 flex items-center justify-center overflow-hidden ${isMaxLevel && hasAdopted ? "bg-gradient-to-br from-amber-50 to-orange-50 ring-2 ring-amber-300/50" : "bg-gradient-to-br from-gray-50 to-gray-100"}`}>
                  {beast ? (
                    <img
                      src={beast.images[stage]}
                      alt={beast.name}
                      className="h-full w-full object-contain drop-shadow-md"
                    />
                  ) : (
                    <div className="text-6xl opacity-50">🥚</div>
                  )}
                </div>

                {/* 进度条 */}
                <div className="mt-2">
                  <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${isMaxLevel ? "bg-gradient-to-r from-amber-400 to-orange-400" : "bg-primary"}`}
                      style={{ width: isMaxLevel ? "100%" : `${student.progress}%` }}
                    />
                  </div>
                </div>

                {/* 徽章 & 收集 */}
                {hasAdopted && (
                  <div className="mt-1.5 flex items-center justify-center gap-2 text-[10px] text-text-tertiary">
                    {student.badges > 0 && <span>徽章 {student.badges}</span>}
                    {isMaxLevel && student.collectedBeasts && student.collectedBeasts.length > 0 && (
                      <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                        已收集 {student.collectedBeasts.length} 只
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-xs text-text-tertiary">
          <p>数据实时更新 · 幻兽学院</p>
        </div>
      </div>
    </div>
  )
}

// 学生详情
const ShareStudentView = ({ data, onRefresh }: { data: TTShareViewStudentData; onRefresh: () => void }) => {
  const { student } = data
  const beast = beasts.find((b) => b.id === student.beastId)
  const stage = getEvolutionStage(student.level)
  const stageName = stageNames[stage]
  const isMaxLevel = student.level >= MAX_LEVEL
  const hasAdopted = !!student.beastId

  const pointsToNext = (() => {
    if (isMaxLevel) return 0
    const nextThreshold = data.levelThresholds[student.level] || 0
    return Math.max(0, nextThreshold - student.totalScore)
  })()

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/85 backdrop-blur border-b border-white/60 shadow-soft">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-base font-bold text-text-primary">幻兽学院</h1>
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-lg border border-gray-200 bg-white/80 px-2.5 py-1 text-xs text-text-secondary active:bg-gray-100"
          >
            刷新
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-3 pt-4 space-y-3">
        {hasAdopted ? (
          <>
            {/* 主卡片 — 复用 Home 卡片风格 */}
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              {/* 名字 + 等级 */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base font-bold text-text-primary">{student.name}</span>
                <span className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${isMaxLevel ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"}`}>
                  {isMaxLevel ? "MAX" : `Lv.${student.level}`}
                </span>
                <span className="text-xs text-text-tertiary">
                  {beast?.name}·{isMaxLevel ? "收集完成" : `${stageName}形态`}
                </span>
              </div>

              {/* 幻兽大图 */}
              <div className={`aspect-square max-h-64 mx-auto rounded-2xl p-4 flex items-center justify-center overflow-hidden ${isMaxLevel ? "bg-gradient-to-br from-amber-50 to-orange-50 ring-2 ring-amber-300/50" : "bg-gradient-to-br from-gray-50 to-gray-100"}`}>
                <img
                  src={beast?.images[stage] || "/beasts/egg_default.png"}
                  alt={student.beastName || "幻兽"}
                  className="h-full w-full object-contain drop-shadow-lg"
                />
              </div>

              {/* 进度条 */}
              <div className="mt-4">
                <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${isMaxLevel ? "bg-gradient-to-r from-amber-400 to-orange-400" : "bg-primary"}`}
                    style={{ width: isMaxLevel ? "100%" : `${student.progress}%` }}
                  />
                </div>
                {!isMaxLevel && (
                  <p className="text-xs text-text-tertiary text-center mt-2">
                    距下一级还需 {pointsToNext} 成长值
                  </p>
                )}
                {isMaxLevel && (
                  <p className="text-xs text-amber-700 text-center mt-2 font-medium">已收集完成 🏆</p>
                )}
              </div>
            </div>

            {/* 数据统计 */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl border border-gray-100 bg-white p-3 text-center shadow-sm">
                <div className="text-xl font-bold text-primary">{student.badges}</div>
                <div className="text-[10px] text-text-tertiary mt-0.5">徽章</div>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-3 text-center shadow-sm">
                <div className="text-xl font-bold text-primary">{student.earnedScore}</div>
                <div className="text-[10px] text-text-tertiary mt-0.5">累计积分</div>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-3 text-center shadow-sm">
                <div className="text-xl font-bold text-primary">{student.availableScore}</div>
                <div className="text-[10px] text-text-tertiary mt-0.5">可用积分</div>
              </div>
            </div>

            {/* 已收集幻兽 */}
            {student.collectedBeasts && student.collectedBeasts.length > 0 && (
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-bold text-text-primary mb-3">已收集幻兽</h3>
                <div className="grid grid-cols-4 gap-3">
                  {student.collectedBeasts.map((beastId) => {
                    const collectedBeast = beasts.find((b) => b.id === beastId)
                    if (!collectedBeast) return null
                    return (
                      <div key={beastId} className="text-center">
                        <div className="aspect-square rounded-xl bg-amber-50 p-1.5 flex items-center justify-center">
                          <img
                            src={collectedBeast.images.ultimate}
                            alt={collectedBeast.name}
                            className="h-full w-full object-contain drop-shadow-md"
                          />
                        </div>
                        <p className="text-[10px] text-text-tertiary mt-1">{collectedBeast.name}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 最近记录 */}
            {data.recentRecords && data.recentRecords.length > 0 && (
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-bold text-text-primary mb-3">最近积分记录</h3>
                <div className="space-y-0">
                  {data.recentRecords.slice(0, 10).map((record, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-b-0"
                    >
                      <div>
                        <div className="text-sm text-text-primary">{record.ruleName}</div>
                        <div className="text-[10px] text-text-tertiary">
                          {new Date(record.createdAt).toLocaleDateString("zh-CN", {
                            month: "numeric",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                      <div
                        className={`text-sm font-semibold ${record.type === "add" ? "text-green-600" : "text-red-500"}`}
                      >
                        {record.type === "add" ? "+" : "-"}
                        {Math.abs(record.score)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm text-center">
            <div className="text-6xl opacity-50 mb-4">🥚</div>
            <h2 className="text-lg font-bold text-text-primary">{student.name}</h2>
            <p className="text-sm text-text-tertiary mt-2">等待领养新幻兽</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-text-tertiary">
          <p>数据实时更新 · 幻兽学院</p>
        </div>
      </div>
    </div>
  )
}

export default function ShareView() {
  const { token } = useParams<{ token: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<TTShareViewClassData | TTShareViewStudentData | null>(null)

  const loadData = async () => {
    if (!token) {
      setError("缺少分享令牌")
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      await signInAnonymously()
      const result = await CloudApi.shareView({ shareToken: token })

      if ("error" in result) {
        setError(result.error)
      } else {
        setData(result)
      }
    } catch (err) {
      console.error("Failed to load share data:", err)
      setError("加载失败，请稍后重试")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [token])

  if (loading) return <ShareLoading />
  if (error || !data) return <ShareError message={error || "未知错误"} />
  if (data.type === "class") return <ShareClassView data={data} onRefresh={loadData} />
  if (data.type === "student") return <ShareStudentView data={data} onRefresh={loadData} />
  return <ShareError message="无效的数据类型" />
}
