import { useEffect, useState } from "react"
import { CloudApi } from "../services/cloudApi"
import { useClassStore } from "../stores/classStore"
import type { Student } from "../types"

interface ShareModalProps {
  open: boolean
  onClose: () => void
  students: Student[]
}

type Tab = "create" | "manage"

interface ShareItem {
  token: string
  type: "class" | "student"
  className: string
  studentName?: string | null
  createdAt: string
  expiresAt: string
  revoked: boolean
}

const DOMAIN = "https://learn-fun.cn"

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })
  } catch {
    return iso
  }
}

export default function ShareModal({ open, onClose, students }: ShareModalProps) {
  const { classId } = useClassStore()
  const [tab, setTab] = useState<Tab>("create")
  const [shareType, setShareType] = useState<"class" | "student">("class")
  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [loading, setLoading] = useState(false)
  const [shareUrl, setShareUrl] = useState("")
  const [expiresAt, setExpiresAt] = useState("")
  const [copied, setCopied] = useState(false)
  const [shares, setShares] = useState<ShareItem[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [notice, setNotice] = useState("")

  // 切换到管理 tab 时加载列表
  useEffect(() => {
    if (tab === "manage" && open) {
      loadShares()
    }
  }, [tab, open])

  // 打开时重置状态
  useEffect(() => {
    if (open) {
      setShareUrl("")
      setExpiresAt("")
      setCopied(false)
      setNotice("")
    }
  }, [open])

  const loadShares = async () => {
    setListLoading(true)
    try {
      const result = await CloudApi.shareList()
      setShares(result.shares || [])
    } catch {
      setNotice("加载失败")
    } finally {
      setListLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!classId) return
    if (shareType === "student" && !selectedStudentId) {
      setNotice("请选择学生")
      return
    }

    setLoading(true)
    setNotice("")
    try {
      const result = await CloudApi.shareCreate({
        type: shareType,
        classId,
        ...(shareType === "student" ? { studentId: selectedStudentId } : {}),
      })
      setShareUrl(result.shareUrl)
      setExpiresAt(result.expiresAt)
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "创建失败")
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async (url?: string) => {
    const text = url || shareUrl
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setNotice("已复制到剪贴板")
      setTimeout(() => {
        setCopied(false)
        setNotice("")
      }, 2000)
    } catch {
      // fallback
      const input = document.createElement("input")
      input.value = text
      document.body.appendChild(input)
      input.select()
      document.execCommand("copy")
      document.body.removeChild(input)
      setCopied(true)
      setNotice("已复制到剪贴板")
      setTimeout(() => {
        setCopied(false)
        setNotice("")
      }, 2000)
    }
  }

  const handleRevoke = async (shareToken: string) => {
    try {
      await CloudApi.shareRevoke({ shareToken })
      setShares((prev) =>
        prev.map((s) => (s.token === shareToken ? { ...s, revoked: true } : s))
      )
      setNotice("已撤销")
      setTimeout(() => setNotice(""), 2000)
    } catch {
      setNotice("撤销失败")
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-lg font-bold text-text-primary">分享养成进度</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-text-tertiary hover:bg-gray-100 hover:text-text-primary"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-5">
          <button
            type="button"
            onClick={() => setTab("create")}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === "create"
                ? "border-b-2 border-primary text-primary"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            创建分享
          </button>
          <button
            type="button"
            onClick={() => setTab("manage")}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === "manage"
                ? "border-b-2 border-primary text-primary"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            管理分享
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {tab === "create" ? (
            <div className="space-y-4">
              <p className="text-xs text-text-secondary">生成链接发送到微信群，家长点开即可查看进度</p>

              {/* Share type selection */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShareType("class"); setShareUrl("") }}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    shareType === "class"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-gray-200 text-text-secondary hover:border-gray-300"
                  }`}
                >
                  整个班级
                </button>
                <button
                  type="button"
                  onClick={() => { setShareType("student"); setShareUrl("") }}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    shareType === "student"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-gray-200 text-text-secondary hover:border-gray-300"
                  }`}
                >
                  单个学生
                </button>
              </div>

              {/* Student selector */}
              {shareType === "student" && (
                <select
                  value={selectedStudentId}
                  onChange={(e) => { setSelectedStudentId(e.target.value); setShareUrl("") }}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">请选择学生...</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              )}

              {/* Create button or result */}
              {shareUrl ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                    <p className="mb-1 text-xs font-medium text-green-700">分享链接已生成</p>
                    <p className="break-all text-xs text-green-600">{shareUrl}</p>
                    <p className="mt-1 text-xs text-green-500">有效期至 {formatDate(expiresAt)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy()}
                    className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                      copied
                        ? "bg-green-500 text-white"
                        : "btn-active"
                    }`}
                  >
                    {copied ? "已复制" : "复制链接"}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={loading}
                  className="w-full rounded-lg btn-active px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
                >
                  {loading ? "生成中..." : "生成分享链接"}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {listLoading ? (
                <p className="py-8 text-center text-sm text-text-secondary">加载中...</p>
              ) : shares.length === 0 ? (
                <p className="py-8 text-center text-sm text-text-secondary">暂无分享记录</p>
              ) : (
                <div className="max-h-80 space-y-2 overflow-y-auto">
                  {shares.map((share) => {
                    const isExpired = new Date(share.expiresAt).getTime() < Date.now()
                    const isInvalid = share.revoked || isExpired
                    return (
                      <div
                        key={share.token}
                        className={`rounded-lg border p-3 ${isInvalid ? "border-gray-100 bg-gray-50 opacity-60" : "border-gray-200"}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                                share.type === "class"
                                  ? "bg-blue-50 text-blue-600"
                                  : "bg-purple-50 text-purple-600"
                              }`}>
                                {share.type === "class" ? "班级" : "学生"}
                              </span>
                              <span className="truncate text-sm font-medium text-text-primary">
                                {share.type === "student" ? share.studentName : share.className}
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs text-text-tertiary">
                              {formatDate(share.createdAt)} 创建
                              {share.revoked
                                ? " · 已撤销"
                                : isExpired
                                  ? " · 已过期"
                                  : ` · ${formatDate(share.expiresAt)} 到期`}
                            </p>
                          </div>
                          {!isInvalid && (
                            <div className="ml-2 flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleCopy(`${DOMAIN}/#/s/${share.token}`)}
                                className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium text-text-secondary hover:border-primary hover:text-primary"
                              >
                                复制
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRevoke(share.token)}
                                className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium text-red-500 hover:border-red-300 hover:bg-red-50"
                              >
                                撤销
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Notice toast */}
          {notice && (
            <div className="mt-3 rounded-lg bg-gray-100 px-3 py-2 text-center text-xs font-medium text-text-secondary">
              {notice}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
