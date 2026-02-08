import { lazy, Suspense, useEffect } from "react"
import type { ReactNode } from "react"
import { HashRouter, Route, Routes } from "react-router-dom"

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
import Updates from "./routes/Updates"
import { CloudApi } from "./services/cloudApi"
import { useAuthStore } from "./stores/authStore"

// 后台管理页面仅在开发模式下加载，生产构建会 tree-shake 掉
let adminRoutes: ReactNode = null
if (import.meta.env.DEV) {
  const ActivationAdmin = lazy(() => import("./routes/admin/ActivationAdmin"))
  const BeastAdmin = lazy(() => import("./routes/admin/BeastAdmin"))
  const OpsAdmin = lazy(() => import("./routes/admin/OpsAdmin"))
  adminRoutes = (
    <>
      <Route path="/activation-admin" element={<Suspense fallback={null}><ActivationAdmin /></Suspense>} />
      <Route path="/beast-admin" element={<Suspense fallback={null}><BeastAdmin /></Suspense>} />
      <Route path="/ops-admin" element={<Suspense fallback={null}><OpsAdmin /></Suspense>} />
    </>
  )
}

const App = () => {
  const { token, setAuth, clearAuth, setStatus } = useAuthStore()

  useEffect(() => {
    const bootstrap = async () => {
      if (!token) {
        setStatus("guest")
        return
      }
      try {
        const result = await CloudApi.authVerify({ token })
        if (result.ok && result.username) {
          setAuth(token, result.username)
        } else {
          clearAuth()
        }
      } catch (error) {
        clearAuth()
      }
    }

    bootstrap()
  }, [token, setAuth, clearAuth, setStatus])

  return (
    <HashRouter>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/install-guide" element={<InstallGuide />} />
        <Route path="/activate" element={<Activate />} />
        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<Home />} />
            <Route path="/honors" element={<Honors />} />
            <Route path="/store" element={<Store />} />
            <Route path="/records" element={<Records />} />
            <Route path="/updates" element={<Updates />} />
            <Route path="/settings" element={<Settings />} />
            {adminRoutes}
          </Route>
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App
