import { useEffect, useState } from "react"

import { CloudApi } from "../services/cloudApi"
import { useClassStore } from "../stores/classStore"
import type { ScoreRecord } from "../types"
import { normalizeScoreRecords } from "../utils/normalize"

const Records = () => {
  const [records, setRecords] = useState<ScoreRecord[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const pageSize = 20
  const { classId } = useClassStore()

  const fetchRecords = async (searchName?: string) => {
    if (!classId) {
      setRecords([])
      setTotal(0)
      return
    }
    setLoading(true)
    setError("")
    try {
      const result = await CloudApi.recordList({
        classId,
        page,
        pageSize,
        studentName: searchName ?? search,
      })
      setRecords(normalizeScoreRecords(result.records || []))
      setTotal(result.total || 0)
    } catch (err) {
      setError("加载失败，请稍后重试")
      setRecords([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecords()
  }, [page, classId])

  const handleSearch = () => {
    setPage(1)
    fetchRecords(search)
  }

  const handleClearSearch = () => {
    setSearch("")
    setPage(1)
    fetchRecords("")
  }

  const handleExport = async () => {
    if (!classId) {
      setError("请先选择班级")
      return
    }
    setLoading(true)
    setError("")
    try {
      const result = await CloudApi.recordExport()
      if (result.csvUrl) {
        window.open(result.csvUrl, "_blank")
      } else {
        setError("导出失败，暂无数据")
      }
    } catch (err) {
      setError("导出失败，请稍后重试")
    } finally {
      setLoading(false)
    }
  }

  const handleRevoke = async (recordId: string) => {
    if (!window.confirm("确认撤回此操作？")) return
    setLoading(true)
    setError("")
    try {
      await CloudApi.scoreRevoke({ recordId })
      await fetchRecords()
    } catch (err) {
      setError("撤回失败，请稍后重试")
    } finally {
      setLoading(false)
    }
  }

  const totalPages = Math.ceil(total / pageSize) || 1
  const isFirstPage = page === 1
  const isLastPage = page >= totalPages

  if (!classId) {
    return (
      <div className="space-y-6">
        <div className="card p-4 border border-gray-100 md:p-6">
          <h2 className="text-lg font-bold text-text-primary md:text-2xl">成长记录</h2>
          <p className="mt-1 text-xs text-text-secondary md:mt-2 md:text-sm">记录每一次加减分操作，可导出 CSV。</p>
        </div>
        <div className="card p-4 border border-gray-100 text-center md:p-6">
          <p className="text-sm text-text-tertiary">请先选择班级</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="card p-4 border border-gray-100 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-text-primary md:text-2xl">成长记录</h2>
            <p className="mt-1 text-xs text-text-secondary md:mt-2 md:text-sm">记录每一次加减分操作，可导出 CSV。</p>
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={loading}
            className="rounded-lg btn-active px-3 py-1.5 text-xs font-semibold disabled:opacity-50 md:px-4 md:py-2 md:text-sm"
          >
            导出 CSV
          </button>
        </div>
        <div className="mt-3 flex gap-2 md:mt-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="搜索学生姓名..."
            className="flex-1 rounded-xl border border-gray-200 px-3 py-1.5 text-xs md:py-2 md:text-sm"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={loading}
            className="rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary disabled:opacity-50 md:px-4 md:py-2 md:text-sm"
          >
            搜索
          </button>
          {search && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs text-text-secondary md:py-2 md:text-sm"
            >
              清除
            </button>
          )}
        </div>
      </div>

      <div className="card p-4 border border-gray-100 md:p-6">
        {error && <p className="mb-3 text-xs text-danger">{error}</p>}
        <div className="space-y-2 md:space-y-3">
          {records.length ? (
            records.map((record) => (
              <div
                key={record.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 md:gap-3 md:rounded-2xl md:px-4 md:py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-text-primary md:text-base">
                    {record.studentName} · {record.ruleName}
                  </p>
                  <p className="text-[10px] text-text-tertiary md:text-xs">
                    {record.createdAt}
                    {record.operatorName && <span className="ml-2">操作人：{record.operatorName}</span>}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-xs md:gap-3">
                  {record.type === "revoke" ? (
                    <span className="text-text-tertiary">撤回操作</span>
                  ) : (
                    <>
                      <span className={record.score >= 0 ? "text-success" : "text-danger"}>
                        {record.score >= 0 ? `+${record.score}` : record.score}
                      </span>
                      {!record.revoked ? (
                        <button
                          type="button"
                          onClick={() => handleRevoke(record.id)}
                          disabled={loading}
                          className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-danger disabled:opacity-50"
                        >
                          撤回
                        </button>
                      ) : (
                        <span className="text-text-tertiary">已撤回</span>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-text-tertiary py-4 text-center">暂无记录</p>
          )}
        </div>

        {total > 0 && (
          <div className="mt-4 flex items-center justify-between text-xs text-text-secondary md:mt-6 md:text-sm">
            <span>
              第 {page}/{totalPages} 页，共 {total} 条
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={isFirstPage || loading}
                className="rounded-lg border border-gray-200 px-2 py-1 text-text-secondary disabled:opacity-50 disabled:cursor-not-allowed md:px-3"
              >
                上一页
              </button>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={isLastPage || loading}
                className="rounded-lg border border-gray-200 px-2 py-1 text-text-secondary disabled:opacity-50 disabled:cursor-not-allowed md:px-3"
              >
                下一页
              </button>
            </div>
          </div>
        )}
        {loading && <p className="mt-3 text-xs text-text-tertiary">加载中...</p>}
      </div>
    </div>
  )
}

export default Records
