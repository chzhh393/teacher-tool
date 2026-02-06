import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import { beasts } from "../data/beasts"
import Modal from "../components/Modal"
import { CloudApi } from "../services/cloudApi"
import { useAuthStore } from "../stores/authStore"
import { useClassStore } from "../stores/classStore"
import type { ClassInfo, ClassSettings, ScoreRule, Student } from "../types"
import { normalizeStudents } from "../utils/normalize"

const getDefaultSettings = (): ClassSettings => ({
  systemName: "幻兽学院",
  themeColor: "coral",
  levelThresholds: [0, 5, 12, 22, 35, 50, 65, 80, 90, 100],
  scoreRules: [
    { id: "rule-01", name: "早读打卡", score: 1, icon: "📖", pinyin: "zddk", order: 1, type: "add" },
    { id: "rule-02", name: "答对问题", score: 2, icon: "💡", pinyin: "ddwt", order: 2, type: "add" },
    { id: "rule-03", name: "作业优秀", score: 3, icon: "⭐", pinyin: "zyyx", order: 3, type: "add" },
    { id: "rule-04", name: "完成背诵", score: 2, icon: "🎤", pinyin: "wcbs", order: 4, type: "add" },
    { id: "rule-05", name: "积极举手", score: 1, icon: "✋", pinyin: "jjjs", order: 5, type: "add" },
    { id: "rule-06", name: "帮助同学", score: 2, icon: "❤️", pinyin: "bztx", order: 6, type: "add" },
    { id: "rule-07", name: "值日认真", score: 2, icon: "✨", pinyin: "zrrz", order: 7, type: "add" },
    { id: "rule-08", name: "课外阅读", score: 1, icon: "📚", pinyin: "kwyd", order: 8, type: "add" },
    { id: "rule-09", name: "进步明显", score: 3, icon: "🌱", pinyin: "jbmx", order: 9, type: "add" },
    { id: "rule-11", name: "迟到", score: -1, icon: "⏰", pinyin: "cd", order: 101, type: "subtract" },
    { id: "rule-12", name: "课堂讲话", score: -2, icon: "🗣️", pinyin: "ktjh", order: 102, type: "subtract" },
    { id: "rule-13", name: "打瞌睡", score: -1, icon: "😴", pinyin: "dks", order: 103, type: "subtract" },
    { id: "rule-14", name: "未交作业", score: -2, icon: "❌", pinyin: "wjzy", order: 104, type: "subtract" },
  ],
})

const createEmptyRule = (type: "add" | "subtract"): ScoreRule => ({
  id: `rule-${Date.now()}`,
  name: "",
  score: type === "add" ? 5 : -3,
  icon: type === "add" ? "⭐" : "❌",
  pinyin: "",
  order: Date.now(),
  type,
})

