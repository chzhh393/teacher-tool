import { useEffect, useRef, useState } from "react"
import { CloudApi } from "../../services/cloudApi"
import { useClassStore } from "../../stores/classStore"
import { beasts } from "../../data/beasts"
import { getEvolutionStage, stageNames } from "../../utils/evolution"
import type { Student } from "../../types"

const findBeast = (student: Student) => {
  const beastId = student.beastId || student.dinosaurId
  if (!beastId) return null
  return beasts.find((b) => b.id === beastId) || null
}

const getBeastImage = (student: Student) => {
  const beast = findBeast(student)
  if (!beast) return null
  const stage = getEvolutionStage(student.level)
  return { beast, stage, src: beast.images[stage] }
}

type Phase = "idle" | "shuffling" | "result"

/** 紧凑数字输入：左右按钮 + 中间输入框 */
const CompactNumberInput = ({
  value, onChange, min, max, suffix, disabled,
}: {
  value: number; onChange: (v: number) => void
  min: number; max: number; suffix?: string; disabled?: boolean
}) => {
  const clamp = (v: number) => Math.max(min, Math.min(max, Math.round(v) || min))
  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        disabled={disabled || value <= min}
        onClick={() => onChange(clamp(value - 1))}
        className="w-7 h-7 rounded-l-lg bg-gray-100 text-text-secondary font-bold text-sm hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
      >−</button>
      <input
        type="number"
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
        onBlur={(e) => onChange(clamp(Number(e.target.value)))}
        className="w-10 h-7 text-center text-sm font-semibold bg-gray-50 border-0 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none disabled:opacity-60"
        min={min}
        max={max}
      />
      <button
        type="button"
        disabled={disabled || value >= max}
        onClick={() => onChange(clamp(value + 1))}
        className="w-7 h-7 rounded-r-lg bg-gray-100 text-text-secondary font-bold text-sm hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
      >+</button>
      {suffix && <span className="text-sm text-text-secondary ml-1">{suffix}</span>}
    </div>
  )
}

