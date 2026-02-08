import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Reorder, useDragControls } from "framer-motion"
import { useNavigate } from "react-router-dom"

import { beasts } from "../data/beasts"
import ExcelImportModal from "../components/ExcelImportModal"
import Modal from "../components/Modal"
import { CloudApi } from "../services/cloudApi"
import { useAuthStore } from "../stores/authStore"
import { useClassStore } from "../stores/classStore"
import type { ClassInfo, ClassSettings, ScoreRule, ShopItem, Student } from "../types"
import { getEvolutionStage, stageNames } from "../utils/evolution"
import { normalizeShopItems, normalizeStudents } from "../utils/normalize"
import { getDefaultSettings } from "../data/defaults"

const getDefaultShopItems = (): ShopItem[] => [
  { id: "item-default-5", name: "铅笔", description: "一支铅笔", cost: 10, icon: "✏️", type: "physical", stock: 50, limitPerStudent: 2, order: 0 },
  { id: "item-default-6", name: "作业本", description: "一本作业本", cost: 15, icon: "📒", type: "physical", stock: 30, limitPerStudent: 2, order: 1 },
  { id: "item-default-7", name: "小零食", description: "老师准备的小零食", cost: 20, icon: "🍪", type: "physical", stock: 40, limitPerStudent: 2, order: 2 },
  { id: "item-default-2", name: "前排座位券", description: "选择一周的座位", cost: 30, icon: "🪑", type: "privilege", stock: 15, limitPerStudent: 1, order: 3 },
  { id: "item-default-3", name: "选同桌券", description: "选择下周的同桌", cost: 40, icon: "🤝", type: "privilege", stock: 10, limitPerStudent: 1, order: 4 },
  { id: "item-default-8", name: "小组长体验", description: "当一周小组长", cost: 40, icon: "🧑‍🏫", type: "privilege", stock: 8, limitPerStudent: 1, order: 5 },
  { id: "item-default-1", name: "免作业卡", description: "免写一次作业", cost: 50, icon: "🎫", type: "privilege", stock: 10, limitPerStudent: 1, order: 6 },
  { id: "item-default-4", name: "当一天班长", description: "体验一天班长", cost: 60, icon: "👑", type: "privilege", stock: 6, limitPerStudent: 1, order: 7 },
]

