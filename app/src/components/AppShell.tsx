import { useEffect, useState } from "react"
import { NavLink, Outlet } from "react-router-dom"

import { signInAnonymously } from "../lib/cloudbaseAuth"
import { CloudApi } from "../services/cloudApi"
import { useAuthStore } from "../stores/authStore"
import { useClassStore } from "../stores/classStore"
import type { ClassInfo } from "../types"
import { applyTheme } from "../config/theme"
import Modal from "./Modal"

const navItems = [
  { label: "班级主页", to: "/" },
  { label: "光荣榜", to: "/honors" },
  { label: "小卖部", to: "/store" },
  { label: "成长记录", to: "/records" },
  { label: "老师设置", to: "/settings" },
]

const AppShell = () => {
  const [classModalOpen, setClassModalOpen] = useState(false)
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const { classId, className, setClass, clearClass } = useClassStore()
  const { username, token, clearAuth } = useAuthStore()

  useEffect(() => {
    const load = async () => {
      try {
        await signInAnonymously()
        if (!token) {
          setClasses([])
          return
        }
        const result = await CloudApi.classList()
        setClasses(result.classes || [])
        if (!classId && result.classes?.length) {
          const first = result.classes[0]
          setClass(first.id, first.name)
        }
        if (classId || result.classes?.length) {
          const activeId = classId || result.classes[0].id
          const settings = await CloudApi.settingsGet({ classId: activeId })
          applyTheme(settings.settings?.themeColor || "coral")
        }
      } catch (error) {
        console.error("云开发连接失败", error)
        setClasses([])
      }
    }

    load()
  }, [classId, setClass, token])

  const handleLogout = async () => {
    if (token) {
      await CloudApi.authLogout({ token })
    }
    clearClass()
    clearAuth()
  }

  return (
    <div className="min-h-screen bg-background text-text-primary font-sans">
      <header className="sticky top-0 z-50 border-b border-white/70 bg-white/80 backdrop-blur shadow-soft">
        <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center gap-4 px-4 py-3 lg:flex-nowrap">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white text-lg font-bold shadow-md">
              D
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary">
                Beast Academy
              </p>
              <h1 className="text-lg font-bold text-text-primary">幻兽学院</h1>
            </div>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:flex-1 lg:flex-nowrap lg:justify-center">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-xl px-3 py-2 text-sm font-medium transition-all ${isActive
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "bg-white/70 text-text-secondary hover:bg-white hover:text-text-primary"
                  }`
                }
                end={item.to === "/"}
              >
                {item.label}
              </NavLink>
            ))}

          </div>

          <div className="ml-auto flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setClassModalOpen(true)}
                className="btn-default text-sm"
              >
                {className || "切换班级"}
              </button>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-2 py-1 shadow-inner">
              <div className="hidden items-center gap-2 text-sm text-text-secondary sm:flex">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {(username || "U").slice(0, 1).toUpperCase()}
                </span>
                <span>{username || "未登录"}</span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-danger transition-colors hover:bg-red-50 hover:text-red-500"
              >
                退出
              </button>
            </div>

            <NavLink
              to="/updates"
              className={({ isActive }) =>
                `rounded-xl px-3 py-2 text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "bg-white/70 text-text-secondary hover:bg-white hover:text-text-primary"
                }`
              }
            >
              更新日志
            </NavLink>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1400px] px-4 py-6 animate-fade-in">
        <Outlet />
      </main>

      <Modal
        open={classModalOpen}
        onClose={() => setClassModalOpen(false)}
        title="选择班级"
        description="点击班级即可切换"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {classes.length ? (
            classes.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => {
                  setClass(item.id, item.name)
                  setClassModalOpen(false)
                }}
                className={`card px-4 py-3 text-left border transition-all ${item.id === classId
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-transparent hover:border-gray-200"
                  }`}
              >
                <p className="text-sm font-semibold text-text-primary">{item.name}</p>
                <p className="text-xs text-text-secondary">{item.id}</p>
              </button>
            ))
          ) : (
            <p className="text-sm text-text-secondary">暂无班级</p>
          )}
        </div>
      </Modal>
    </div>
  )
}

export default AppShell