const RollCall = () => {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [phase, setPhase] = useState<Phase>("idle")
  const [highlightIndices, setHighlightIndices] = useState<number[]>([])
  const [selectedIndices, setSelectedIndices] = useState<number[]>([])
  const [history, setHistory] = useState<string[]>([])
  const [allDoneNotice, setAllDoneNotice] = useState(false)
  const [pickCount, setPickCount] = useState(1)
  const [rewarding, setRewarding] = useState(false)        // 是否进入加分模式
  const [rewardScore, setRewardScore] = useState(1)
  const [rewardIndices, setRewardIndices] = useState<number[]>([])
  const [rewardLoading, setRewardLoading] = useState(false)
  const [rewardDone, setRewardDone] = useState(false)
  const [notice, setNotice] = useState("")
  const animatingRef = useRef(false)

  const classId = useClassStore((s) => s.classId)

  useEffect(() => {
    if (!classId) {
      setLoading(false)
      return
    }
    setLoading(true)
    CloudApi.studentList({ classId })
      .then((res) => setStudents(res.students || []))
      .catch(() => setStudents([]))
      .finally(() => setLoading(false))
  }, [classId])

  // 可选池大小
  const poolSize = (() => {
    const remaining = students.filter((s) => !history.includes(s.id)).length
    return remaining > 0 ? remaining : students.length
  })()

  // 实际抽取人数（不超过可选池）
  const effectivePickCount = Math.min(pickCount, poolSize)

  const startRoll = () => {
    if (animatingRef.current || students.length === 0) return
    animatingRef.current = true
    setAllDoneNotice(false)
    setRewarding(false)
    setRewardDone(false)
    setRewardIndices([])
    setNotice("")

    // 1. 筛选可选学生
    let pool = students.filter((s) => !history.includes(s.id))
    let resetHistory = false
    if (pool.length === 0) {
      pool = students
      resetHistory = true
      setAllDoneNotice(true)
    }

    // 如果剩余不够抽取数，也重置
    const count = Math.min(effectivePickCount, pool.length)
    if (pool.length < effectivePickCount && !resetHistory) {
      pool = students
      resetHistory = true
      setAllDoneNotice(true)
    }

    // 2. 随机选 N 个目标（不重复）
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    const targets = shuffled.slice(0, count)
    const targetIndices = targets.map((t) => students.findIndex((s) => s.id === t.id))

    // 3. 动画
    const len = students.length
    setPhase("shuffling")

    if (count === 1) {
      // 单人：聚光灯逐步收敛
      const targetIdx = targetIndices[0]
      const steps: number[] = []
      for (let i = 0; i < 28; i++) {
        steps.push(Math.floor(Math.random() * len))
      }
      for (let i = 0; i < 5; i++) {
        const offset = i % 2 === 0 ? Math.min(2, len - 1) : Math.max(-2, -(len - 1))
        steps.push((targetIdx + offset + len) % len)
      }
      steps.push(targetIdx)

      let step = 0
      const totalSteps = steps.length

      const tick = () => {
        if (step >= totalSteps) {
          setHighlightIndices([targetIdx])
          setTimeout(() => {
            setPhase("result")
            setSelectedIndices(targetIndices)
            updateHistory(targets, resetHistory)
            animatingRef.current = false
          }, 600)
          return
        }
        setHighlightIndices([steps[step]])
        step++
        const progress = step / totalSteps
        const delay = 50 + progress * progress * 280
        setTimeout(tick, delay)
      }
      tick()
    } else {
      // 多人：随机闪烁 N 个位置，最后定格到目标
      const totalSteps = 30
      let step = 0

      const tick = () => {
        if (step >= totalSteps) {
          // 定格到最终目标
          setHighlightIndices(targetIndices)
          setTimeout(() => {
            setPhase("result")
            setSelectedIndices(targetIndices)
            updateHistory(targets, resetHistory)
            animatingRef.current = false
          }, 600)
          return
        }
        // 每步随机 count 个不重复位置
        const indices: number[] = []
        const used = new Set<number>()
        while (indices.length < count && indices.length < len) {
          const r = Math.floor(Math.random() * len)
          if (!used.has(r)) {
            used.add(r)
            indices.push(r)
          }
        }
        setHighlightIndices(indices)
        step++
        const progress = step / totalSteps
        const delay = 60 + progress * progress * 250
        setTimeout(tick, delay)
      }
      tick()
    }
  }

  const updateHistory = (targets: Student[], reset: boolean) => {
    const ids = targets.map((t) => t.id)
    if (reset) {
      setHistory(ids)
    } else {
      setHistory((prev) => [...prev, ...ids])
    }
  }

  const resetToIdle = () => {
    setPhase("idle")
    setHighlightIndices([])
    setSelectedIndices([])
    setRewarding(false)
    setRewardIndices([])
    setRewardDone(false)
    setNotice("")
  }

  const toggleRewardIndex = (idx: number) => {
    if (rewardDone) return
    setRewardIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    )
  }

  const handleReward = async () => {
    if (!classId || rewardLoading || rewardDone || rewardIndices.length === 0) return
    const ids = rewardIndices.map((i) => students[i].id)
    setRewardLoading(true)
    setNotice("")
    try {
      await CloudApi.scoreBatch({
        classId,
        studentIds: ids,
        ruleId: "roll-call-reward",
        ruleName: "点名加分",
        score: rewardScore,
      })
      setRewardDone(true)
      setNotice(`已为 ${ids.length} 名同学加 ${rewardScore} 分`)
    } catch {
      setNotice("加分失败，请重试")
    } finally {
      setRewardLoading(false)
    }
  }

  // 渲染
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-text-secondary">加载中...</p>
      </div>
    )
  }

  if (!classId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-text-tertiary">
        <p>请先选择班级</p>
      </div>
    )
  }

  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-text-tertiary">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity={0.3}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
        </svg>
        <p className="text-sm mt-3">暂无学生，请先在设置中添加学生</p>
      </div>
    )
  }

  // 选中的学生列表（result 阶段使用）
  const selectedStudents = selectedIndices.map((i) => ({
    student: students[i],
    beastInfo: getBeastImage(students[i]),
  }))

  return (
    <div className="relative flex flex-col items-center gap-6 min-h-[300px]">
      {/* 全部点完提示 */}
      {allDoneNotice && (
        <div className="rounded-xl bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 animate-fade-in">
          全班已点名完毕，重新开始新一轮
        </div>
      )}

      {/* 网格区域 */}
      <div className="grid grid-cols-5 sm:grid-cols-7 lg:grid-cols-9 gap-3 justify-items-center w-full">
        {students.map((student, i) => {
          const info = getBeastImage(student)
          const isHighlighted = phase === "shuffling" && highlightIndices.includes(i)
          const isSelected = phase === "result" && selectedIndices.includes(i)

          return (
            <div
              key={student.id}
              className={`flex flex-col items-center gap-1 rounded-xl p-2 w-[72px] transition-all duration-100 ${
                isHighlighted
                  ? "scale-110 ring-2 ring-primary shadow-lg bg-primary/10 z-10"
                  : isSelected
                    ? "ring-2 ring-primary bg-primary/5"
                    : "bg-white/60 hover:bg-white"
              }`}
            >
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                {info ? (
                  <img src={info.src} alt={info.beast.name} className="w-full h-full object-contain" />
                ) : (
                  <span className="text-2xl">🥚</span>
                )}
              </div>
              <span className="text-[11px] font-medium text-text-primary truncate w-full text-center">
                {student.name}
              </span>
            </div>
          )
        })}
      </div>

      {/* 操作按钮（idle / shuffling 时显示） */}
      {phase !== "result" && (
        <div className="flex flex-col items-center gap-4">
          {/* 抽取人数选择器 */}
          {phase === "idle" && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-secondary">抽取人数</span>
              <CompactNumberInput
                value={pickCount}
                onChange={setPickCount}
                min={1}
                max={students.length}
                suffix="人"
              />
            </div>
          )}

          {phase === "idle" && (
            <button
              type="button"
              onClick={startRoll}
              className="btn-active px-8 py-3 text-lg font-bold"
            >
              开始点名
            </button>
          )}
          {phase === "shuffling" && (
            <button
              type="button"
              disabled
              className="btn-active px-8 py-3 text-lg font-bold opacity-70 cursor-not-allowed"
            >
              抽取中...
            </button>
          )}
        </div>
      )}

      {/* 已点名计数（idle / shuffling 时显示） */}
      {phase !== "result" && history.length > 0 && (
        <p className="text-xs text-text-tertiary">
          已点名 {history.length}/{students.length} 人
        </p>
      )}

      {/* 结果叠加层 */}
      {phase === "result" && selectedStudents.length > 0 && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 bg-white/85 backdrop-blur-sm rounded-xl animate-fade-in">
          {/* 加分模式提示 */}
          {rewarding && !rewardDone && (
            <p className="text-sm text-text-tertiary animate-fade-in">点击头像选择答对的同学</p>
          )}

          {/* 学生卡片展示 */}
          <div className="flex flex-wrap justify-center gap-4 animate-slide-up">
            {selectedStudents.map(({ student, beastInfo }, idx) => {
              const studentIdx = selectedIndices[idx]
              const isRewardSelected = rewarding && rewardIndices.includes(studentIdx)
              const canClick = rewarding && !rewardDone
              const isSingle = selectedStudents.length === 1
              const imgSize = isSingle ? "w-48 h-48" : "w-28 h-28"
              const imgPad = isSingle ? "p-2" : "p-1.5"
              const eggSize = isSingle ? "text-7xl" : "text-4xl"
              const nameSize = isSingle ? "text-3xl" : "text-lg"
              const subSize = isSingle ? "text-sm mt-1" : "text-xs"

              const Wrapper = canClick ? "button" : "div"

              return (
                <Wrapper
                  key={student.id}
                  {...(canClick ? { type: "button" as const, onClick: () => toggleRewardIndex(studentIdx) } : {})}
                  className={`relative flex flex-col items-center gap-2 rounded-2xl p-2 transition-all ${
                    isRewardSelected
                      ? "ring-2 ring-green-500 bg-green-50 shadow-md"
                      : canClick
                        ? "hover:bg-gray-50 cursor-pointer"
                        : ""
                  }`}
                >
                  {isRewardSelected && (
                    <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold shadow">
                      ✓
                    </div>
                  )}

                  <div className={`${imgSize} rounded-2xl overflow-hidden bg-gradient-to-b from-primary/5 to-primary/10 ${imgPad} shadow-lg`}>
                    {beastInfo ? (
                      <img
                        src={beastInfo.src}
                        alt={beastInfo.beast.name}
                        className="w-full h-full object-contain drop-shadow-md"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className={eggSize}>🥚</span>
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <p className={`${nameSize} font-bold text-text-primary`}>{student.name}</p>
                    {beastInfo && (
                      <p className={`${subSize} text-text-tertiary`}>
                        {beastInfo.beast.name} · {stageNames[beastInfo.stage]}
                      </p>
                    )}
                  </div>
                </Wrapper>
              )
            })}
          </div>

          {/* 加分面板 — 仅加分模式下显示 */}
          {rewarding && (
            <div className="flex flex-col items-center gap-2 animate-fade-in">
              <div className="flex items-center gap-3">
                <span className="text-sm text-text-secondary">加分</span>
                <CompactNumberInput
                  value={rewardScore}
                  onChange={setRewardScore}
                  min={1}
                  max={99}
                  suffix="分"
                  disabled={rewardDone}
                />
                <button
                  type="button"
                  onClick={handleReward}
                  disabled={rewardLoading || rewardDone || rewardIndices.length === 0}
                  className={`px-5 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    rewardDone
                      ? "bg-green-100 text-green-700 cursor-not-allowed"
                      : rewardIndices.length === 0
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-green-500 text-white hover:bg-green-600 disabled:opacity-70"
                  }`}
                >
                  {rewardLoading
                    ? "加分中..."
                    : rewardDone
                      ? "已加分"
                      : rewardIndices.length === 0
                        ? "请先选择学生"
                        : `确认加分${rewardIndices.length > 1 ? ` (${rewardIndices.length}人)` : ""}`}
                </button>
              </div>
              {notice && (
                <p className={`text-xs font-medium ${notice.includes("失败") ? "text-red-500" : "text-green-600"}`}>
                  {notice}
                </p>
              )}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex items-center gap-3">
            {/* 答对加分入口 — 未进入加分模式时显示 */}
            {!rewarding && (
              <button
                type="button"
                onClick={() => setRewarding(true)}
                className="rounded-xl bg-green-50 px-5 py-2.5 text-sm font-semibold text-green-700 transition-colors hover:bg-green-100"
              >
                答对加分
              </button>
            )}
            {rewarding && !rewardDone && (
              <button
                type="button"
                onClick={() => { setRewarding(false); setRewardIndices([]); setNotice("") }}
                className="rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-semibold text-text-secondary transition-colors hover:bg-gray-200"
              >
                取消加分
              </button>
            )}
            <button
              type="button"
              onClick={startRoll}
              className="btn-active px-6 py-2.5 text-sm font-semibold"
            >
              再来一次
            </button>
            <button
              type="button"
              onClick={resetToIdle}
              className="rounded-xl bg-gray-100 px-6 py-2.5 text-sm font-semibold text-text-secondary transition-colors hover:bg-gray-200"
            >
              返回列表
            </button>
          </div>

          {history.length > 0 && (
            <p className="text-xs text-text-tertiary">
              已点名 {history.length}/{students.length} 人
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default RollCall
