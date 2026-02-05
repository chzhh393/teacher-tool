import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"

import { signInAnonymously } from "../lib/cloudbaseAuth"
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

  const [username, setUsername] = useState(() => getInitialUsername(location.state))
  const [code, setCode] = useState("")
  const [notice, setNotice] = useState("")
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

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

  const handleActivate = async () => {
    if (!ready || loading) return
    if (!username) {
      setNotice("未找到账号，请先注册")
      return
    }

    const normalized = normalizeCode(code)
    if (!CODE_REG.test(normalized)) {
      setNotice("请输入 6 位字母/数字激活码")
      return
    }

    setLoading(true)
    setNotice("")
    try {
      const result = await CloudApi.authActivate({ username, code: normalized })
      clearClass()
      setAuth(result.token, result.username)
      if (typeof window !== "undefined") {
        localStorage.removeItem(PENDING_USERNAME_KEY)
      }
      navigate("/")
    } catch (error) {
      const message = error instanceof Error ? error.message : ""
      if (message.includes("已使用")) {
        setNotice("激活码已使用")
      } else if (message.includes("不存在")) {
        setNotice("激活码无效")
      } else if (message.includes("已激活")) {
        setNotice("账号已激活，请直接登录")
      } else if (message.includes("用户不存在")) {
        setNotice("账号不存在，请先注册")
      } else if (message.includes("过期")) {
        setNotice("激活码已过期")
      } else {
        setNotice("激活失败，请检查激活码")
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
            <h1 className="text-xl font-semibold text-text-primary text-center">激活您的账号</h1>

            <div className="mt-6 rounded-2xl bg-orange-50/60 px-4 py-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-200 text-white flex items-center justify-center text-lg font-semibold">
                {(username || "?").slice(0, 1).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">{username || "未找到账号"}</p>
                <p className="text-xs text-text-secondary">您的账号尚未激活</p>
              </div>
            </div>

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

            <div className="mt-3 space-y-1 text-xs text-text-secondary">
              <p>• 请从购买页面复制激活码，粘贴到上方</p>
              <p>• 格式：6 位字母/数字，不区分大小写</p>
              <p>• 每个激活码仅能使用一次</p>
            </div>

            <button
              type="button"
              onClick={handleActivate}
              disabled={!ready || loading}
              className="mt-8 w-full btn-active py-3 text-base shadow-lg shadow-primary/30 hover:shadow-primary/40 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {!ready ? "连接中..." : loading ? "激活中..." : "立即激活"}
            </button>

            <div className="mt-6 flex items-center gap-4 text-xs text-text-tertiary">
              <span className="h-px flex-1 bg-orange-100" />
              <span>还没有激活码？</span>
              <span className="h-px flex-1 bg-orange-100" />
            </div>

            <button
              type="button"
              onClick={() => setNotice("请联系管理员获取激活码")}
              className="mt-4 w-full rounded-xl border border-orange-200 py-3 text-sm font-semibold text-orange-500 hover:bg-orange-50 transition-colors"
            >
              点击这里购买
            </button>

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
