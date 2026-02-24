import { useCallback, useEffect, useRef, useState } from "react"
import { CloudApi } from "../../services/cloudApi"
import { useClassStore } from "../../stores/classStore"

// 音量等级定义
const levels = [
  { label: "安静", min: 0, max: 30, color: "#22c55e", bg: "bg-green-50", text: "text-green-600" },
  { label: "正常", min: 30, max: 60, color: "#eab308", bg: "bg-yellow-50", text: "text-yellow-600" },
  { label: "吵闹", min: 60, max: 100, color: "#ef4444", bg: "bg-red-50", text: "text-red-600" },
] as const

const getLevel = (vol: number) => levels.find((l) => vol < l.max) || levels[2]

// SVG 仪表盘参数
const GAUGE_R = 120
const GAUGE_STROKE = 16
const GAUGE_CENTER = 150
const ARC_START = 135
const ARC_SWEEP = 270

const polarToXY = (angleDeg: number, r: number) => {
  const rad = (angleDeg * Math.PI) / 180
  return [GAUGE_CENTER + r * Math.cos(rad), GAUGE_CENTER + r * Math.sin(rad)]
}

const describeArc = (startAngle: number, endAngle: number, r: number) => {
  const [sx, sy] = polarToXY(startAngle, r)
  const [ex, ey] = polarToXY(endAngle, r)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return `M ${sx} ${sy} A ${r} ${r} 0 ${largeArc} 1 ${ex} ${ey}`
}

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

