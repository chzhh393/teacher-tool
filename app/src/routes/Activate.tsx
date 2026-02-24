import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"

import { CloudApi } from "../services/cloudApi"
import { useAuthStore } from "../stores/authStore"
import { useClassStore } from "../stores/classStore"

const PENDING_USERNAME_KEY = "tt-pending-username"
const CODE_REG = /^[A-Z0-9]{6}$/

const getInitialUsername = (state: unknown) => {
  if (state && typeof state === "object" && "username" in state) {
    const value = (state as { username?: string }).username
    if (value) return value
  }

  if (typeof window !== "undefined") {
    return localStorage.getItem(PENDING_USERNAME_KEY) || ""
  }

  return ""
}

const getPurpose = (state: unknown): "activate" | "reset" | "lookup" => {
  if (state && typeof state === "object" && "purpose" in state) {
    const p = (state as { purpose?: string }).purpose
    if (p === "reset") return "reset"
    if (p === "lookup") return "lookup"
  }
  return "activate"
}

const normalizeCode = (value: string) => {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6)
}

const Activate = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const { clearClass } = useClassStore()

  const [purpose] = useState(() => {
    const p = getPurpose(location.state)
    return p === "lookup" ? "activate" : p
  })
  const [username, setUsername] = useState(() => getInitialUsername(location.state))
  const [code, setCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [lookupMode, setLookupMode] = useState(() => getPurpose(location.state) === "lookup")
  const [lookupLoading, setLookupLoading] = useState(false)
  const [notice, setNotice] = useState("")
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        setReady(true)
      } catch {
        setNotice("云服务连接失败，请刷新重试")
      }
    }
    init()
  }, [])

  useEffect(() => {
    const nextUsername = getInitialUsername(location.state)
    if (nextUsername && nextUsername !== username) {
      setUsername(nextUsername)
    }
  }, [location.state, username])

  useEffect(() => {
    if (typeof window !== "undefined" && username) {
      localStorage.setItem(PENDING_USERNAME_KEY, username)
    }
  }, [username])

  const handleLookup = async () => {
    const normalized = normalizeCode(code)
    if (!CODE_REG.test(normalized)) {
      setNotice("请输入 6 位字母/数字激活码")
      return
    }
    setLookupLoading(true)
    setNotice("")
    try {
      const result = await CloudApi.authLookupUsername({ code: normalized })
      setUsername(result.username)
      setLookupMode(false)
      setNotice(`已找到账号：${result.username}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : ""
      if (message.includes("未绑定")) {
        setNotice("该激活码尚未绑定账号")
      } else if (message.includes("不存在")) {
        setNotice("激活码无效")
      } else {
        setNotice("查询失败，请检查激活码")
      }
    } finally {
      setLookupLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!ready || loading) return
    if (!username) {
      setNotice(purpose === "reset" ? "请输入用户名" : "未找到账号，请先注册")
      return
    }

    const normalized = normalizeCode(code)
    if (!CODE_REG.test(normalized)) {
      setNotice("请输入 6 位字母/数字激活码")
      return
    }

    if (purpose === "reset") {
      if (!newPassword || newPassword.length < 6) {
        setNotice("新密码至少 6 位")
        return
      }
      if (newPassword !== confirmPassword) {
        setNotice("两次密码不一致")
        return
      }
    }

    setLoading(true)
    setNotice("")
    try {
      if (purpose === "reset") {
        const result = await CloudApi.authReset({ username, code: normalized, newPassword })
        clearClass()
        setAuth(result.token, result.username, result.role || "main", result.nickname || result.username, result.canRedeem)
      } else {
        const result = await CloudApi.authActivate({ username, code: normalized })
        clearClass()
        setAuth(result.token, result.username, result.role || "main", result.nickname || result.username)
      }
      if (typeof window !== "undefined") {
        localStorage.removeItem(PENDING_USERNAME_KEY)
      }
      navigate("/")
    } catch (error) {
      const message = error instanceof Error ? error.message : ""
      if (message.includes("已使用")) {
        setNotice("激活码已使用")
      } else if (message.includes("用户不存在")) {
        setNotice("账号不存在，请先注册")
      } else if (message.includes("不存在")) {
        setNotice("激活码无效")
      } else if (message.includes("已激活")) {
        setNotice("账号已激活，请直接登录")
      } else if (message.includes("过期")) {
        setNotice("激活码已过期")
      } else {
        setNotice(purpose === "reset" ? "重置失败，请检查激活码" : "激活失败，请检查激活码")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(PENDING_USERNAME_KEY)
    }
    navigate("/auth")
  }

  return (
    <div className="min-h-screen bg-[#fff6ee] px-4 py-12 flex items-center justify-center relative overflow-hidden">
      <div className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-orange-100/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-orange-200/50 blur-3xl" />

      <div className="w-full max-w-md">
        <div className="rounded-[28px] bg-white/95 shadow-xl shadow-orange-100/60 border border-orange-50 overflow-hidden">
          <div className="px-8 py-10">
            <h1 className="text-xl font-semibold text-text-primary text-center">
              {purpose === "reset" ? "找回密码" : "激活您的账号"}
            </h1>

            {purpose === "reset" && !lookupMode ? (
              <>
                <label className="mt-6 block text-sm font-semibold text-text-primary">用户名</label>
                <div className="mt-2 rounded-xl border border-gray-200 px-4 py-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/[^A-Za-z0-9_]/g, ""))}
                    placeholder="请输入要找回密码的用户名"
                    className="w-full text-sm outline-none placeholder:text-gray-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => { setLookupMode(true); setNotice("") }}
                  className="mt-2 text-xs text-text-secondary hover:text-primary transition-colors"
                >
                  忘记用户名？用激活码查询 →
                </button>
              </>
            ) : purpose !== "reset" ? (
              <div className="mt-6 rounded-2xl bg-orange-50/60 px-4 py-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-200 text-white flex items-center justify-center text-lg font-semibold">
                  {(username || "?").slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">{username || "未找到账号"}</p>
                  <p className="text-xs text-text-secondary">您的账号尚未激活</p>
                </div>
              </div>
            ) : null}

            <label className="mt-6 block text-sm font-semibold text-text-primary">激活码</label>
            <div className="mt-2 rounded-xl border border-gray-200 px-4 py-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all flex items-center gap-3">
              <span className="h-8 w-8 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center text-sm font-semibold">#</span>
              <input
                value={code}
                onChange={(event) => setCode(normalizeCode(event.target.value))}
                placeholder="XXXXXX"
                className="w-full text-sm tracking-[0.2em] uppercase outline-none placeholder:text-gray-300"
              />
            </div>

            {lookupMode ? (
              <>
                <div className="mt-3 space-y-1 text-xs text-text-secondary">
                  <p>• 输入您当初使用的激活码，即可查出对应用户名</p>
                  <p>• 格式：6 位字母/数字，不区分大小写</p>
                </div>

                <button
                  type="button"
                  onClick={handleLookup}
                  disabled={lookupLoading}
                  className="mt-6 w-full btn-active py-3 text-base shadow-lg shadow-primary/30 hover:shadow-primary/40 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {lookupLoading ? "查询中..." : "查询用户名"}
                </button>

                <button
                  type="button"
                  onClick={() => { setLookupMode(false); setNotice("") }}
                  className="mt-3 w-full text-xs text-text-secondary hover:text-primary transition-colors"
                >
                  ← 返回重置密码
                </button>
              </>
            ) : (
              <>
                <div className="mt-3 space-y-1 text-xs text-text-secondary">
                  {purpose === "reset" ? (
                    <>
                      <p>• 输入激活码即可重新登录并重置密码</p>
                      <p>• 格式：6 位字母/数字，不区分大小写</p>
                    </>
                  ) : (
                    <>
                      <p>• 请从购买页面复制激活码，粘贴到上方</p>
                      <p>• 格式：6 位字母/数字，不区分大小写</p>
                      <p>• 每个激活码仅能使用一次</p>
                    </>
                  )}
                </div>

                {purpose === "reset" ? (
                  <>
                    <label className="mt-6 block text-sm font-semibold text-text-primary">新密码</label>
                    <div className="mt-2 flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                      <input
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        type={showPassword ? "text" : "password"}
                        placeholder="至少 6 位"
                        className="w-full text-sm outline-none placeholder:text-gray-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="text-xs text-text-secondary hover:text-primary"
                      >
                        {showPassword ? "隐藏" : "显示"}
                      </button>
                    </div>

                    <label className="mt-4 block text-sm font-semibold text-text-primary">确认密码</label>
                    <div className="mt-2 rounded-xl border border-gray-200 px-4 py-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                      <input
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        type="password"
                        placeholder="再次输入新密码"
                        className="w-full text-sm outline-none placeholder:text-gray-400"
                      />
                    </div>
                  </>
                ) : null}

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!ready || loading}
                  className="mt-8 w-full btn-active py-3 text-base shadow-lg shadow-primary/30 hover:shadow-primary/40 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {!ready ? "连接中..." : loading ? "处理中..." : purpose === "reset" ? "重置密码" : "立即激活"}
                </button>
              </>
            )}

            <div className="mt-6 flex items-center gap-4 text-xs text-text-tertiary">
              <span className="h-px flex-1 bg-orange-100" />
              <span>还没有激活码？</span>
              <span className="h-px flex-1 bg-orange-100" />
            </div>

            <a
              href="https://xhslink.com/m/3BIULrVjTlK"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 block w-full rounded-xl border border-orange-200 py-3 text-center text-sm font-semibold text-orange-500 hover:bg-orange-50 transition-colors"
            >
              点击这里购买
            </a>

            <button
              type="button"
              onClick={handleBack}
              className="mt-4 w-full text-xs text-text-secondary hover:text-primary transition-colors"
            >
              返回登录
            </button>

            {notice ? <p className="mt-4 text-center text-xs text-danger bg-red-50 py-2 rounded-lg">{notice}</p> : null}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Activate
