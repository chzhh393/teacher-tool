import { useEffect, useMemo, useState } from "react"

import BeastPickerModal from "../components/BeastPickerModal"
import RevokeBar from "../components/RevokeBar"
import ScoreModal from "../components/ScoreModal"
import { beasts, type EvolutionStage } from "../data/beasts"
import { scoreRules as mockRules } from "../data/mock"
import { signInAnonymously } from "../lib/cloudbaseAuth"
import { CloudApi } from "../services/cloudApi"
import { useClassStore } from "../stores/classStore"
import type { ClassSummary, ScoreRule, Student } from "../types"
import { normalizeScoreRecords, normalizeStudents } from "../utils/normalize"

const findBeast = (student: Student) => {
  const beastId = student.beastId || student.dinosaurId
  if (!beastId) return null
  return beasts.find((item) => item.id === beastId) || null
}

const getEvolutionStage = (level: number): EvolutionStage => {
  if (level <= 1) return 'egg'
  if (level <= 3) return 'baby'
  if (level <= 5) return 'juvenile'
  if (level <= 7) return 'adult'
  return 'ultimate'
}

const stageNames: Record<EvolutionStage, string> = {
  egg: '蛋',
  baby: '幼年',
  juvenile: '少年',
  adult: '成年',
  ultimate: '究极',
}

const Home = () => {
  const [summary, setSummary] = useState<ClassSummary | null>(null)
  const [studentList, setStudentList] = useState<Student[]>([])
  const [rules, setRules] = useState<ScoreRule[]>(mockRules)
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
  const { classId, setClass } = useClassStore()

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
      const settingsResult = await CloudApi.settingsGet({
        classId: summaryResult.classSummary?.id || activeClassId,
      })
      if (settingsResult.settings) {
        setRules(settingsResult.settings.scoreRules || mockRules)
      }
    } catch (error) {
      setRules(mockRules)
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
    if (student) {
      setActiveStudent(student)
      setSelectedIds([student.id])
    } else {
      setActiveStudent(null)
      if (!batchMode) {
        setSelectedIds([])
      }
    }
    setScoreModalOpen(true)
  }

  const handleScore = async (rule: ScoreRule) => {
    const activeClassId = classId || summary?.id
    if (!activeClassId) return
    const ids = batchMode
      ? selectedIds
      : activeStudent
        ? [activeStudent.id]
        : studentList.map((student) => student.id)
    if (!ids.length) return

    setScoreModalOpen(false)
    setFeedingIds(ids)
    try {
      await CloudApi.scoreBatch({
        classId: activeClassId,
        studentIds: ids,
        ruleId: rule.id,
        ruleName: rule.name,
        score: rule.score,
      })
      const recordResult = await CloudApi.recordList({
        classId: activeClassId,
        page: 1,
        pageSize: 1,
      })
      const latest = normalizeScoreRecords(recordResult.records || [])[0]
      if (latest) {
        setLastRecordId(latest.id)
        setLastMessage(`${latest.studentName} ${latest.ruleName} ${latest.score > 0 ? `+${latest.score}` : latest.score}`)
      }
      await refresh(activeClassId)
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
      await CloudApi.studentUpsert({
        student: {
          ...activeStudent,
          beastId: beast.id,
          beastName: beast.name,
        },
      })
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
        <p className="text-sm text-text-secondary mb-6">请先在「老师设置」中创建班级</p>
        <a
          href="/settings"
          className="btn-active px-6 py-2 text-sm"
        >
          前往创建班级
        </a>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${batchMode ? "pb-24" : ""}`}>
      <section className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-text-primary">学生卡片</h3>
            <p className="text-xs text-text-secondary mt-1">管理学生积分与详情。</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-40 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="搜索学生..."
            />
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
              className="btn-active shadow-md px-3 py-1.5 text-xs"
            >
              {batchMode ? "批量操作" : "全班操作"}
            </button>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {filteredStudents.map((student) => {
          const beast = findBeast(student)
          const selected = selectedIds.includes(student.id)
          const stage = getEvolutionStage(student.level)
          const stageName = stageNames[stage]
          const isFeeding = feedingIds.includes(student.id)
          return (
            <div
              key={student.id}
              onClick={() => (batchMode ? toggleSelect(student.id) : openScoreModal(student))}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  batchMode ? toggleSelect(student.id) : openScoreModal(student)
                }
              }}
              className={`group relative cursor-pointer rounded-2xl border p-4 text-left shadow-sm transition duration-200 ${batchMode ? "pt-8" : ""} ${isFeeding
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
              <div className="flex items-center justify-between mb-3">
                <p className="text-base font-bold text-text-primary">{student.name}</p>
                <span className="rounded-lg bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  Lv.{student.level}
                </span>
              </div>

              <div className={`aspect-square rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 p-4 flex items-center justify-center overflow-hidden ${isFeeding ? "bg-gradient-to-br from-primary/10 to-primary/5" : ""}`}>
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

              <div className="mt-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary">{beast?.name || "未领养"}</p>
                  {beast && <p className="text-xs text-text-tertiary">{stageName}形态</p>}
                </div>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    setActiveStudent(student)
                    setPickerOpen(true)
                  }}
                  className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-text-secondary transition-colors hover:border-primary hover:text-primary hover:bg-primary/5"
                >
                  {beast ? "更换" : "领养"}
                </button>
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-text-tertiary mb-1">
                  <span>进度 {student.progress}%</span>
                  <span>积分 {student.availableScore}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${isFeeding ? "bg-gradient-to-r from-primary via-primary/70 to-primary animate-pulse" : "bg-primary"}`}
                    style={{ width: `${student.progress}%` }}
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

      {lastRecordId && lastMessage ? <RevokeBar message={lastMessage} onRevoke={handleRevoke} /> : null}

      {batchMode ? (
        <div className="fixed inset-x-0 bottom-0 z-40">
          <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4 border border-white/70 bg-white/85 px-4 py-3 shadow-soft backdrop-blur">
            <div className="flex items-center gap-3 text-sm text-text-secondary">
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
              className={`rounded-full px-5 py-2 text-sm font-semibold shadow-md transition ${selectedIds.length
                ? "bg-primary text-white hover:brightness-105"
                : "bg-gray-100 text-text-tertiary cursor-not-allowed"
                }`}
            >
              批量喂养
            </button>
          </div>
        </div>
      ) : null}
    </div >
  )
}

export default Home