const NoiseMeter = () => {
  // 基础状态
  const [isListening, setIsListening] = useState(false)
  const [volume, setVolume] = useState(0)
  const [peakVolume, setPeakVolume] = useState(0)
  const [threshold, setThreshold] = useState(50)
  const [permissionError, setPermissionError] = useState("")
  const [isOverThreshold, setIsOverThreshold] = useState(false)

  // 安静奖励状态
  const [rewardEnabled, setRewardEnabled] = useState(false)
  const [quietMinutes, setQuietMinutes] = useState(3)
  const [rewardScore, setRewardScore] = useState(1)
  const [quietSeconds, setQuietSeconds] = useState(0)
  const [rewardCount, setRewardCount] = useState(0)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [rewardLoading, setRewardLoading] = useState(false)
  const [rewardNotice, setRewardNotice] = useState("")
  const [students, setStudents] = useState<{ id: string; name: string }[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Refs
  const audioCtxRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const smoothVolumeRef = useRef(0)
  const thresholdRef = useRef(threshold)
  thresholdRef.current = threshold
  const timerRef = useRef<number>(0)
  const isQuietRef = useRef(false)
  const confirmOpenRef = useRef(false)
  confirmOpenRef.current = confirmOpen
  const rewardTriggeredRef = useRef(false)

  const classId = useClassStore((s) => s.classId)

  // 加载学生列表
  useEffect(() => {
    if (!classId) return
    CloudApi.studentList({ classId }).then((res) => {
      const list = (res.students || [])
        .filter((s) => s.id)
        .map((s) => ({ id: s.id, name: s.name || "" }))
      setStudents(list)
      setSelectedIds(list.map((s) => s.id))
    }).catch(() => {})
  }, [classId])

  // 安静计时器（每秒检查）
  useEffect(() => {
    if (!isListening || !rewardEnabled) {
      setQuietSeconds(0)
      return
    }

    const targetSeconds = quietMinutes * 60
    rewardTriggeredRef.current = false
    timerRef.current = window.setInterval(() => {
      if (confirmOpenRef.current || rewardTriggeredRef.current) return
      if (isQuietRef.current) {
        setQuietSeconds((prev) => {
          const next = prev + 1
          if (next >= targetSeconds) return targetSeconds
          return next
        })
      } else {
        setQuietSeconds(0)
      }
    }, 1000)

    return () => clearInterval(timerRef.current)
  }, [isListening, rewardEnabled, quietMinutes])

  // 达标时弹出确认框（副作用放在 useEffect 中，不放在状态更新函数里）
  useEffect(() => {
    const target = quietMinutes * 60
    if (rewardEnabled && isListening && quietSeconds >= target && !rewardTriggeredRef.current) {
      rewardTriggeredRef.current = true
      setSelectedIds(students.map((s) => s.id))
      setConfirmOpen(true)
    }
  }, [quietSeconds, rewardEnabled, isListening, quietMinutes, students])

  // 切换学生选中
  const toggleStudent = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const toggleAll = () => {
    if (selectedIds.length === students.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(students.map((s) => s.id))
    }
  }

  // 确认加分
  const handleConfirmReward = async () => {
    if (!classId || selectedIds.length === 0) {
      setRewardNotice("没有可加分的学生")
      setConfirmOpen(false)
      setQuietSeconds(0)
      rewardTriggeredRef.current = false
      return
    }
    setRewardLoading(true)
    try {
      await CloudApi.scoreBatch({
        classId,
        studentIds: selectedIds,
        ruleId: "noise-reward",
        ruleName: "安静奖励",
        score: rewardScore,
      })
      setRewardCount((prev) => prev + 1)
      const label = selectedIds.length === students.length ? "全班" : `${selectedIds.length} 人`
      setRewardNotice(`${label}各 +${rewardScore} 分！`)
      setTimeout(() => setRewardNotice(""), 3000)
    } catch {
      setRewardNotice("加分失败，请重试")
      setTimeout(() => setRewardNotice(""), 3000)
    }
    setRewardLoading(false)
    setConfirmOpen(false)
    setQuietSeconds(0)
    rewardTriggeredRef.current = false
  }

  const handleCancelReward = () => {
    setConfirmOpen(false)
    setQuietSeconds(0)
    rewardTriggeredRef.current = false
  }

  const startListening = async () => {
    setPermissionError("")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const ctx = new AudioContext()
      if (ctx.state === "suspended") await ctx.resume()
      audioCtxRef.current = ctx

      const source = ctx.createMediaStreamSource(stream)
      sourceRef.current = source

      const processor = ctx.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor

      source.connect(processor)
      processor.connect(ctx.destination)

      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0)
        let sum = 0
        for (let i = 0; i < input.length; i++) sum += input[i] * input[i]
        const rms = Math.sqrt(sum / input.length)
        const mapped = Math.max(0, Math.min(100, rms * 300))
        const smooth = smoothVolumeRef.current * 0.6 + mapped * 0.4
        smoothVolumeRef.current = smooth

        const rounded = Math.round(smooth)
        setVolume(rounded)
        setPeakVolume((prev) => Math.max(prev, rounded))
        const over = rounded >= thresholdRef.current
        setIsOverThreshold(over)
        isQuietRef.current = !over
      }

      smoothVolumeRef.current = 0
      setPeakVolume(0)
      setRewardCount(0)
      setQuietSeconds(0)
      setIsListening(true)
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setPermissionError("麦克风权限被拒绝，请在浏览器设置中允许访问麦克风")
      } else {
        setPermissionError("无法访问麦克风，请检查设备连接")
      }
    }
  }

  const stopListening = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.onaudioprocess = null
      processorRef.current.disconnect()
      processorRef.current = null
    }
    sourceRef.current?.disconnect()
    sourceRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    audioCtxRef.current?.close()
    audioCtxRef.current = null
    smoothVolumeRef.current = 0
    clearInterval(timerRef.current)
    setIsListening(false)
    setVolume(0)
    setIsOverThreshold(false)
    setQuietSeconds(0)
    setConfirmOpen(false)
  }, [])

  useEffect(() => stopListening, [stopListening])

  // 计算值
  const valueAngle = ARC_START + (volume / 100) * ARC_SWEEP
  const thresholdAngle = ARC_START + (threshold / 100) * ARC_SWEEP
  const level = getLevel(volume)
  const targetSeconds = quietMinutes * 60
  const quietProgress = targetSeconds > 0 ? Math.min(1, quietSeconds / targetSeconds) : 0

  return (
    <div className="flex flex-col gap-4">
      {/* 上方：两个等大的仪表盘 */}
      <div className="flex flex-col lg:flex-row items-stretch gap-6">

        {/* 左侧：分贝仪表盘 */}
        <div className="flex flex-col items-center gap-3 flex-1 rounded-2xl border border-gray-100 bg-white/60 p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-text-tertiary">实时音量</p>
          <div className={`relative transition-all duration-300 ${isOverThreshold ? "animate-pulse" : ""}`}>
            <svg width="280" height="260" viewBox="0 -15 300 300">
              <path d={describeArc(ARC_START, ARC_START + ARC_SWEEP, GAUGE_R)} fill="none" stroke="#e5e7eb" strokeWidth={GAUGE_STROKE} strokeLinecap="round" />
              <path d={describeArc(ARC_START, ARC_START + ARC_SWEEP * 0.3, GAUGE_R)} fill="none" stroke="#22c55e" strokeWidth={GAUGE_STROKE} strokeLinecap="round" opacity={0.2} />
              <path d={describeArc(ARC_START + ARC_SWEEP * 0.3, ARC_START + ARC_SWEEP * 0.6, GAUGE_R)} fill="none" stroke="#eab308" strokeWidth={GAUGE_STROKE} opacity={0.2} />
              <path d={describeArc(ARC_START + ARC_SWEEP * 0.6, ARC_START + ARC_SWEEP, GAUGE_R)} fill="none" stroke="#ef4444" strokeWidth={GAUGE_STROKE} strokeLinecap="round" opacity={0.2} />

              {volume > 0 && (
                <path
                  d={describeArc(ARC_START, Math.min(valueAngle, ARC_START + ARC_SWEEP), GAUGE_R)}
                  fill="none" stroke={level.color} strokeWidth={GAUGE_STROKE} strokeLinecap="round"
                />
              )}

              {(() => {
                const [tx, ty] = polarToXY(thresholdAngle, GAUGE_R - GAUGE_STROKE)
                const [tx2, ty2] = polarToXY(thresholdAngle, GAUGE_R + GAUGE_STROKE)
                return <line x1={tx} y1={ty} x2={tx2} y2={ty2} stroke="#ef4444" strokeWidth="2" strokeDasharray="4 2" opacity={0.6} />
              })()}

              <text x={GAUGE_CENTER} y={GAUGE_CENTER - 10} textAnchor="middle" fill={isListening ? level.color : "#9ca3af"} style={{ fontSize: "52px", fontWeight: 800 }}>{volume}</text>
              <text x={GAUGE_CENTER} y={GAUGE_CENTER + 20} textAnchor="middle" fill="#6b7280" style={{ fontSize: "14px" }}>{isListening ? level.label : "未开始"}</text>

              {[0, 25, 50, 75, 100].map((val) => {
                const angle = ARC_START + (val / 100) * ARC_SWEEP
                const [lx, ly] = polarToXY(angle, GAUGE_R + GAUGE_STROKE + 20)
                return <text key={val} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill="#9ca3af" style={{ fontSize: "11px" }}>{val}</text>
              })}
            </svg>

            {isOverThreshold && (
              <div className="absolute inset-0 rounded-full bg-red-500/10 animate-ping pointer-events-none" />
            )}
          </div>

          {/* 状态指示器 + 峰值 */}
          <div className="flex items-center gap-4">
            {levels.map((l) => (
              <div
                key={l.label}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition-all text-xs ${
                  isListening && level.label === l.label
                    ? `${l.bg} ring-1 ring-current ${l.text}`
                    : "text-text-tertiary"
                }`}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: l.color, opacity: isListening && level.label === l.label ? 1 : 0.3 }} />
                <span className="font-medium">{l.label}</span>
              </div>
            ))}
            {isListening && peakVolume > 0 && (
              <span className="text-xs text-text-tertiary ml-2">
                峰值 <span className="font-bold" style={{ color: getLevel(peakVolume).color }}>{peakVolume}</span>
              </span>
            )}
          </div>
        </div>

        {/* 右侧：安静奖励仪表盘 */}
        <div className="flex flex-col items-center gap-3 flex-1 rounded-2xl border border-gray-100 bg-white/60 p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-text-tertiary">安静奖励</p>

          <div className="flex flex-col items-center justify-center flex-1 gap-3">
            {rewardEnabled && isListening ? (
              <>
                <div className="relative" style={{ width: 240, height: 240 }}>
                  <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="#f3f4f6" strokeWidth="7" />
                    <circle
                      cx="60" cy="60" r="52" fill="none"
                      stroke={quietSeconds > 0 ? "#22c55e" : "#e5e7eb"}
                      strokeWidth="7"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 52}`}
                      strokeDashoffset={`${2 * Math.PI * 52 * (1 - quietProgress)}`}
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold text-text-primary">{formatTime(quietSeconds)}</span>
                    <span className="text-sm text-text-tertiary">/ {formatTime(targetSeconds)}</span>
                  </div>
                </div>
                <p className="text-xs text-text-tertiary">
                  {quietSeconds > 0 ? "保持安静中..." : "等待安静..."}
                </p>
                {rewardCount > 0 && (
                  <p className="text-sm font-bold text-primary">已奖励 {rewardCount} 次</p>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center text-text-tertiary">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity={0.2}>
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <p className="text-xs mt-3">
                  {!rewardEnabled ? "开启奖励后显示计时" : "开始监测后自动计时"}
                </p>
              </div>
            )}
          </div>

          {/* 奖励提示 */}
          {rewardNotice && (
            <div className="rounded-xl bg-green-50 px-4 py-2 text-sm font-bold text-green-600 text-center animate-fade-in">
              {rewardNotice}
            </div>
          )}
        </div>
      </div>

      {/* 下方：统一设置栏 */}
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 rounded-2xl border border-gray-100 bg-white/60 px-6 py-4">
        {/* 阈值 */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-text-tertiary whitespace-nowrap">阈值</label>
          <input type="range" min={10} max={90} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="w-28 h-1.5 rounded-full appearance-none bg-gray-200 accent-red-500" />
          <span className="text-xs font-bold text-red-500 w-6 text-right">{threshold}</span>
        </div>

        <div className="h-6 w-px bg-gray-200 hidden sm:block" />

        {/* 安静奖励开关 + 设置 */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-text-tertiary">安静奖励</span>
          <button
            type="button"
            onClick={() => setRewardEnabled(!rewardEnabled)}
            className={`relative h-5 w-9 rounded-full transition-colors ${rewardEnabled ? "bg-primary" : "bg-gray-300"}`}
          >
            <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${rewardEnabled ? "translate-x-4" : ""}`} />
          </button>
        </div>

        {rewardEnabled && (
          <>
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <span>连续安静</span>
              <input
                type="number" min={1} max={30} value={quietMinutes}
                onChange={(e) => setQuietMinutes(Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
                className="w-12 rounded-lg border border-gray-200 px-1.5 py-1 text-center text-sm font-bold text-text-primary"
              />
              <span>分钟，每人 +</span>
              <input
                type="number" min={1} max={10} value={rewardScore}
                onChange={(e) => setRewardScore(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                className="w-12 rounded-lg border border-gray-200 px-1.5 py-1 text-center text-sm font-bold text-primary"
              />
              <span>分</span>
            </div>
          </>
        )}

        <div className="h-6 w-px bg-gray-200 hidden sm:block" />

        {/* 操作按钮 */}
        {!isListening ? (
          <button type="button" onClick={startListening} className="btn-active px-6 py-2 text-sm">
            开始监测
          </button>
        ) : (
          <button
            type="button"
            onClick={stopListening}
            className="rounded-xl bg-gray-100 px-6 py-2 text-sm font-semibold text-text-secondary transition-colors hover:bg-gray-200"
          >
            停止监测
          </button>
        )}
      </div>

      {/* 权限错误 */}
      {permissionError && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 text-center">
          {permissionError}
        </div>
      )}

      {/* 确认加分弹窗 */}
      {confirmOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center animate-fade-in">
          <div className="absolute inset-0 bg-gray-900/50" onClick={handleCancelReward} />
          <div className="relative z-10 w-full max-w-2xl mx-4 rounded-2xl bg-white p-6 shadow-modal text-center animate-slide-up">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-500 mx-auto mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 12 2 2 4-4" />
                <circle cx="12" cy="12" r="10" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-1">安静目标达成！</h3>
            <p className="text-sm text-text-secondary mb-3">
              已连续安静 {quietMinutes} 分钟，选择参与的学生加分
            </p>

            {/* 全选/取消 + 计数 */}
            <div className="flex items-center justify-between mb-2 px-1">
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs font-medium text-primary hover:underline"
              >
                {selectedIds.length === students.length ? "取消全选" : "全选"}
              </button>
              <span className="text-xs text-text-tertiary">
                已选 {selectedIds.length}/{students.length} 人
              </span>
            </div>

            {/* 学生选择网格 */}
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-2 mb-4">
              <div className="flex flex-wrap gap-1.5">
                {students.map((s) => {
                  const checked = selectedIds.includes(s.id)
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleStudent(s.id)}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                        checked
                          ? "bg-green-100 text-green-700 ring-1 ring-green-300"
                          : "bg-white text-text-tertiary ring-1 ring-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      <span className={`inline-block w-3.5 h-3.5 rounded text-[10px] leading-[14px] text-center ${
                        checked ? "bg-green-500 text-white" : "bg-gray-200 text-transparent"
                      }`}>
                        ✓
                      </span>
                      {s.name}
                    </button>
                  )
                })}
              </div>
            </div>

            <p className="text-sm text-text-secondary mb-4">
              每人 <span className="font-bold text-primary">+{rewardScore} 分</span>
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCancelReward}
                disabled={rewardLoading}
                className="flex-1 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-text-secondary transition-colors hover:bg-gray-200 disabled:opacity-50"
              >
                跳过
              </button>
              <button
                type="button"
                onClick={handleConfirmReward}
                disabled={rewardLoading || selectedIds.length === 0}
                className="flex-1 btn-active px-4 py-2.5 text-sm disabled:opacity-70"
              >
                {rewardLoading ? "加分中..." : `确认奖励 (${selectedIds.length}人)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default NoiseMeter
