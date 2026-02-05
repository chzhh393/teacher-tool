import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

import { signInAnonymously } from "../lib/cloudbaseAuth"
import { CloudApi } from "../services/cloudApi"
import { useAuthStore } from "../stores/authStore"
import { useClassStore } from "../stores/classStore"

const usernameHint = [
  "至少 6 个字符",
  "仅支持字母、数字、下划线",
  "注册后不可修改",
]

const passwordHint = [
  "至少 6 个字符",
  "建议字母 + 数字组合",
]

const PENDING_USERNAME_KEY = "tt-pending-username"

const Auth = () => {
  const [tab, setTab] = useState<"login" | "register">("login")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [notice, setNotice] = useState("")
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const { clearClass } = useClassStore()

  useEffect(() => {
    const init = async () => {
      try {
        await signInAnonymously()
        setReady(true)
      } catch {
        setNotice("云服务连接失败，请刷新重试")
      }
    }
    init()
  }, [])

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setNotice("请输入用户名和密码")
      return
    }
    setLoading(true)
    setNotice("")
    try {
      const result = await CloudApi.authLogin({ username: username.trim(), password })
      clearClass()
      setAuth(result.token, result.username)
      if (typeof window !== "undefined") {
        localStorage.removeItem(PENDING_USERNAME_KEY)
      }
      navigate("/")
    } catch (error) {
      const message = error instanceof Error ? error.message : ""
      if (message.includes("未激活")) {
        if (typeof window !== "undefined" && username.trim()) {
          localStorage.setItem(PENDING_USERNAME_KEY, username.trim())
        }
        setNotice("账号未激活，请先激活")
      } else {
        setNotice("登录失败，请检查账号或密码")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    if (!username.trim() || !password.trim() || !confirmPassword.trim()) {
      setNotice("请填写完整")
      return
    }
    if (!/^[A-Za-z0-9_]{6,}$/.test(username.trim())) {
      setNotice("用户名至少 6 位，仅字母/数字/下划线")
      return
    }
    if (password !== confirmPassword) {
      setNotice("两次密码不一致")
      return
    }
    setLoading(true)
    setNotice("")
    try {
      const result = await CloudApi.authRegister({ username: username.trim(), password })
      const nextUsername = result.username || username.trim()
      if (typeof window !== "undefined") {
        localStorage.setItem(PENDING_USERNAME_KEY, nextUsername)
      }
      clearClass()
      navigate("/activate", { state: { username: nextUsername } })
    } catch (error) {
      setNotice("注册失败，用户名可能已存在")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-12 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="mx-auto w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
          <div className="flex border-b border-gray-100">
            {[
              { key: "login", label: "登录" },
              { key: "register", label: "注册" },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setTab(item.key as "login" | "register")
                  setNotice("")
                }}
                className={`flex-1 py-4 text-base font-semibold transition-all ${tab === item.key
                    ? "text-primary border-b-2 border-primary bg-primary/5"
                    : "text-text-secondary hover:text-text-primary hover:bg-gray-50"
                  }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="px-8 py-8">
            <label className="text-sm font-semibold text-text-primary">用户名</label>
            <div className="mt-2 rounded-xl border border-gray-200 px-4 py-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="请输入用户名"
                className="w-full text-sm outline-none placeholder:text-gray-400"
              />
            </div>
            {tab === "register" ? (
              <div className="mt-2 space-y-1 text-xs text-text-secondary">
                {usernameHint.map((item) => (
                  <p key={item}>• {item}</p>
                ))}
              </div>
            ) : null}

            <label className="mt-6 block text-sm font-semibold text-text-primary">密码</label>
            <div className="mt-2 flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type={showPassword ? "text" : "password"}
                placeholder="请输入密码"
                className="w-full text-sm outline-none placeholder:text-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="text-xs text-text-secondary hover:text-primary"
              >
                {showPassword ? "隐藏" : "显示"}
              </button>
            </div>
            {tab === "register" ? (
              <div className="mt-2 space-y-1 text-xs text-text-secondary">
                {passwordHint.map((item) => (
                  <p key={item}>• {item}</p>
                ))}
              </div>
            ) : null}

            {tab === "register" ? (
              <>
                <label className="mt-6 block text-sm font-semibold text-text-primary">确认密码</label>
                <div className="mt-2 flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                  <input
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    type={showConfirm ? "text" : "password"}
                    placeholder="请再次输入密码"
                    className="w-full text-sm outline-none placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((prev) => !prev)}
                    className="text-xs text-text-secondary hover:text-primary"
                  >
                    {showConfirm ? "隐藏" : "显示"}
                  </button>
                </div>
              </>
            ) : null}

            <button
              type="button"
              onClick={tab === "login" ? handleLogin : handleRegister}
              disabled={!ready || loading}
              className="mt-8 w-full btn-active py-3 text-base shadow-lg shadow-primary/30 hover:shadow-primary/40 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {!ready ? "连接中..." : tab === "login" ? "立即登录" : "立即注册"}
            </button>

            <div className="mt-6 text-center text-xs text-text-secondary">
              {tab === "login" ? (
                <div className="space-y-3">
                  <button
                    type="button"
                    className="text-text-secondary hover:text-primary transition-colors"
                    onClick={() => {
                      if (typeof window !== "undefined" && username.trim()) {
                        localStorage.setItem(PENDING_USERNAME_KEY, username.trim())
                      }
                      navigate("/activate", { state: { username: username.trim() } })
                    }}
                  >
                    忘记密码？使用激活码找回 →
                  </button>
                  <div className="pt-2">
                    <button type="button" className="text-primary font-semibold hover:underline" onClick={() => setTab("register")}>
                      还没有账号？立即注册
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" className="text-text-secondary hover:text-primary transition-colors" onClick={() => setTab("login")}>
                  已有账号？立即登录 →
                </button>
              )}
            </div>

            {notice ? <p className="mt-4 text-center text-xs text-danger bg-red-50 py-2 rounded-lg">{notice}</p> : null}
            {loading ? <p className="mt-2 text-center text-xs text-text-secondary">处理中...</p> : null}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Auth
