import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"

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
  // const [wxLoading, setWxLoading] = useState(false)  // 暂时隐藏微信登录

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

    // 显示微信回调的错误信息
    const wxError = localStorage.getItem("tt-wx-error")
    if (wxError) {
      setNotice(wxError)
      localStorage.removeItem("tt-wx-error")
    }
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
      setAuth(result.token, result.username, result.role, result.nickname, result.canRedeem)
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

  // 暂时隐藏微信登录，等微信开放平台网站应用审核通过后启用
  // const handleWeChatLogin = async () => {
  //   setWxLoading(true)
  //   setNotice("")
  //   try {
  //     const result = await CloudApi.wechatState({ purpose: "login" })
  //     window.location.href = result.authUrl
  //   } catch {
  //     setNotice("微信登录初始化失败，请重试")
  //     setWxLoading(false)
  //   }
  // }

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

            {/* 微信快捷登录 - 暂时隐藏，等微信开放平台网站应用审核通过后启用 */}
            {/* {tab === "login" ? (
              <div className="mt-6">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-xs text-text-tertiary">或</span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>
                <button
                  type="button"
                  onClick={handleWeChatLogin}
                  disabled={!ready || wxLoading}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3 text-sm font-medium text-text-primary hover:bg-gray-50 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#07C160">
                    <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05a6.093 6.093 0 0 1-.253-1.726c0-3.573 3.357-6.473 7.503-6.473.178 0 .352.012.527.025C16.458 4.882 12.9 2.188 8.691 2.188zm-2.87 4.408a1.09 1.09 0 1 1 0 2.181 1.09 1.09 0 0 1 0-2.181zm5.742 0a1.09 1.09 0 1 1 0 2.181 1.09 1.09 0 0 1 0-2.181zM16.752 9.2c-3.636 0-6.588 2.483-6.588 5.548 0 3.065 2.952 5.548 6.588 5.548.718 0 1.41-.107 2.063-.29a.77.77 0 0 1 .578.079l1.46.852a.263.263 0 0 0 .132.043c.13 0 .236-.107.236-.238 0-.058-.023-.115-.039-.172l-.298-1.133a.48.48 0 0 1 .172-.54C22.612 17.855 23.5 16.198 23.5 14.748c0-3.065-3.12-5.548-6.748-5.548zm-2.399 3.477a.906.906 0 1 1 0 1.813.906.906 0 0 1 0-1.813zm4.797 0a.906.906 0 1 1 0 1.813.906.906 0 0 1 0-1.813z" />
                  </svg>
                  {wxLoading ? "跳转中..." : "微信扫码登录"}
                </button>
              </div>
            ) : null} */}

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

        {/* 安装到桌面提示 */}
        <Link
          to="/install-guide"
          className="mt-4 flex items-center gap-3 rounded-2xl bg-white/80 border border-primary/20 px-5 py-3.5 shadow-sm hover:shadow-md hover:border-primary/40 transition-all"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg">+</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary">安装应用到桌面</p>
            <p className="text-xs text-text-secondary">像 App 一样打开，全屏体验更流畅</p>
          </div>
          <span className="ml-auto text-text-tertiary text-sm">&rsaquo;</span>
        </Link>
      </div>
    </div>
  )
}

export default Auth
