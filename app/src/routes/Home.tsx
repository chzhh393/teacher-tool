import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"

import BeastPickerModal from "../components/BeastPickerModal"
import EvolutionCelebration, { type EvolutionEvent } from "../components/EvolutionCelebration"
import RevokeBar from "../components/RevokeBar"
import ScoreModal from "../components/ScoreModal"
import ShareModal from "../components/ShareModal"
import { beasts } from "../data/beasts"
import { getDefaultSettings } from "../data/defaults"
import { signInAnonymously } from "../lib/cloudbaseAuth"
import { CloudApi } from "../services/cloudApi"
import { useAuthStore } from "../stores/authStore"
import { useClassStore } from "../stores/classStore"
import type { ClassSummary, ScoreRule, Student } from "../types"
import { getEvolutionStage, stageNames } from "../utils/evolution"
import { normalizeScoreRecords, normalizeStudents } from "../utils/normalize"

const findBeast = (student: Student) => {
  const beastId = student.beastId || student.dinosaurId
  if (!beastId) return null
  return beasts.find((item) => item.id === beastId) || null
}

const Home = () => {
  const [summary, setSummary] = useState<ClassSummary | null>(null)
  const [studentList, setStudentList] = useState<Student[]>([])
  const [rules, setRules] = useState<ScoreRule[]>([])
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [batchMode, setBatchMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [scoreModalOpen, setScoreModalOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [activeStudent, setActiveStudent] = useState<Student | null>(null)
  const [lastRecordId, setLastRecordId] = useState<string | null>(null)
  const [lastMessage, setLastMessage] = useState<string>("")
  const [feedingIds, setFeedingIds] = useState<string[]>([])
  const [notice, setNotice] = useState("")
  const [evolutionQueue, setEvolutionQueue] = useState<EvolutionEvent[]>([])
  const [shareOpen, setShareOpen] = useState(false)
  const { classId, setClass } = useClassStore()
  const isSubAccount = useAuthStore((s) => s.role === "sub")

  const filteredStudents = useMemo(() => {
    const keyword = search.trim()
    if (!keyword) return studentList
    return studentList.filter((student) => student.name.includes(keyword))
  }, [search, studentList])

  const refresh = async (activeClassId?: string) => {
    if (!activeClassId) {
      setSummary(null)
      setStudentList([])
      return
    }
    const [summaryResult, studentResult] = await Promise.all([
      CloudApi.classGet({ classId: activeClassId }),
      CloudApi.studentList({ classId: activeClassId }),
    ])
    setSummary(summaryResult.classSummary ?? null)
    setStudentList(normalizeStudents(studentResult.students ?? []))

    if (summaryResult.classSummary?.id) {
      setClass(summaryResult.classSummary.id, summaryResult.classSummary.name)
    }

    try {
      const effectiveId = summaryResult.classSummary?.id || activeClassId
      const settingsResult = await CloudApi.settingsGet({ classId: effectiveId })
      const remoteRules = settingsResult.settings?.scoreRules
      if (remoteRules && remoteRules.length > 0) {
        setRules(remoteRules)
      } else {
        const defaults = getDefaultSettings()
        setRules(defaults.scoreRules)
        CloudApi.settingsSave({ classId: effectiveId, settings: defaults }).catch(console.error)
      }
    } catch (error) {
      setRules([])
    }
  }

  useEffect(() => {
    const connect = async () => {
      setIsLoading(true)
      try {
        const state = await signInAnonymously()
        if (state) {
          await refresh(classId)
        }
      } catch (error) {
        setSummary(null)
        setStudentList([])
      } finally {
        setIsLoading(false)
      }
    }

    connect()
  }, [])

  useEffect(() => {
    if (classId && classId !== summary?.id) {
      setStudentList([])
      setSummary(null)
      refresh(classId)
    }
  }, [classId])

  useEffect(() => {
    if (!lastRecordId || !lastMessage) return undefined
    const timer = window.setTimeout(() => {
      setLastRecordId(null)
      setLastMessage("")
    }, 3000)
    return () => window.clearTimeout(timer)
  }, [lastRecordId, lastMessage])

  useEffect(() => {
    if (!notice) return undefined
    const timer = window.setTimeout(() => setNotice(""), 3000)
    return () => window.clearTimeout(timer)
  }, [notice])

  const toggleBatch = () => {
    setBatchMode((prev) => !prev)
    setSelectedIds([])
    setActiveStudent(null)
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    setSelectedIds(filteredStudents.map((student) => student.id))
  }

  const handleClearSelection = () => {
    setSelectedIds([])
  }

  const openScoreModal = (student?: Student) => {
    // 1. 单个学生
    if (student) {
      if (!findBeast(student)) {
        setNotice(`「${student.name}」还没有领养幻兽，请先领养`)
        return
      }
      setActiveStudent(student)
      setSelectedIds([student.id])
      setScoreModalOpen(true)
      return
    }

    // 2. 批量模式 / 全班操作：找出未领养的学生
    const targets = batchMode
      ? studentList.filter((s) => selectedIds.includes(s.id))
      : studentList
    const unadopted = targets.filter((s) => !findBeast(s))

    if (unadopted.length > 0) {
      const names = unadopted.slice(0, 5).map((s) => s.name).join("、")
      const suffix = unadopted.length > 5 ? `等${unadopted.length}人` : ""
      setNotice(`${names}${suffix}还没有领养幻兽，请先领养`)
      return
    }

    setActiveStudent(null)
    if (!batchMode) {
      setSelectedIds([])
    }
    setScoreModalOpen(true)
  }

  const handleScore = async (rule: ScoreRule) => {
    const activeClassId = classId || summary?.id
    if (!activeClassId) return
    const ids = activeStudent
      ? [activeStudent.id]
      : selectedIds.length > 0
        ? selectedIds
        : studentList.map((student) => student.id)
    if (!ids.length) return

    // 1. 快照当前学生等级（用于进化检测）
    const oldStudents = [...studentList]

    setScoreModalOpen(false)
    setFeedingIds(ids)
    try {
      const batchResult = await CloudApi.scoreBatch({
        classId: activeClassId,
        studentIds: ids,
        ruleId: rule.id,
        ruleName: rule.name,
        score: rule.score,
      })

      // 用本地数据构建提示，避免数据库一致性延迟导致显示错误
      const scoredName = ids.length === 1
        ? (activeStudent?.name || studentList.find((s) => s.id === ids[0])?.name || "")
        : `${ids.length}名同学`
      const scoreText = rule.score > 0 ? `+${rule.score}` : `${rule.score}`
      setLastMessage(`${scoredName} ${rule.name} ${scoreText}`)

      // 用后端返回的 recordId 做撤回；兜底查最新记录
      const returnedId = batchResult.recordIds?.[batchResult.recordIds.length - 1]
      if (returnedId) {
        setLastRecordId(returnedId)
      } else {
        const recordResult = await CloudApi.recordList({
          classId: activeClassId,
          page: 1,
          pageSize: 1,
        })
        const latest = normalizeScoreRecords(recordResult.records || [])[0]
        if (latest) {
          setLastRecordId(latest.id)
        }
      }

      // 2. 刷新并获取新数据
      const [summaryResult, studentResult] = await Promise.all([
        CloudApi.classGet({ classId: activeClassId }),
        CloudApi.studentList({ classId: activeClassId }),
      ])
      setSummary(summaryResult.classSummary ?? null)
      const newStudents = normalizeStudents(studentResult.students ?? [])
      setStudentList(newStudents)

      if (summaryResult.classSummary?.id) {
        setClass(summaryResult.classSummary.id, summaryResult.classSummary.name)
      }

      try {
        const effectiveId = summaryResult.classSummary?.id || activeClassId
        const settingsResult = await CloudApi.settingsGet({ classId: effectiveId })
        const remoteRules = settingsResult.settings?.scoreRules
        if (remoteRules && remoteRules.length > 0) {
          setRules(remoteRules)
        } else {
          const defaults = getDefaultSettings()
          setRules(defaults.scoreRules)
          CloudApi.settingsSave({ classId: effectiveId, settings: defaults }).catch(console.error)
        }
      } catch {
        setRules([])
      }

      // 3. 检测进化（仅加分时）
      if (rule.score > 0) {
        const oldMap = new Map(oldStudents.map((s) => [s.id, s]))
        const evolutions: EvolutionEvent[] = []
        for (const newStudent of newStudents) {
          if (!ids.includes(newStudent.id)) continue
          const oldStudent = oldMap.get(newStudent.id)
          if (!oldStudent) continue
          const oldStage = getEvolutionStage(oldStudent.level)
          const newStage = getEvolutionStage(newStudent.level)
          if (oldStage !== newStage) {
            const beast = findBeast(newStudent)
            if (beast) {
              evolutions.push({ studentName: newStudent.name, beast, oldStage, newStage })
            }
          }
        }
        if (evolutions.length > 0) {
          setEvolutionQueue(evolutions.slice(0, 5))
        }
      }
    } catch (error) {
      setLastMessage("操作失败，请稍后重试")
    } finally {
      setFeedingIds([])
    }
  }

  const handleRevoke = async () => {
    if (!lastRecordId) return
    setIsLoading(true)
    try {
      await CloudApi.scoreRevoke({ recordId: lastRecordId })
      setLastRecordId(null)
      setLastMessage("")
      await refresh(classId)
    } catch (error) {
      setLastMessage("撤回失败")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAssignBeast = async (beast: (typeof beasts)[0]) => {
    if (!activeStudent) return
    setPickerOpen(false)
    setIsLoading(true)
    try {
      const isMaxLevel = activeStudent.level >= 10
      const studentData = {
        ...activeStudent,
        beastId: beast.id,
        beastName: beast.name,
        ...(isMaxLevel ? { totalScore: 0, level: 1, progress: 0 } : {}),
      }
      await CloudApi.studentUpsert({ student: studentData })
      await refresh(classId)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-text-secondary">加载中...</p>
      </div>
    )
  }

  if (!classId || !summary) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-6xl mb-4">📚</div>
        <h2 className="text-xl font-bold text-text-primary mb-2">还没有班级</h2>
        <p className="text-sm text-text-secondary mb-6">
          {isSubAccount ? "暂无可访问的班级，请联系主账号授权" : "请先在「老师设置」中创建班级"}
        </p>
        {!isSubAccount && (
          <Link
            to="/settings"
            className="btn-active px-6 py-2 text-sm"
          >
            前往创建班级
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${batchMode ? "pb-24" : ""}`}>
      <section className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-text-primary">学生卡片</h3>
            <p className="hidden text-xs text-text-secondary mt-1 md:block">管理学生积分与详情。</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 md:w-40"
              placeholder="搜索学生..."
            />
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="btn-default rounded-lg px-3 py-1.5 text-xs font-semibold"
            >
              分享家长
            </button>
            <button
              type="button"
              onClick={toggleBatch}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${batchMode
                ? "btn-active shadow-md"
                : "btn-default"
                }`}
            >
              {batchMode ? "结束批量" : "批量模式"}
            </button>
            <button
              type="button"
              onClick={() => openScoreModal()}
              className="btn-default px-3 py-1.5 text-xs font-semibold"
            >
              {batchMode ? "批量操作" : "全班操作"}
            </button>
          </div>
        </div>
      </section>

      <div className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
        {filteredStudents.map((student, index) => {
          const beast = findBeast(student)
          const selected = selectedIds.includes(student.id)
          const stage = getEvolutionStage(student.level)
          const stageName = stageNames[stage]
          const isFeeding = feedingIds.includes(student.id)
          const isMaxLevel = student.level >= 10
          return (
            <div
              key={student.id || `student-${index}`}
              onClick={() => (batchMode ? toggleSelect(student.id) : openScoreModal(student))}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  batchMode ? toggleSelect(student.id) : openScoreModal(student)
                }
              }}
              className={`group relative cursor-pointer touch-manipulation rounded-2xl border p-2 text-left shadow-sm transition duration-200 md:p-4 ${batchMode ? "pt-8" : ""} ${isFeeding
                ? "border-primary bg-primary/5 shadow-lg ring-2 ring-primary/50 animate-pulse"
                : selected
                  ? "border-primary bg-primary/5 shadow-md ring-1 ring-primary"
                  : "border-gray-100 bg-white hover:-translate-y-1 hover:shadow-md hover:border-primary/40"
                }`}
            >
              {batchMode ? (
                <span
                  className={`absolute left-3 top-3 flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold transition ${selected
                    ? "border-primary bg-primary text-white shadow-sm"
                    : "border-gray-200 bg-white text-text-tertiary"
                    }`}
                >
                  {selected ? "✓" : ""}
                </span>
              ) : null}
              {/* 手机端：名字 等级 幻兽名 形态 一行 */}
              <div className="mb-1 flex items-center gap-1 text-[10px] leading-tight md:hidden">
                <span className="shrink-0 text-xs font-bold text-text-primary">{student.name}</span>
                <span className={`shrink-0 rounded px-1 py-0.5 font-semibold ${isMaxLevel ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"}`}>
                  {isMaxLevel ? "MAX" : `Lv.${student.level}`}
                </span>
                <span className="truncate text-text-tertiary">
                  {beast ? `${beast.name}·${isMaxLevel ? "收集完成" : stageName}` : "未领养"}
                </span>
              </div>
              {/* 桌面端：名字+等级 */}
              <div className="hidden items-center justify-between mb-3 md:flex">
                <p className="text-base font-bold text-text-primary">{student.name}</p>
                <span className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${isMaxLevel ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"}`}>
                  {isMaxLevel ? "MAX" : `Lv.${student.level}`}
                </span>
              </div>

              <div className={`aspect-square max-h-28 mx-auto rounded-2xl p-2 flex items-center justify-center overflow-hidden md:max-h-none md:mx-0 md:p-4 ${isMaxLevel ? "bg-gradient-to-br from-amber-50 to-orange-50 ring-2 ring-amber-300/50" : isFeeding ? "bg-gradient-to-br from-primary/10 to-primary/5" : "bg-gradient-to-br from-gray-50 to-gray-100"}`}>
                {beast ? (
                  <img
                    src={beast.images[stage]}
                    alt={beast.name}
                    className={`h-full w-full object-contain drop-shadow-md ${isFeeding
                      ? "animate-bounce"
                      : "transition-transform duration-300 group-hover:scale-110"
                      }`}
                  />
                ) : (
                  <div className={`text-6xl opacity-50 ${isFeeding ? "animate-bounce" : ""}`}>🥚</div>
                )}
              </div>

              <div className="mt-3 hidden items-center justify-between md:flex">
                <div>
                  <p className="text-sm font-medium text-text-secondary">{beast?.name || "未领养"}</p>
                  {beast && (
                    <p className="text-xs text-text-tertiary">
                      {isMaxLevel ? "已收集完成 🏆" : `${stageName}形态`}
                    </p>
                  )}
                </div>
                {!isSubAccount && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      setActiveStudent(student)
                      setPickerOpen(true)
                    }}
                    className={`rounded-lg border px-2 py-1 text-xs font-semibold transition-colors ${isMaxLevel
                      ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                      : "border-gray-200 text-text-secondary hover:border-primary hover:text-primary hover:bg-primary/5"
                    }`}
                  >
                    {isMaxLevel ? "领养新幻兽" : beast ? "更换" : "领养"}
                  </button>
                )}
              </div>

              {/* 手机端：未领养或满级时显示领养按钮 */}
              {(isMaxLevel || !beast) && !isSubAccount && (
                <div className="mt-2 md:hidden">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      setActiveStudent(student)
                      setPickerOpen(true)
                    }}
                    className={`w-full rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors ${isMaxLevel
                      ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                      : "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
                    }`}
                  >
                    {isMaxLevel ? "领养新幻兽" : "领养"}
                  </button>
                </div>
              )}

              <div className="mt-2 md:mt-3">
                <div className="hidden items-center justify-between text-xs text-text-tertiary mb-1 md:flex">
                  <span>{isMaxLevel ? "收集完成" : `进度 ${student.progress}%`}</span>
                  <span>成长值 {student.totalScore}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${isMaxLevel ? "bg-gradient-to-r from-amber-400 to-orange-400" : isFeeding ? "bg-gradient-to-r from-primary via-primary/70 to-primary animate-pulse" : "bg-primary"}`}
                    style={{ width: isMaxLevel ? "100%" : `${student.progress}%` }}
                  />
                </div>
                {isFeeding && (
                  <p className="mt-2 text-xs text-primary font-medium text-center animate-pulse">
                    🍖 喂养中...
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <ScoreModal
        open={scoreModalOpen}
        onClose={() => setScoreModalOpen(false)}
        rules={rules}
        onSubmit={handleScore}
      />

      <BeastPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleAssignBeast}
      />

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        students={studentList}
      />

      {lastRecordId && lastMessage ? <RevokeBar message={lastMessage} onRevoke={handleRevoke} /> : null}

      {notice ? (
        <div className="fixed inset-x-0 bottom-1/3 z-50 flex justify-center pointer-events-none">
          <div className="pointer-events-auto rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-medium text-amber-800 shadow-lg">
            {notice}
          </div>
        </div>
      ) : null}

      {batchMode ? (
        <div className="fixed inset-x-0 bottom-16 z-40 md:bottom-0">
          <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4 border border-white/70 bg-white/85 px-3 py-2 shadow-soft backdrop-blur md:px-4 md:py-3">
            <div className="flex items-center gap-3 text-xs text-text-secondary md:text-sm">
              <span>
                已选择 <span className="font-semibold text-text-primary">{selectedIds.length}</span> 人
              </span>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs font-semibold text-primary hover:underline"
              >
                全选
              </button>
              <button
                type="button"
                onClick={handleClearSelection}
                className="text-xs font-semibold text-text-secondary hover:text-text-primary"
              >
                清空
              </button>
            </div>
            <button
              type="button"
              onClick={() => openScoreModal()}
              disabled={selectedIds.length === 0}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold shadow-md transition md:px-5 md:py-2 md:text-sm ${selectedIds.length
                ? "bg-primary text-white hover:brightness-105"
                : "bg-gray-100 text-text-tertiary cursor-not-allowed"
                }`}
            >
              批量喂养
            </button>
          </div>
        </div>
      ) : null}

      {evolutionQueue.length > 0 && (
        <EvolutionCelebration
          queue={evolutionQueue}
          onComplete={() => setEvolutionQueue([])}
        />
      )}
    </div >
  )
}

export default Home
