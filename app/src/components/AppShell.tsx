import { Suspense, useEffect, useState } from "react"
import { NavLink, Outlet } from "react-router-dom"
import ChunkErrorBoundary from "./ChunkErrorBoundary"

import { signInAnonymously } from "../lib/cloudbaseAuth"
import { CloudApi } from "../services/cloudApi"
import { useAuthStore } from "../stores/authStore"
import { useClassStore } from "../stores/classStore"
import type { ClassInfo } from "../types"
import { applyTheme } from "../config/theme"
import Modal from "./Modal"

const allNavItems = [
  { label: "班级主页", to: "/", mainOnly: false },
  { label: "光荣榜", to: "/honors", mainOnly: false },
  { label: "小卖部", to: "/store", mainOnly: false },
  { label: "成长记录", to: "/records", mainOnly: false },
  { label: "老师设置", to: "/settings", mainOnly: true },
]

const AppShell = () => {
  const [classModalOpen, setClassModalOpen] = useState(false)
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const { classId, className, setClass, clearClass } = useClassStore()
  const { username, token, role, nickname, clearAuth } = useAuthStore()
  const isSubAccount = role === "sub"
  const navItems = allNavItems.filter((item) => !item.mainOnly || !isSubAccount)

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

          <div className="hidden w-full flex-wrap items-center gap-2 md:flex lg:w-auto lg:flex-1 lg:flex-nowrap lg:justify-center">
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
              <div className="hidden items-center gap-2 text-sm text-text-secondary md:flex">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {(nickname || username || "U").slice(0, 1).toUpperCase()}
                </span>
                <span>{nickname || username || "未登录"}</span>
                {isSubAccount && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                    子账号
                  </span>
                )}
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
                `hidden rounded-xl px-3 py-2 text-sm font-semibold transition-all md:inline-flex ${
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

      <main className="mx-auto w-full max-w-[1400px] px-4 pt-6 pb-20 md:pb-6 animate-fade-in">
        <ChunkErrorBoundary>
          <Suspense fallback={<div className="flex justify-center py-20"><p className="text-text-secondary">加载中...</p></div>}>
            <Outlet />
          </Suspense>
        </ChunkErrorBoundary>
      </main>

      {/* 底部 Tab 导航 - 仅手机端 */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur safe-area-bottom md:hidden">
        <div className="flex items-center justify-around py-1">
          {(isSubAccount
            ? [
                { to: "/", label: "首页", icon: "home" },
                { to: "/honors", label: "光荣榜", icon: "trophy" },
                { to: "/store", label: "小卖部", icon: "store" },
                { to: "/records", label: "记录", icon: "records" },
              ]
            : [
                { to: "/", label: "首页", icon: "home" },
                { to: "/honors", label: "光荣榜", icon: "trophy" },
                { to: "/store", label: "小卖部", icon: "store" },
                { to: "/records", label: "记录", icon: "records" },
                { to: "/settings", label: "设置", icon: "settings" },
              ]
          ).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium transition-colors ${
                  isActive ? "text-primary" : "text-text-tertiary"
                }`
              }
            >
              {item.icon === "home" && (
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
              )}
              {item.icon === "trophy" && (
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
              )}
              {item.icon === "store" && (
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
              )}
              {item.icon === "settings" && (
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
              )}
              {item.icon === "records" && (
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>
              )}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

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
