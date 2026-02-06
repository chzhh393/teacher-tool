import { useEffect } from "react"
import { HashRouter, Route, Routes } from "react-router-dom"

import AppShell from "./components/AppShell"
import RequireAuth from "./components/RequireAuth"
import ActivationAdmin from "./routes/admin/ActivationAdmin"
import BeastAdmin from "./routes/admin/BeastAdmin"
import Activate from "./routes/Activate"
import Auth from "./routes/Auth"
import Honors from "./routes/Honors"
import Home from "./routes/Home"
import Records from "./routes/Records"
import Settings from "./routes/Settings"
import Store from "./routes/Store"
import { CloudApi } from "./services/cloudApi"
import { useAuthStore } from "./stores/authStore"

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
        <Route path="/activate" element={<Activate />} />
        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<Home />} />
            <Route path="/honors" element={<Honors />} />
            <Route path="/store" element={<Store />} />
            <Route path="/records" element={<Records />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/activation-admin" element={<ActivationAdmin />} />
            <Route path="/beast-admin" element={<BeastAdmin />} />
          </Route>
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App
