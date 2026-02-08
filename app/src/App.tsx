import { lazy, Suspense, useEffect, useState } from "react"
import type { ReactNode } from "react"
import { HashRouter, Navigate, Route, Routes } from "react-router-dom"

import AppShell from "./components/AppShell"
import RequireAuth from "./components/RequireAuth"
import Activate from "./routes/Activate"
import Auth from "./routes/Auth"
import InstallGuide from "./routes/InstallGuide"
import Honors from "./routes/Honors"
import Home from "./routes/Home"
import Records from "./routes/Records"
import Settings from "./routes/Settings"
import Store from "./routes/Store"
import BeastGallery from "./routes/BeastGallery"
import Updates from "./routes/Updates"
import WeChatBind from "./routes/WeChatBind"
import { CloudApi } from "./services/cloudApi"
import { useAuthStore } from "./stores/authStore"
import { signInAnonymously } from "./lib/cloudbaseAuth"

// 后台管理页面仅在开发模式下加载，生产构建会 tree-shake 掉
let adminRoutes: ReactNode = null
if (import.meta.env.DEV) {
  const ActivationAdmin = lazy(() => import("./routes/admin/ActivationAdmin"))
  const OpsAdmin = lazy(() => import("./routes/admin/OpsAdmin"))
  adminRoutes = (
    <>
      <Route path="/activation-admin" element={<Suspense fallback={null}><ActivationAdmin /></Suspense>} />
      <Route path="/ops-admin" element={<Suspense fallback={null}><OpsAdmin /></Suspense>} />
    </>
  )
}

// 微信 OAuth 回调临时数据存储 key
const WX_TEMP_KEY = "tt-wx-bind-temp"

const App = () => {
  const { token, setAuth, clearAuth, setStatus } = useAuthStore()
  const [wxCallbackHandled, setWxCallbackHandled] = useState(false)

  // 微信 OAuth 回调拦截：检测 URL 中的 code+state 参数
  useEffect(() => {
    const handleWeChatCallback = async () => {
      const params = new URLSearchParams(window.location.search)
      const code = params.get("code")
      const state = params.get("state")

      if (!code || !state) {
        setWxCallbackHandled(true)
        return
      }

      // 清理 URL 中的 query 参数，防止刷新时重复处理
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname + window.location.hash
      )

      try {
        // 确保匿名登录状态（调用云函数需要）
        await signInAnonymously()
        const result = await CloudApi.wechatCallback({ code, state })

        if (result.action === "login" && result.token && result.username) {
          // 已绑定用户，直接登录（微信登录默认 main 角色，verify 时会校正）
          setAuth(result.token, result.username, "main", result.username)
        } else if (result.action === "need_bind" && result.tempToken) {
          // 未绑定，保存临时数据，后续跳转到绑定页面
          localStorage.setItem(WX_TEMP_KEY, JSON.stringify({
            tempToken: result.tempToken,
            nickname: result.wechatNickname || "",
            avatar: result.wechatAvatar || "",
          }))
        } else if (result.action === "bind_success") {
          // 设置页绑定成功，标记一下让 Settings 页面显示成功提示
          localStorage.setItem("tt-wx-bind-success", "1")
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : "微信登录失败"
        localStorage.setItem("tt-wx-error", msg)
      }

      setWxCallbackHandled(true)
    }

    handleWeChatCallback()
  }, [setAuth])

  // 常规 token 验证
  useEffect(() => {
    if (!wxCallbackHandled) return

    const bootstrap = async () => {
      if (!token) {
        setStatus("guest")
        return
      }
      try {
        const result = await CloudApi.authVerify({ token })
        if (result.ok && result.username) {
          setAuth(token, result.username, result.role || "main", result.nickname || result.username, result.canRedeem || false)
        } else {
          clearAuth()
        }
      } catch (error) {
        clearAuth()
      }
    }

    bootstrap()
  }, [wxCallbackHandled, token, setAuth, clearAuth, setStatus])

  // 等待微信回调处理完成
  if (!wxCallbackHandled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-text-secondary">处理中...</p>
      </div>
    )
  }

  return (
    <HashRouter>
      <WeChatRedirectHandler />
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/install-guide" element={<InstallGuide />} />
        <Route path="/activate" element={<Activate />} />
        <Route path="/wechat-bind" element={<WeChatBind />} />
        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<Home />} />
            <Route path="/honors" element={<Honors />} />
            <Route path="/store" element={<Store />} />
            <Route path="/records" element={<Records />} />
            <Route path="/updates" element={<Updates />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/beast-gallery" element={<BeastGallery />} />
            {adminRoutes}
          </Route>
        </Route>
      </Routes>
    </HashRouter>
  )
}

// 微信回调后的路由跳转处理（需在 HashRouter 内部）
const WeChatRedirectHandler = () => {
  const { status } = useAuthStore()
  const wxTemp = localStorage.getItem(WX_TEMP_KEY)
  const wxError = localStorage.getItem("tt-wx-error")

  // 微信回调后需要绑定账号：跳转到绑定页面
  if (wxTemp && status === "guest") {
    return <Navigate to="/wechat-bind" replace />
  }

  // 微信回调出错：跳转到登录页（错误信息在 Auth 页面显示）
  if (wxError && status === "guest") {
    return <Navigate to="/auth" replace />
  }

  return null
}

export default App
