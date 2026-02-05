import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import Modal from "../../components/Modal"
import { CloudApi } from "../../services/cloudApi"

const CODE_REG = /^[A-Z0-9]{6}$/

interface ActivationRecord {
  _id?: string
  code: string
  batchName?: string
  batch_name?: string
  used?: boolean
  is_used?: boolean
  revoked?: boolean
  is_revoked?: boolean
  deviceCount?: number
  device_count?: number
  deviceFingerprints?: string[]
  device_fingerprints?: string[]
  usageHistory?: Array<Record<string, any>>
  usage_history?: Array<Record<string, any>>
  createdAt?: string | number | Date
  created_at?: string | number | Date
  usedAt?: string | number | Date
  used_at?: string | number | Date
  usedBy?: string
  usedByUsername?: string
  orderId?: string
  order_id?: string
  expiresAt?: string | number | Date
  expires_at?: string | number | Date
}

interface StatsSummary {
  total: number
  used: number
  unused: number
  revoked: number
  fullLoaded: number
}

const isDateValue = (value: unknown): value is string | number | Date =>
  typeof value === "string" || typeof value === "number" || value instanceof Date

const toActivationRecord = (item: Record<string, unknown>): ActivationRecord | null => {
  const code = typeof item.code === "string" ? item.code : null
  if (!code) return null

  return {
    _id: typeof item._id === "string" ? item._id : undefined,
    code,
    batchName: typeof item.batchName === "string" ? item.batchName : undefined,
    batch_name: typeof item.batch_name === "string" ? item.batch_name : undefined,
    used: typeof item.used === "boolean" ? item.used : undefined,
    is_used: typeof item.is_used === "boolean" ? item.is_used : undefined,
    revoked: typeof item.revoked === "boolean" ? item.revoked : undefined,
    is_revoked: typeof item.is_revoked === "boolean" ? item.is_revoked : undefined,
    deviceCount: typeof item.deviceCount === "number" ? item.deviceCount : undefined,
    device_count: typeof item.device_count === "number" ? item.device_count : undefined,
    deviceFingerprints: Array.isArray(item.deviceFingerprints)
      ? item.deviceFingerprints.filter((value): value is string => typeof value === "string")
      : undefined,
    device_fingerprints: Array.isArray(item.device_fingerprints)
      ? item.device_fingerprints.filter((value): value is string => typeof value === "string")
      : undefined,
    usageHistory: Array.isArray(item.usageHistory) ? item.usageHistory : undefined,
    usage_history: Array.isArray(item.usage_history) ? item.usage_history : undefined,
    createdAt: isDateValue(item.createdAt) ? item.createdAt : undefined,
    created_at: isDateValue(item.created_at) ? item.created_at : undefined,
    usedAt: isDateValue(item.usedAt) ? item.usedAt : undefined,
    used_at: isDateValue(item.used_at) ? item.used_at : undefined,
    usedBy: typeof item.usedBy === "string" ? item.usedBy : undefined,
    usedByUsername: typeof item.usedByUsername === "string" ? item.usedByUsername : undefined,
    orderId: typeof item.orderId === "string" ? item.orderId : undefined,
    order_id: typeof item.order_id === "string" ? item.order_id : undefined,
    expiresAt: isDateValue(item.expiresAt) ? item.expiresAt : undefined,
    expires_at: isDateValue(item.expires_at) ? item.expires_at : undefined,
  }
}

const normalizeActivationRecords = (items?: Record<string, any>[]) => {
  if (!Array.isArray(items)) return []
  return items.reduce<ActivationRecord[]>((acc, item) => {
    const normalized = toActivationRecord(item)
    if (normalized) acc.push(normalized)
    return acc
  }, [])
}

const normalizeCode = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6)

const formatDate = (value?: string | number | Date) => {
  if (!value) return "-"
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return `${date.toLocaleDateString("zh-CN")} ${date.toLocaleTimeString("zh-CN")}`
}

const getDeviceCount = (record: ActivationRecord) => {
  if (typeof record.deviceCount === "number") return record.deviceCount
  if (typeof record.device_count === "number") return record.device_count
  const fingerprints = record.deviceFingerprints || record.device_fingerprints
  if (Array.isArray(fingerprints)) return fingerprints.length
  return 0
}