const Settings = () => {
  const storedClassId = useClassStore.getState().classId
  const storedClassName = useClassStore.getState().className

  const [classInfo, setClassInfo] = useState<ClassInfo>({
    id: storedClassId || "",
    name: storedClassName || "",
  })
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [settings, setSettings] = useState<ClassSettings>(getDefaultSettings)
  const [students, setStudents] = useState<Student[]>([])
  const [newStudentName, setNewStudentName] = useState("")
  const [batchText, setBatchText] = useState("")
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createName, setCreateName] = useState("")
  const [renameModalOpen, setRenameModalOpen] = useState(false)
  const [renameName, setRenameName] = useState("")
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState<{ message: string; type: "success" | "error" } | null>(null)
  const navigate = useNavigate()
  const { token, clearAuth } = useAuthStore()
  const { classId, className, setClass } = useClassStore()

  const showNotice = (message: string, type: "success" | "error" = "success") => {
    setNotice({ message, type })
  }
  const clearNotice = () => setNotice(null)
  const getErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error && error.message) {
      return `${fallback}: ${error.message}`
    }
    if (typeof error === "string" && error) {
      return `${fallback}: ${error}`
    }
    return fallback
  }

  useEffect(() => {
    if (classId) {
      setClassInfo((prev) => ({ ...prev, id: classId }))
    }
    if (className) {
      setClassInfo((prev) => ({ ...prev, name: className }))
    }
  }, [classId, className])

  const addRules = useMemo(
    () => (settings.scoreRules || []).filter((rule) => rule.type === "add"),
    [settings]
  )
  const subtractRules = useMemo(
    () => (settings.scoreRules || []).filter((rule) => rule.type === "subtract"),
    [settings]
  )

  const loadClassList = useCallback(async () => {
    if (!token) return
    try {
      const classListResult = await CloudApi.classList()
      const nextClasses = classListResult.classes || []
      if (nextClasses.length > 0) {
        setClasses(nextClasses)
        if (!classId) {
          const firstClass = nextClasses[0]
          setClassInfo(firstClass)
          setClass(firstClass.id, firstClass.name)
        }
        return
      }
      if (classInfo.id && classInfo.name) {
        setClasses([classInfo])
      } else {
        setClasses([])
      }
    } catch (error) {
      showNotice(getErrorMessage(error, "班级列表获取失败"), "error")
    }
  }, [classId, classInfo, setClass, token])

  const refresh = useCallback(async (targetClassId?: string) => {
    const effectiveClassId = targetClassId || classId
    if (!effectiveClassId) return

    setLoading(true)
    try {
      const [classListResult, settingsResult, studentResult] = await Promise.all([
        CloudApi.classList(),
        CloudApi.settingsGet({ classId: effectiveClassId }),
        CloudApi.studentList({ classId: effectiveClassId }),
      ])

      const nextClasses = classListResult.classes || []
      if (nextClasses.length > 0) {
        setClasses(nextClasses)
      } else if (classInfo.id && classInfo.name) {
        setClasses([classInfo])
      } else {
        setClasses([])
      }
      const remoteSettings = settingsResult.settings
      const fallbackSettings = getDefaultSettings()
      if (remoteSettings) {
        setSettings({
          ...fallbackSettings,
          ...remoteSettings,
          scoreRules: remoteSettings.scoreRules || fallbackSettings.scoreRules,
          levelThresholds: remoteSettings.levelThresholds || fallbackSettings.levelThresholds,
        })
      } else {
        // 新班级没有保存过设置，重置为默认值
        setSettings(fallbackSettings)
      }
      setStudents(normalizeStudents(studentResult.students || []))
    } finally {
      setLoading(false)
    }
  }, [classId])

  useEffect(() => {
    loadClassList()
  }, [loadClassList])

  useEffect(() => {
    refresh(classId)
  }, [classId, refresh])

  const handleSaveSettings = async () => {
    const effectiveClassId = classInfo.id || classId
    if (!effectiveClassId) {
      showNotice("请先选择或创建一个班级", "error")
      return
    }
    setLoading(true)
    clearNotice()
    try {
      if (classInfo.id && classInfo.name) {
        const result = await CloudApi.classUpsert({ classInfo })
        setClass(result.classInfo.id, result.classInfo.name)
      }
      await CloudApi.settingsSave({ classId: effectiveClassId, settings })
      showNotice("设置已保存")
    } catch (error) {
      console.error(error)
      showNotice("保存失败，请稍后重试", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleAddStudent = async () => {
    if (!newStudentName.trim()) return
    const effectiveClassId = classInfo.id || classId
    if (!effectiveClassId) {
      showNotice("请先选择班级", "error")
      return
    }
    setLoading(true)
    clearNotice()
    try {
      await CloudApi.studentUpsert({
        student: {
          id: `stu-${Date.now()}`,
          name: newStudentName.trim(),
          classId: effectiveClassId,
          level: 1,
          totalScore: 0,
          availableScore: 0,
          badges: 0,
          progress: 0,
        },
      })
      setNewStudentName("")
      await refresh(effectiveClassId)
      showNotice("已添加学生")
    } catch (error) {
      console.error(error)
      showNotice("添加失败，请稍后重试", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleBatchImport = async () => {
    const names = batchText
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean)
    if (!names.length) return
    const effectiveClassId = classInfo.id || classId
    if (!effectiveClassId) {
      showNotice("请先选择班级", "error")
      return
    }
    setLoading(true)
    clearNotice()
    try {
      for (const name of names) {
        await CloudApi.studentUpsert({
          student: {
            id: `stu-${Date.now()}-${Math.random()}`,
            name,
            classId: effectiveClassId,
            level: 1,
            totalScore: 0,
            availableScore: 0,
            badges: 0,
            progress: 0,
          },
        })
      }
      setBatchText("")
      await refresh(effectiveClassId)
      showNotice(`已导入 ${names.length} 名学生`)
    } catch (error) {
      console.error(error)
      showNotice("导入失败，请稍后重试", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (!window.confirm(`确认删除学生「${studentName}」？`)) return
    setLoading(true)
    clearNotice()
    try {
      await CloudApi.studentDelete({ studentId })
      await refresh(classInfo.id || classId)
      showNotice("已删除学生")
    } catch (error) {
      console.error(error)
      showNotice("删除失败，请稍后重试", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleRandomAssign = async () => {
    if (students.length === 0) {
      showNotice("暂无学生，请先添加学生", "error")
      return
    }
    setLoading(true)
    clearNotice()
    try {
      for (const student of students) {
        const beast = beasts[Math.floor(Math.random() * beasts.length)]
        await CloudApi.studentUpsert({
          student: {
            ...student,
            beastId: beast.id,
            beastName: beast.name,
          },
        })
      }
      await refresh(classInfo.id || classId)
      showNotice("已为所有学生分配幻兽")
    } catch (error) {
      console.error(error)
      showNotice("分配失败，请稍后重试", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleRuleUpdate = (ruleId: string, patch: Partial<ScoreRule>) => {
    setSettings((prev) => ({
      ...prev,
      scoreRules: prev.scoreRules.map((rule) => (rule.id === ruleId ? { ...rule, ...patch } : rule)),
    }))
  }

  const handleRuleAdd = (type: "add" | "subtract") => {
    setSettings((prev) => ({
      ...prev,
      scoreRules: [...prev.scoreRules, createEmptyRule(type)],
    }))
  }

  const handleRuleRemove = (ruleId: string) => {
    setSettings((prev) => ({
      ...prev,
      scoreRules: prev.scoreRules.filter((rule) => rule.id !== ruleId),
    }))
  }

  const handleClassCreate = () => {
    setCreateName("")
    setCreateModalOpen(true)
  }

  const handleClassCreateSubmit = async () => {
    const name = createName.trim()
    if (!name) {
      showNotice("请输入新班级名称", "error")
      return
    }
    if (!token) {
      showNotice("登录已过期，请重新登录", "error")
      clearAuth()
      navigate("/auth")
      return
    }
    setLoading(true)
    clearNotice()
    try {
      const result = await CloudApi.classUpsert({ classInfo: { id: `class-${Date.now()}`, name: name.trim() } })
      setClassInfo(result.classInfo)
      setClass(result.classInfo.id, result.classInfo.name)
      // 新班级没有学生，只需刷新班级列表
      const classListResult = await CloudApi.classList()
      setClasses(classListResult.classes || [])
      setStudents([])
      setCreateModalOpen(false)
      showNotice("班级已创建")
    } catch (error) {
      const message = getErrorMessage(error, "创建失败，请稍后重试")
      if (message.includes("未登录或登录已过期")) {
        clearAuth()
        navigate("/auth")
        showNotice("登录已过期，请重新登录", "error")
        return
      }
      showNotice(message, "error")
    } finally {
      setLoading(false)
    }
  }

  const handleClassRename = () => {
    if (!classInfo.id) {
      showNotice("请先选择要重命名的班级", "error")
      return
    }
    setRenameName(classInfo.name || "")
    setRenameModalOpen(true)
  }

  const handleClassRenameSubmit = async () => {
    const name = renameName.trim()
    if (!name) {
      showNotice("请输入班级新名称", "error")
      return
    }
    setLoading(true)
    clearNotice()
    try {
      const result = await CloudApi.classUpsert({ classInfo: { ...classInfo, name } })
      setClassInfo(result.classInfo)
      setClass(result.classInfo.id, result.classInfo.name)
      // 刷新班级列表以更新显示
      const classListResult = await CloudApi.classList()
      setClasses(classListResult.classes || [])
      setRenameModalOpen(false)
      showNotice("班级已重命名")
    } catch (error) {
      console.error(error)
      showNotice("重命名失败，请稍后重试", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleClassDelete = () => {
    if (!classInfo.id) {
      showNotice("请先选择要删除的班级", "error")
      return
    }
    setDeleteModalOpen(true)
  }

  const handleClassDeleteConfirm = async () => {
    setLoading(true)
    clearNotice()
    try {
      const deletedClassId = classInfo.id
      await CloudApi.classDelete({ classId: deletedClassId })

      // 获取更新后的班级列表
      const classListResult = await CloudApi.classList()
      const remainingClasses = classListResult.classes || []
      setClasses(remainingClasses)

      // 如果删除的是当前选中的班级，需要切换到其他班级或清空状态
      if (deletedClassId === classId) {
        if (remainingClasses.length > 0) {
          // 切换到第一个可用的班级
          const nextClass = remainingClasses[0]
          setClassInfo(nextClass)
          setClass(nextClass.id, nextClass.name)
          await refresh(nextClass.id)
        } else {
          // 没有其他班级，清空状态
          setClassInfo({ id: "", name: "" })
          setClass("", "")
          setStudents([])
          setSettings(getDefaultSettings())
        }
      }
      setDeleteModalOpen(false)
      showNotice("班级已删除")
    } catch (error) {
      console.error(error)
      showNotice("删除失败，请稍后重试", "error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="card p-6 border border-gray-100">
        <h2 className="text-2xl font-bold text-text-primary">老师设置</h2>
        <p className="mt-2 text-sm text-text-secondary">设置等级阈值与积分规则。</p>
      </div>

      <section className="card p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-text-primary">班级管理</h3>
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-text-secondary">
          <button
            type="button"
            onClick={handleClassCreate}
            className="rounded-lg border border-gray-200 px-3 py-2"
          >
            新建班级
          </button>
          <button
            type="button"
            onClick={handleClassRename}
            className="rounded-lg border border-gray-200 px-3 py-2"
          >
            重命名班级
          </button>
          <button
            type="button"
            onClick={handleClassDelete}
            className="rounded-lg border border-red-200 px-3 py-2 text-danger"
          >
            删除班级
          </button>
        </div>
        <div className="mt-4 grid gap-2 text-sm">
          {classes.length ? (
            classes.map((cls) => (
              <button
                key={cls.id}
                type="button"
                onClick={() => {
                  setClassInfo(cls)
                  setClass(cls.id, cls.name)
                  refresh(cls.id)
                }}
                className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                  cls.id === classInfo.id
                    ? "border-primary bg-primary/10 text-primary font-semibold"
                    : "border-gray-100 bg-gray-50 hover:bg-gray-100"
                }`}
              >
                {cls.name}
                {cls.id === classInfo.id && " (当前)"}
              </button>
            ))
          ) : (
            <p className="text-sm text-text-tertiary">暂无班级，请新建班级</p>
          )}
        </div>
      </section>

      <section className="card p-6 border border-gray-100">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-text-primary">学生管理</h3>
          <button
            type="button"
            onClick={handleRandomAssign}
            className="rounded-lg btn-active px-4 py-2 text-xs font-semibold"
          >
            一键分配幻兽
          </button>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-sm font-semibold text-text-primary">添加学生</p>
            <div className="mt-3 flex gap-2">
              <input
                value={newStudentName}
                onChange={(event) => setNewStudentName(event.target.value)}
                placeholder="学生姓名"
                className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={handleAddStudent}
                className="rounded-xl bg-success/10 px-3 py-2 text-sm font-semibold text-success"
              >
                添加
              </button>
            </div>
            <p className="mt-4 text-sm font-semibold text-text-primary">批量导入</p>
            <textarea
              value={batchText}
              onChange={(event) => setBatchText(event.target.value)}
              placeholder="一行一个姓名，或用逗号分隔"
              className="mt-2 h-24 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={handleBatchImport}
              className="mt-2 rounded-xl bg-primary/10 px-3 py-2 text-sm font-semibold text-primary"
            >
              导入名单
            </button>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-sm font-semibold text-text-primary">当前学生 ({students.length})</p>
            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto text-sm">
              {students.length > 0 ? (
                students.map((student) => (
                  <div key={student.id} className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
                    <span>{student.name}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteStudent(student.id, student.name)}
                      className="text-xs text-danger"
                    >
                      删除
                    </button>
                  </div>
                ))
              ) : (
                <p className="py-4 text-center text-text-tertiary">暂无学生，请添加学生</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="card p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-text-primary">成长阈值</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {settings.levelThresholds.map((value, index) => (
            <label key={index} className="text-xs text-text-secondary">
              Lv.{index + 1}
              <input
                type="number"
                value={value}
                onChange={(event) => {
                  const next = [...settings.levelThresholds]
                  next[index] = Number(event.target.value)
                  setSettings((prev) => ({ ...prev, levelThresholds: next }))
                }}
                className="mt-2 w-full rounded-2xl border border-gray-200 px-3 py-2"
              />
            </label>
          ))}
        </div>
      </section>

      <section className="card p-6 border border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-text-primary">积分规则</h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleRuleAdd("add")}
              className="rounded-lg border border-success/30 px-3 py-1 text-xs font-semibold text-success"
            >
              + 加分项
            </button>
            <button
              type="button"
              onClick={() => handleRuleAdd("subtract")}
              className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-danger"
            >
              + 扣分项
            </button>
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {[{ label: "加分项", data: addRules }, { label: "扣分项", data: subtractRules }].map((group) => (
            <div key={group.label} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-sm font-semibold text-text-primary">{group.label}</p>
              <div className="mt-3 space-y-3">
                {group.data.map((rule) => (
                  <div key={rule.id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-white px-3 py-2">
                    <input
                      value={rule.icon}
                      onChange={(event) => handleRuleUpdate(rule.id, { icon: event.target.value })}
                      className="w-12 rounded-xl border border-gray-200 px-2 py-1 text-center"
                    />
                    <input
                      value={rule.name}
                      onChange={(event) => handleRuleUpdate(rule.id, { name: event.target.value })}
                      placeholder="规则名称"
                      className="flex-1 rounded-xl border border-gray-200 px-2 py-1 text-sm"
                    />
                    <input
                      type="number"
                      value={rule.score}
                      onChange={(event) => handleRuleUpdate(rule.id, { score: Number(event.target.value) })}
                      className="w-20 rounded-xl border border-gray-200 px-2 py-1 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => handleRuleRemove(rule.id)}
                      className="text-xs text-danger"
                    >
                      删除
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSaveSettings}
          className="rounded-lg btn-active px-6 py-2 text-sm font-semibold"
        >
          保存设置
        </button>
      </div>
      {loading ? <p className="text-xs text-text-tertiary">处理中...</p> : null}
      {notice ? (
        <div
          className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold shadow-sm ${
            notice.type === "error"
              ? "border-red-200 bg-red-50 text-danger"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          <span className="text-base">{notice.type === "error" ? "⚠️" : "✅"}</span>
          <span>{notice.message}</span>
        </div>
      ) : null}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="新建班级"
        description="请输入新的班级名称"
        footer={(
          <>
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-text-secondary"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleClassCreateSubmit}
              disabled={loading}
              className="rounded-lg btn-active px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              新建班级
            </button>
          </>
        )}
      >
        <div className="space-y-3">
          <label className="text-sm font-semibold text-text-primary">班级名称</label>
          <input
            value={createName}
            onChange={(event) => setCreateName(event.target.value)}
            placeholder="例如：三年三班"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
          <p className="text-xs text-text-tertiary">名称将用于班级切换与统计展示</p>
        </div>
      </Modal>
      <Modal
        open={renameModalOpen}
        onClose={() => setRenameModalOpen(false)}
        title="重命名班级"
        description="修改当前班级名称"
        footer={(
          <>
            <button
              type="button"
              onClick={() => setRenameModalOpen(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-text-secondary"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleClassRenameSubmit}
              disabled={loading}
              className="rounded-lg btn-active px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              保存名称
            </button>
          </>
        )}
      >
        <div className="space-y-3">
          <label className="text-sm font-semibold text-text-primary">班级名称</label>
          <input
            value={renameName}
            onChange={(event) => setRenameName(event.target.value)}
            placeholder="请输入班级名称"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
          <p className="text-xs text-text-tertiary">修改后会同步到班级切换处</p>
        </div>
      </Modal>
      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="删除班级"
        description="删除后数据无法恢复"
        footer={(
          <>
            <button
              type="button"
              onClick={() => setDeleteModalOpen(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-text-secondary"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleClassDeleteConfirm}
              disabled={loading}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-danger hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              确认删除
            </button>
          </>
        )}
      >
        <div className="rounded-xl border border-red-100 bg-red-50/60 p-3 text-sm text-danger">
          将删除班级 “{classInfo.name || "未命名班级"}”，相关学生与设置将不可恢复。
        </div>
      </Modal>
    </div>
  )
}

export default Settings
