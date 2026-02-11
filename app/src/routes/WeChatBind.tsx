import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

import { CloudApi } from "../services/cloudApi"
import { useAuthStore } from "../stores/authStore"
import { useClassStore } from "../stores/classStore"

const WX_TEMP_KEY = "tt-wx-bind-temp"

interface WxTemp {
  tempToken: string
  nickname: string
  avatar: string
}

const WeChatBind = () => {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [notice, setNotice] = useState("")
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [wxTemp, setWxTemp] = useState<WxTemp | null>(null)

  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const { clearClass } = useClassStore()

  useEffect(() => {
    // 读取微信临时数据
    const raw = localStorage.getItem(WX_TEMP_KEY)
    if (!raw) {
      navigate("/auth", { replace: true })
      return
    }

    try {
      const data = JSON.parse(raw) as WxTemp
      if (!data.tempToken) {
        navigate("/auth", { replace: true })
        return
      }
      setWxTemp(data)
    } catch {
      navigate("/auth", { replace: true })
      return
    }

    const init = async () => {
      try {
        setReady(true)
      } catch {
        setNotice("云服务连接失败，请刷新重试")
      }
    }
    init()
  }, [navigate])

  const handleBind = async () => {
    if (!wxTemp) return

    if (!username.trim() || !password.trim()) {
      setNotice("请输入用户名和密码")
      return
    }

    setLoading(true)
    setNotice("")

    try {
      const result = await CloudApi.wechatBind({
        tempToken: wxTemp.tempToken,
        username: username.trim(),
        password,
      })

      // 清理临时数据
      localStorage.removeItem(WX_TEMP_KEY)
      localStorage.removeItem("tt-wx-error")

      clearClass()
      setAuth(result.token, result.username, "main", result.username)
      navigate("/")
    } catch (error) {
      const message = error instanceof Error ? error.message : "绑定失败"
      if (message.includes("过期")) {
        setNotice("绑定链接已过期，请重新扫码")
      } else if (message.includes("密码")) {
        setNotice("密码错误，请重试")
      } else if (message.includes("不存在")) {
        setNotice("用户不存在，请检查用户名")
      } else if (message.includes("未激活")) {
        setNotice("账号未激活，请先激活后再绑定微信")
      } else if (message.includes("已绑定")) {
        setNotice(message)
      } else {
        setNotice("绑定失败，请重试")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    localStorage.removeItem(WX_TEMP_KEY)
    localStorage.removeItem("tt-wx-error")
    navigate("/auth", { replace: true })
  }

  if (!wxTemp) return null

  return (
    <div className="min-h-screen bg-background px-4 py-12 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="mx-auto w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
          <div className="border-b border-gray-100 px-8 py-5">
            <h2 className="text-center text-lg font-bold text-text-primary">绑定微信账号</h2>
          </div>

          <div className="px-8 py-8">
            {/* 微信信息 */}
            <div className="flex items-center gap-4 rounded-xl bg-green-50 p-4 mb-6">
              {wxTemp.avatar ? (
                <img
                  src={wxTemp.avatar}
                  alt="微信头像"
                  className="h-12 w-12 rounded-full"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-xl">
                  W
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  {wxTemp.nickname || "微信用户"}
                </p>
                <p className="text-xs text-text-secondary">请绑定已有账号以完成微信登录</p>
              </div>
            </div>

            {/* 用户名 */}
            <label className="text-sm font-semibold text-text-primary">用户名</label>
            <div className="mt-2 rounded-xl border border-gray-200 px-4 py-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入已注册的用户名"
                className="w-full text-sm outline-none placeholder:text-gray-400"
              />
            </div>

            {/* 密码 */}
            <label className="mt-5 block text-sm font-semibold text-text-primary">密码</label>
            <div className="mt-2 flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                placeholder="请输入密码"
                className="w-full text-sm outline-none placeholder:text-gray-400"
                onKeyDown={(e) => { if (e.key === "Enter") handleBind() }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="text-xs text-text-secondary hover:text-primary"
              >
                {showPassword ? "隐藏" : "显示"}
              </button>
            </div>

            {/* 绑定按钮 */}
            <button
              type="button"
              onClick={handleBind}
              disabled={!ready || loading}
              className="mt-8 w-full btn-active py-3 text-base shadow-lg shadow-primary/30 hover:shadow-primary/40 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {!ready ? "连接中..." : loading ? "绑定中..." : "绑定并登录"}
            </button>

            {/* 取消 */}
            <button
              type="button"
              onClick={handleCancel}
              className="mt-3 w-full py-2 text-sm text-text-secondary hover:text-primary transition-colors"
            >
              取消，返回登录页
            </button>

            {notice ? (
              <p className="mt-4 text-center text-xs text-danger bg-red-50 py-2 rounded-lg">{notice}</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

export default WeChatBind