const getStatus = (record: ActivationRecord) => {
  const revoked = record.revoked ?? record.is_revoked
  const used = record.used ?? record.is_used
  if (revoked) return "revoked"
  if (used) return "used"
  return "unused"
}

const ActivationAdmin = () => {
  const navigate = useNavigate()
  const [stats, setStats] = useState<StatsSummary>({
    total: 0,
    used: 0,
    unused: 0,
    revoked: 0,
    fullLoaded: 0,
  })
  const [records, setRecords] = useState<ActivationRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"" | "used" | "unused" | "revoked">("")

  const [generateOpen, setGenerateOpen] = useState(false)
  const [generateCount, setGenerateCount] = useState(10)
  const [batchName, setBatchName] = useState("手动生成批次")
  const [generateLoading, setGenerateLoading] = useState(false)
  const [resultOpen, setResultOpen] = useState(false)
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([])

  const [detailOpen, setDetailOpen] = useState(false)
  const [activeRecord, setActiveRecord] = useState<ActivationRecord | null>(null)

  const [clearOpen, setClearOpen] = useState(false)
  const [clearCode, setClearCode] = useState("")
  const [clearLoading, setClearLoading] = useState(false)

  const pageInfo = useMemo(() => {
    return `第 ${page} 页，共 ${totalPages} 页 (总计 ${totalCount} 条)`
  }, [page, totalPages, totalCount])

  const fetchStats = async () => {
    const data = await CloudApi.activationStats()
    setStats({
      total: data.total || 0,
      used: data.used || 0,
      unused: data.unused || 0,
      revoked: data.revoked || 0,
      fullLoaded: data.fullLoaded || 0,
    })
  }

  const fetchRecords = async (nextPage = page) => {
    setLoading(true)
    try {
      const data = await CloudApi.activationList({
        page: nextPage,
        pageSize,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
      })
      setRecords(normalizeActivationRecords(data.records))
      const total = data.total || 0
      setTotalCount(total)
      const pages = Math.max(1, Math.ceil(total / pageSize))
      setTotalPages(pages)
      setPage(Math.min(nextPage, pages))
    } finally {
      setLoading(false)
    }
  }

  const refreshAll = async () => {
    await Promise.all([fetchStats(), fetchRecords(1)])
  }

  useEffect(() => {
    if (import.meta.env.PROD) {
      navigate("/", { replace: true })
      return
    }
    fetchStats()
    fetchRecords(1)
  }, [pageSize, statusFilter])

  const handleSearch = () => {
    fetchRecords(1)
  }

  const handleGenerate = async () => {
    if (!batchName.trim()) return
    if (generateCount < 1 || generateCount > 200) return

    setGenerateLoading(true)
    try {
      const result = await CloudApi.activationGenerate({
        count: generateCount,
        batchName: batchName.trim(),
      })
      setGeneratedCodes(result.codes || [])
      setResultOpen(true)
      setGenerateOpen(false)
      await refreshAll()
    } finally {
      setGenerateLoading(false)
    }
  }

  const handleClearDevices = async () => {
    const normalized = normalizeCode(clearCode)
    if (!CODE_REG.test(normalized)) return

    setClearLoading(true)
    try {
      await CloudApi.activationClearDevices({ code: normalized })
      setClearOpen(false)
      setClearCode("")
      await refreshAll()
    } finally {
      setClearLoading(false)
    }
  }

  const handleExport = () => {
    const payload = JSON.stringify(records, null, 2)
    const blob = new Blob([payload], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `activation_codes_${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const copyCodes = async () => {
    if (!generatedCodes.length) return
    const text = generatedCodes.join("\n")
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const textArea = document.createElement("textarea")
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
    }
  }

  const renderStatus = (record: ActivationRecord) => {
    const status = getStatus(record)
    const deviceCount = getDeviceCount(record)

    if (status === "revoked") {
      return <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">已撤销</span>
    }
    if (status === "used") {
      if (deviceCount >= 3) {
        return (
          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
            已满载 ({deviceCount}/3)
          </span>
        )
      }
      return (
        <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
          已使用 ({deviceCount}/3)
        </span>
      )
    }
    return <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">未使用</span>
  }

  const renderRows = () => {
    if (loading) {
      return (
        <tr>
          <td colSpan={8} className="py-10 text-center text-sm text-text-secondary">
            加载中...
          </td>
        </tr>
      )
    }

    if (!records.length) {
      return (
        <tr>
          <td colSpan={8} className="py-10 text-center text-sm text-text-secondary">
            暂无数据
          </td>
        </tr>
      )
    }

    return records.map((record) => {
      const usedAt = record.usedAt || record.used_at
      const createdAt = record.createdAt || record.created_at
      const orderId = record.orderId || record.order_id || record.usedByUsername || "-"
      const batch = record.batchName || record.batch_name || "-"

      return (
        <tr key={record._id || record.code} className="border-t border-gray-100 hover:bg-orange-50/30">
          <td className="py-3 px-4">
            <span className="rounded bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">
              {record.code}
            </span>
          </td>
          <td className="py-3 px-4 text-sm text-text-secondary">{batch}</td>
          <td className="py-3 px-4">{renderStatus(record)}</td>
          <td className="py-3 px-4">
            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
              {getDeviceCount(record)}
            </span>
          </td>
          <td className="py-3 px-4 text-sm text-text-secondary">{formatDate(createdAt)}</td>
          <td className="py-3 px-4 text-sm text-text-secondary">{formatDate(usedAt)}</td>
          <td className="py-3 px-4 text-sm text-text-secondary">{orderId}</td>
          <td className="py-3 px-4">
            <button
              type="button"
              className="rounded bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
              onClick={() => {
                setActiveRecord(record)
                setDetailOpen(true)
              }}
            >
              详情
            </button>
          </td>
        </tr>
      )
    })
  }

  const totalPagesArray = useMemo(() => {
    const start = Math.max(1, page - 2)
    const end = Math.min(totalPages, page + 2)
    const items = []
    for (let i = start; i <= end; i += 1) items.push(i)
    return items
  }, [page, totalPages])

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">🔐 激活码管理后台</h2>
          <p className="mt-1 text-sm text-text-secondary">管理激活码生成、状态与使用记录</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-active text-sm"
            onClick={() => setGenerateOpen(true)}
          >
            生成激活码
          </button>
          <button type="button" className="btn-default text-sm" onClick={refreshAll}>
            刷新数据
          </button>
          <button type="button" className="btn-default text-sm" onClick={handleExport}>
            导出数据
          </button>
          <button type="button" className="btn-default text-sm" onClick={() => setClearOpen(true)}>
            清空设备
          </button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "总激活码数", value: stats.total },
          { label: "已使用", value: stats.used },
          { label: "未使用", value: stats.unused },
          { label: "设备已满载", value: stats.fullLoaded },
        ].map((item) => (
          <div key={item.label} className="card p-5">
            <p className="text-xs text-text-secondary">{item.label}</p>
            <p className="mt-2 text-2xl font-bold text-text-primary">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-4">
          <h3 className="text-lg font-semibold text-text-primary">激活码列表</h3>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSearch()
              }}
              placeholder="搜索激活码或批次"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <button type="button" className="btn-active text-sm" onClick={handleSearch}>
              搜索
            </button>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-text-secondary"
            >
              <option value="">全部状态</option>
              <option value="used">已使用</option>
              <option value="unused">未使用</option>
              <option value="revoked">已撤销</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-text-tertiary">
              <tr>
                <th className="px-4 py-3">激活码</th>
                <th className="px-4 py-3">批次</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">设备数</th>
                <th className="px-4 py-3">创建时间</th>
                <th className="px-4 py-3">使用时间</th>
                <th className="px-4 py-3">关联用户</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody>{renderRows()}</tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 border-t border-gray-100 px-4 py-4 text-sm">
          <button
            type="button"
            className="rounded border border-gray-200 px-3 py-1"
            onClick={() => fetchRecords(1)}
            disabled={page === 1}
          >
            首页
          </button>
          <button
            type="button"
            className="rounded border border-gray-200 px-3 py-1"
            onClick={() => fetchRecords(page - 1)}
            disabled={page === 1}
          >
            上一页
          </button>
          {totalPagesArray.map((item) => (
            <button
              type="button"
              key={item}
              className={`rounded border px-3 py-1 ${item === page
                  ? "border-primary bg-primary text-white"
                  : "border-gray-200"
                }`}
              onClick={() => fetchRecords(item)}
            >
              {item}
            </button>
          ))}
          <button
            type="button"
            className="rounded border border-gray-200 px-3 py-1"
            onClick={() => fetchRecords(page + 1)}
            disabled={page === totalPages}
          >
            下一页
          </button>
          <button
            type="button"
            className="rounded border border-gray-200 px-3 py-1"
            onClick={() => fetchRecords(totalPages)}
            disabled={page === totalPages}
          >
            末页
          </button>
          <span className="text-xs text-text-tertiary">{pageInfo}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-tertiary">每页显示</span>
            <select
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
              className="rounded border border-gray-200 px-2 py-1 text-xs"
            >
              {[10, 20, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}条
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <Modal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        title="生成激活码"
        description="系统会自动生成 6 位大写字母 + 数字组合"
        footer={
          <>
            <button type="button" className="btn-default" onClick={() => setGenerateOpen(false)}>
              取消
            </button>
            <button type="button" className="btn-active" onClick={handleGenerate} disabled={generateLoading}>
              {generateLoading ? "生成中..." : "开始生成"}
            </button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-text-secondary">
            生成数量
            <input
              type="number"
              min={1}
              max={200}
              value={generateCount}
              onChange={(event) => setGenerateCount(Number(event.target.value))}
              className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm text-text-secondary">
            批次名称
            <input
              value={batchName}
              onChange={(event) => setBatchName(event.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </label>
        </div>
      </Modal>

      <Modal
        open={resultOpen}
        onClose={() => setResultOpen(false)}
        title="生成结果"
        description={`成功生成 ${generatedCodes.length} 个激活码`}
        footer={
          <>
            <button type="button" className="btn-default" onClick={() => setResultOpen(false)}>
              关闭
            </button>
            <button type="button" className="btn-active" onClick={copyCodes}>
              复制全部
            </button>
          </>
        }
      >
        <div className="flex flex-wrap gap-2">
          {generatedCodes.map((code) => (
            <button
              key={code}
              type="button"
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700"
              onClick={() => navigator.clipboard.writeText(code)}
            >
              {code}
            </button>
          ))}
        </div>
      </Modal>

      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title="激活码详情"
        footer={
          <button type="button" className="btn-default" onClick={() => setDetailOpen(false)}>
            关闭
          </button>
        }
      >
        {activeRecord ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-text-tertiary">激活码</p>
              <p className="mt-1 text-lg font-semibold text-text-primary">{activeRecord.code}</p>
            </div>
            <div>
              <p className="text-xs text-text-tertiary">批次</p>
              <p className="mt-1 text-sm text-text-secondary">{activeRecord.batchName || activeRecord.batch_name || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-text-tertiary">状态</p>
              <div className="mt-1">{renderStatus(activeRecord)}</div>
            </div>
            <div>
              <p className="text-xs text-text-tertiary">设备数</p>
              <p className="mt-1 text-sm text-text-secondary">{getDeviceCount(activeRecord)}</p>
            </div>
            <div>
              <p className="text-xs text-text-tertiary">创建时间</p>
              <p className="mt-1 text-sm text-text-secondary">
                {formatDate(activeRecord.createdAt || activeRecord.created_at)}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-tertiary">使用时间</p>
              <p className="mt-1 text-sm text-text-secondary">
                {formatDate(activeRecord.usedAt || activeRecord.used_at)}
              </p>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        title="清空设备"
        description="此操作会清除该激活码绑定的设备记录"
        footer={
          <>
            <button type="button" className="btn-default" onClick={() => setClearOpen(false)}>
              取消
            </button>
            <button type="button" className="btn-active" onClick={handleClearDevices} disabled={clearLoading}>
              {clearLoading ? "处理中..." : "确认清空"}
            </button>
          </>
        }
      >
        <label className="text-sm text-text-secondary">
          激活码
          <input
            value={clearCode}
            onChange={(event) => setClearCode(normalizeCode(event.target.value))}
            placeholder="请输入 6 位激活码"
            className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm tracking-[0.2em] uppercase"
          />
        </label>
      </Modal>
    </div>
  )
}

export default ActivationAdmin