const createEmptyShopItem = (): ShopItem => ({
  id: `item-${Date.now()}`,
  name: "",
  description: "",
  cost: 10,
  icon: "🎁",
  type: "physical",
  stock: 10,
  limitPerStudent: 0,
  order: Date.now(),
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

const DragItem = ({ value, children }: { value: unknown; children: React.ReactNode }) => {
  const controls = useDragControls()
  return (
    <Reorder.Item
      value={value}
      dragListener={false}
      dragControls={controls}
      className="flex flex-wrap items-center gap-2 rounded-2xl bg-white px-3 py-2"
    >
      <span
        className="cursor-grab active:cursor-grabbing text-text-tertiary select-none touch-none"
        onPointerDown={(e) => controls.start(e)}
        title="拖动排序"
      >⠿</span>
      {children}
    </Reorder.Item>
  )
}

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
  const [shopItems, setShopItems] = useState<ShopItem[]>(getDefaultShopItems)
  const [newStudentName, setNewStudentName] = useState("")
  const [batchText, setBatchText] = useState("")
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createName, setCreateName] = useState("")
  const [templateSource, setTemplateSource] = useState<"default" | "copy">("default")
  const [sourceClassId, setSourceClassId] = useState("")
  const [renameModalOpen, setRenameModalOpen] = useState(false)
  const [renameName, setRenameName] = useState("")
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [excelModalOpen, setExcelModalOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [activeSection, setActiveSection] = useState("class")
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({ class: null, students: null, rules: null, shop: null })
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState<{ message: string; type: "success" | "error" } | null>(null)
  const navigate = useNavigate()
  const { token, clearAuth } = useAuthStore()
  const { classId, className, setClass } = useClassStore()

  const showNotice = (message: string, type: "success" | "error" = "success") => {
    setNotice({ message, type })
    if (type === "success") {
      setTimeout(() => setNotice(null), 2500)
    }
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
      const [classListResult, settingsResult, studentResult, shopResult] = await Promise.all([
        CloudApi.classList(),
        CloudApi.settingsGet({ classId: effectiveClassId }),
        CloudApi.studentList({ classId: effectiveClassId }),
        CloudApi.shopList({ classId: effectiveClassId }),
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
        // 新班级没有保存过设置，重置为默认值并自动保存到数据库
        setSettings(fallbackSettings)
        CloudApi.settingsSave({ classId: effectiveClassId, settings: fallbackSettings }).catch(console.error)
      }
      setStudents(normalizeStudents(studentResult.students || []))
      const remoteShopItems = normalizeShopItems(shopResult.items || [])
      if (remoteShopItems.length > 0) {
        setShopItems(remoteShopItems)
      } else {
        // 新班级没有商品，自动初始化默认商品到数据库
        const defaults = getDefaultShopItems()
        setShopItems(defaults)
        CloudApi.shopSave({ classId: effectiveClassId, items: defaults }).catch(console.error)
      }
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
    // 校验积分规则
    const emptyRule = settings.scoreRules.find((r) => !r.name.trim())
    if (emptyRule) {
      showNotice("积分规则名称不能为空，请检查后重试", "error")
      return
    }
    // 校验小卖部商品
    const emptyShopItem = shopItems.find((item) => !item.name.trim())
    if (emptyShopItem) {
      showNotice("商品名称不能为空，请检查后重试", "error")
      return
    }
    setLoading(true)
    clearNotice()
    try {
      if (classInfo.id && classInfo.name) {
        const result = await CloudApi.classUpsert({ classInfo })
        setClass(result.classInfo.id, result.classInfo.name)
      }
      await Promise.all([
        CloudApi.settingsSave({ classId: effectiveClassId, settings }),
        CloudApi.shopSave({ classId: effectiveClassId, items: shopItems }),
      ])
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

  const handleExcelImport = async (names: string[]) => {
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
      setExcelModalOpen(false)
      await refresh(effectiveClassId)
      showNotice(`已通过 Excel 导入 ${names.length} 名学生`)
    } catch (error) {
      console.error(error)
      showNotice("Excel 导入失败，请稍后重试", "error")
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

  const handleReorderAddRules = (newAddRules: ScoreRule[]) => {
    setSettings((prev) => ({
      ...prev,
      scoreRules: [...newAddRules, ...prev.scoreRules.filter((r) => r.type === "subtract")],
    }))
  }

  const handleReorderSubtractRules = (newSubtractRules: ScoreRule[]) => {
    setSettings((prev) => ({
      ...prev,
      scoreRules: [...prev.scoreRules.filter((r) => r.type === "add"), ...newSubtractRules],
    }))
  }

  const handleReorderShopItems = (newItems: ShopItem[]) => {
    setShopItems(newItems)
  }

  const handleShopItemUpdate = (itemId: string, patch: Partial<ShopItem>) => {
    setShopItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, ...patch } : item)))
  }

  const handleShopItemAdd = () => {
    setShopItems((prev) => [...prev, createEmptyShopItem()])
  }

  const handleShopItemRemove = (itemId: string) => {
    setShopItems((prev) => prev.filter((item) => item.id !== itemId))
  }

  const handleClassCreate = () => {
    setCreateName("")
    setTemplateSource("default")
    setSourceClassId("")
    setCreateModalOpen(true)
  }

  const handleClassCreateSubmit = async () => {
    const name = createName.trim()
    if (!name) {
      showNotice("请输入新班级名称", "error")
      return
    }
    if (templateSource === "copy" && !sourceClassId) {
      showNotice("请选择要复制设置的源班级", "error")
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
      const newClassId = result.classInfo.id

      // 从已有班级复制设置和商品
      if (templateSource === "copy" && sourceClassId) {
        const [sourceSettingsResult, sourceShopResult] = await Promise.all([
          CloudApi.settingsGet({ classId: sourceClassId }),
          CloudApi.shopList({ classId: sourceClassId }),
        ])
        const fallbackSettings = getDefaultSettings()
        const sourceSettings = sourceSettingsResult.settings
        const newSettings = sourceSettings
          ? {
              ...fallbackSettings,
              ...sourceSettings,
              id: undefined,
              classId: undefined,
              scoreRules: sourceSettings.scoreRules || fallbackSettings.scoreRules,
              levelThresholds: sourceSettings.levelThresholds || fallbackSettings.levelThresholds,
            }
          : fallbackSettings
        const sourceShopItems = normalizeShopItems(sourceShopResult.items || [])
        const newShopItems = sourceShopItems.length > 0 ? sourceShopItems : getDefaultShopItems()
        await Promise.all([
          CloudApi.settingsSave({ classId: newClassId, settings: newSettings }),
          CloudApi.shopSave({ classId: newClassId, items: newShopItems }),
        ])
      }

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

  const tabs = [
    { key: "class", label: "班级管理" },
    { key: "students", label: "学生管理" },
    { key: "rules", label: "成长与积分" },
    { key: "shop", label: "小卖部" },
  ]

  const scrollTo = (key: string) => {
    const el = sectionRefs.current[key]
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY - 160
    window.scrollTo({ top, behavior: "smooth" })
  }

  useEffect(() => {
    const elements = Object.entries(sectionRefs.current).filter(
      (entry): entry is [string, HTMLElement] => entry[1] !== null,
    )
    if (elements.length === 0) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const key = entry.target.getAttribute("data-section")
            if (key) setActiveSection(key)
          }
        }
      },
      { rootMargin: "-20% 0px -60% 0px" },
    )

    for (const [, el] of elements) observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="space-y-6">
      <div className="sticky top-[4.25rem] z-30 -mt-2">
        <div className="rounded-2xl border border-gray-100 bg-white/95 backdrop-blur shadow-sm flex overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => scrollTo(tab.key)}
              className={`relative whitespace-nowrap px-4 py-2.5 text-sm font-semibold transition-colors ${
                activeSection === tab.key
                  ? "text-primary"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              {tab.label}
              {activeSection === tab.key && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </div>
        </div>

      <section
        ref={(el) => { sectionRefs.current.class = el }}
        data-section="class"
        className="card p-6 border border-gray-100 scroll-mt-36"
      >
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

      <section
        ref={(el) => { sectionRefs.current.students = el }}
        data-section="students"
        className="card p-6 border border-gray-100 space-y-4 scroll-mt-36"
      >
        <h3 className="text-lg font-semibold text-text-primary">学生管理</h3>
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-semibold text-text-primary">幻兽分配方式</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🤩</span>
                <span className="text-sm font-semibold text-text-primary">玩法一：学生自己选</span>
              </div>
              <p className="mt-1.5 text-xs text-text-tertiary">在班级主页打开投屏，让学生点击自己卡片上的「领养」按钮挑选心仪的幻兽</p>
              <button
                type="button"
                onClick={() => navigate("/")}
                className="mt-3 w-full rounded-lg btn-active px-4 py-2 text-xs font-semibold"
              >
                前往班级主页
              </button>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎲</span>
                <span className="text-sm font-semibold text-text-primary">玩法二：老师随机分配</span>
              </div>
              <p className="mt-1.5 text-xs text-text-tertiary">一键为全班学生随机分配幻兽，快速开启养成之旅</p>
              <button
                type="button"
                onClick={handleRandomAssign}
                className="mt-3 w-full rounded-lg border border-primary/30 bg-white px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/5"
              >
                一键随机分配
              </button>
            </div>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
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
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={handleBatchImport}
                className="rounded-xl bg-primary/10 px-3 py-2 text-sm font-semibold text-primary"
              >
                导入名单
              </button>
              <button
                type="button"
                onClick={() => setExcelModalOpen(true)}
                className="rounded-xl bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-600"
              >
                Excel 导入
              </button>
            </div>
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

      <section
        ref={(el) => { sectionRefs.current.rules = el }}
        data-section="rules"
        className="card p-6 border border-gray-100 space-y-6 scroll-mt-36"
      >
        <div>
          <h3 className="text-lg font-semibold text-text-primary">成长阈值</h3>
          <p className="mt-1 text-xs text-text-tertiary">每个等级需要的累计成长值，决定幻兽的进化节奏</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {settings.levelThresholds.map((value, index) => {
              const level = index + 1
              const stage = getEvolutionStage(level)
              const name = stageNames[stage]
              const isMaxLevel = level === 10
              const stageIcons: Record<string, string> = { egg: "🥚", baby: "👶", juvenile: "🧒", adult: "💪", ultimate: "👑" }
              return (
                <label key={index} className="text-xs text-text-secondary">
                  <span className="flex items-center gap-1">
                    Lv.{level}
                    <span className="text-text-tertiary">{stageIcons[stage]} {isMaxLevel ? "满级" : name}</span>
                  </span>
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
              )
            })}
          </div>
        </div>

        <hr className="border-gray-100" />

        <div>
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
            {[
              { label: "加分项", data: addRules, onReorder: handleReorderAddRules },
              { label: "扣分项", data: subtractRules, onReorder: handleReorderSubtractRules },
            ].map((group) => (
              <div key={group.label} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-sm font-semibold text-text-primary">{group.label}</p>
                <Reorder.Group axis="y" values={group.data} onReorder={group.onReorder} className="mt-3 space-y-3">
                  {group.data.map((rule) => (
                    <DragItem key={rule.id} value={rule}>
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
                    </DragItem>
                  ))}
                </Reorder.Group>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        ref={(el) => { sectionRefs.current.shop = el }}
        data-section="shop"
        className="card p-6 border border-gray-100 scroll-mt-36"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-text-primary">小卖部商品</h3>
          <button
            type="button"
            onClick={handleShopItemAdd}
            className="rounded-lg border border-primary/30 px-3 py-1 text-xs font-semibold text-primary"
          >
            + 添加商品
          </button>
        </div>
        <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
          {shopItems.length > 0 ? (
            <Reorder.Group axis="y" values={shopItems} onReorder={handleReorderShopItems} className="space-y-3">
              {shopItems.map((item) => (
                <DragItem key={item.id} value={item}>
                  <input
                    value={item.icon}
                    onChange={(e) => handleShopItemUpdate(item.id, { icon: e.target.value })}
                    className="w-12 rounded-xl border border-gray-200 px-2 py-1 text-center"
                  />
                  <input
                    value={item.name}
                    onChange={(e) => handleShopItemUpdate(item.id, { name: e.target.value })}
                    placeholder="商品名称"
                    className="min-w-0 flex-1 rounded-xl border border-gray-200 px-2 py-1 text-sm"
                  />
                  <input
                    value={item.description}
                    onChange={(e) => handleShopItemUpdate(item.id, { description: e.target.value })}
                    placeholder="描述"
                    className="min-w-0 flex-1 rounded-xl border border-gray-200 px-2 py-1 text-sm"
                  />
                  <label className="flex items-center gap-1 text-xs text-text-secondary">
                    价格
                    <input
                      type="number"
                      value={item.cost}
                      onChange={(e) => handleShopItemUpdate(item.id, { cost: Number(e.target.value) })}
                      className="w-16 rounded-xl border border-gray-200 px-2 py-1 text-sm"
                    />
                  </label>
                  <label className="flex items-center gap-1 text-xs text-text-secondary">
                    库存
                    <input
                      type="number"
                      value={item.stock}
                      onChange={(e) => handleShopItemUpdate(item.id, { stock: Number(e.target.value) })}
                      className="w-16 rounded-xl border border-gray-200 px-2 py-1 text-sm"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => handleShopItemRemove(item.id)}
                    className="text-xs text-danger"
                  >
                    删除
                  </button>
                </DragItem>
              ))}
            </Reorder.Group>
          ) : (
            <p className="py-4 text-center text-sm text-text-tertiary">暂无商品，请添加</p>
          )}
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
        <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 animate-[slideDown_0.3s_ease-out]">
          <div
            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold shadow-lg ${
              notice.type === "error"
                ? "border-red-200 bg-red-50 text-danger"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            <span className="text-base">{notice.type === "error" ? "⚠️" : "✅"}</span>
            <span>{notice.message}</span>
            <button type="button" onClick={clearNotice} className="ml-2 text-xs opacity-60 hover:opacity-100">
              ✕
            </button>
          </div>
        </div>
      ) : null}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="新建班级"
        description="请输入班级名称并选择初始模板"
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
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-text-primary">班级名称</label>
            <input
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
              placeholder="例如：三年三班"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-text-primary">初始设置</label>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => { setTemplateSource("default"); setSourceClassId("") }}
                className={`rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                  templateSource === "default"
                    ? "border-primary bg-primary/10 text-primary font-semibold"
                    : "border-gray-200 bg-gray-50 text-text-secondary hover:bg-gray-100"
                }`}
              >
                <span className="block font-semibold">默认模板</span>
                <span className="block mt-0.5 text-xs opacity-70">使用系统预设的积分规则</span>
              </button>
              <button
                type="button"
                onClick={() => setTemplateSource("copy")}
                disabled={classes.length === 0}
                className={`rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                  templateSource === "copy"
                    ? "border-primary bg-primary/10 text-primary font-semibold"
                    : "border-gray-200 bg-gray-50 text-text-secondary hover:bg-gray-100"
                } disabled:cursor-not-allowed disabled:opacity-40`}
              >
                <span className="block font-semibold">从已有班级复制</span>
                <span className="block mt-0.5 text-xs opacity-70">复制规则、阈值和商品</span>
              </button>
            </div>
          </div>
          {templateSource === "copy" && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-text-primary">选择源班级</label>
              <select
                value={sourceClassId}
                onChange={(event) => setSourceClassId(event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">请选择班级...</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
              <p className="text-xs text-text-tertiary">将复制该班级的积分规则、成长阈值和小卖部商品</p>
            </div>
          )}
          <p className="text-xs text-text-tertiary">创建后可在设置页面中继续修改</p>
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
      <ExcelImportModal
        open={excelModalOpen}
        onClose={() => setExcelModalOpen(false)}
        onImport={handleExcelImport}
        loading={loading}
      />

      {/* 联系作者浮窗 */}
      <button
        type="button"
        onClick={() => setContactOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-110 active:scale-95"
        title="联系作者"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>
      <Modal
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        title="联系作者"
        description="扫描下方二维码添加微信"
      >
        <div className="flex justify-center">
          <img src="/wx.jpg" alt="微信二维码" className="w-64 rounded-xl" />
        </div>
      </Modal>
    </div>
  )
}

export default Settings
