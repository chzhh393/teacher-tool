import { useEffect, useState } from "react"

import { CloudApi } from "../services/cloudApi"
import { useClassStore } from "../stores/classStore"
import type { ScoreRecord } from "../types"
import type { TTRecordSummaryResponse } from "../types/api"
import { normalizeScoreRecords } from "../utils/normalize"

type Tab = "details" | "summary"
type TimeRange = "week" | "month"

const Records = () => {
  // 明细状态
  const [records, setRecords] = useState<ScoreRecord[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const pageSize = 20
  const { classId } = useClassStore()

  // 概览状态
  const [activeTab, setActiveTab] = useState<Tab>("details")
  const [timeRange, setTimeRange] = useState<TimeRange>("week")
  const [summaryData, setSummaryData] = useState<TTRecordSummaryResponse | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState("")

  // ---- 明细相关逻辑 ----

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
    if (activeTab === "details") {
      fetchRecords()
    }
  }, [page, classId, activeTab])

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

  // ---- 概览相关逻辑 ----

  const fetchSummary = async (range?: TimeRange) => {
    if (!classId) return
    setSummaryLoading(true)
    setSummaryError("")
    try {
      const result = await CloudApi.recordSummary({
        classId,
        timeRange: range || timeRange,
      })
      setSummaryData(result)
    } catch (err) {
      setSummaryError("加载概览失败，请稍后重试")
      setSummaryData(null)
    } finally {
      setSummaryLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === "summary" && classId) {
      fetchSummary()
    }
  }, [classId, activeTab])

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
  }

  const handleTimeRangeChange = (range: TimeRange) => {
    setTimeRange(range)
    fetchSummary(range)
  }

  // ---- 无班级状态 ----

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
    <div className="space-y-4 md:space-y-6">
      {/* 标题 */}
      <div className="card p-4 border border-gray-100 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-text-primary md:text-2xl">成长记录</h2>
            <p className="mt-1 text-xs text-text-secondary md:mt-2 md:text-sm">记录每一次加减分操作，可导出 CSV。</p>
          </div>
          {activeTab === "details" && (
            <button
              type="button"
              onClick={handleExport}
              disabled={loading}
              className="rounded-lg btn-active px-3 py-1.5 text-xs font-semibold disabled:opacity-50 md:px-4 md:py-2 md:text-sm"
            >
              导出 CSV
            </button>
          )}
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="flex rounded-xl border border-gray-200 bg-white p-1">
        <button
          type="button"
          onClick={() => handleTabChange("details")}
          className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors md:px-4 md:py-2 md:text-sm ${
            activeTab === "details" ? "bg-primary/10 text-primary" : "text-text-tertiary hover:text-text-secondary"
          }`}
        >
          明细记录
        </button>
        <button
          type="button"
          onClick={() => handleTabChange("summary")}
          className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors md:px-4 md:py-2 md:text-sm ${
            activeTab === "summary" ? "bg-primary/10 text-primary" : "text-text-tertiary hover:text-text-secondary"
          }`}
        >
          概览统计
        </button>
      </div>

      {/* 明细视图 */}
      {activeTab === "details" && (
        <>
          {/* 搜索栏 */}
          <div className="card p-4 border border-gray-100 md:p-6">
            <div className="flex gap-2">
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

          {/* 记录列表 */}
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
        </>
      )}

      {/* 概览视图 */}
      {activeTab === "summary" && (
        <div className="space-y-4 md:space-y-6">
          {/* 时间范围选择器 */}
          <div className="card p-4 border border-gray-100 md:p-6">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleTimeRangeChange("week")}
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors md:text-sm ${
                  timeRange === "week" ? "bg-primary text-white" : "bg-gray-100 text-text-secondary hover:bg-gray-200"
                }`}
              >
                本周
              </button>
              <button
                type="button"
                onClick={() => handleTimeRangeChange("month")}
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors md:text-sm ${
                  timeRange === "month" ? "bg-primary text-white" : "bg-gray-100 text-text-secondary hover:bg-gray-200"
                }`}
              >
                本月
              </button>
            </div>
            {summaryData?.timeRange && (
              <p className="mt-2 text-center text-[10px] text-text-tertiary md:text-xs">
                {summaryData.timeRange.startDate} 至 {summaryData.timeRange.endDate}
              </p>
            )}
          </div>

          {summaryError && (
            <div className="card p-4 border border-gray-100">
              <p className="text-xs text-danger">{summaryError}</p>
            </div>
          )}

          {summaryLoading && (
            <div className="card p-4 border border-gray-100 text-center">
              <p className="text-xs text-text-tertiary">加载中...</p>
            </div>
          )}

          {!summaryLoading && summaryData && (
            <>
              {/* 班级整体统计 */}
              <div className="card p-4 border border-gray-100 md:p-6">
                <h3 className="mb-3 text-sm font-bold text-text-primary md:text-base">班级整体</h3>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
                  <div className="rounded-xl bg-green-50 p-3">
                    <p className="text-[10px] text-text-tertiary md:text-xs">总加分</p>
                    <p className="text-lg font-bold text-success md:text-xl">
                      +{summaryData.classSummary.totalAddScore}
                    </p>
                    <p className="text-[10px] text-text-tertiary">{summaryData.classSummary.totalAddCount} 次</p>
                  </div>
                  <div className="rounded-xl bg-red-50 p-3">
                    <p className="text-[10px] text-text-tertiary md:text-xs">总扣分</p>
                    <p className="text-lg font-bold text-danger md:text-xl">
                      -{summaryData.classSummary.totalSubtractScore}
                    </p>
                    <p className="text-[10px] text-text-tertiary">{summaryData.classSummary.totalSubtractCount} 次</p>
                  </div>
                  <div className="rounded-xl bg-blue-50 p-3">
                    <p className="text-[10px] text-text-tertiary md:text-xs">净得分</p>
                    <p
                      className={`text-lg font-bold md:text-xl ${
                        summaryData.classSummary.netScore >= 0 ? "text-success" : "text-danger"
                      }`}
                    >
                      {summaryData.classSummary.netScore >= 0 ? "+" : ""}
                      {summaryData.classSummary.netScore}
                    </p>
                    <p className="text-[10px] text-text-tertiary">{summaryData.classSummary.totalOperations} 次操作</p>
                  </div>
                  <div className="rounded-xl bg-orange-50 p-3">
                    <p className="text-[10px] text-text-tertiary md:text-xs">活跃学生</p>
                    <p className="text-lg font-bold text-primary md:text-xl">
                      {summaryData.classSummary.activeStudentCount}
                    </p>
                    <p className="text-[10px] text-text-tertiary">有记录的学生</p>
                  </div>
                </div>
              </div>

              {/* 学生排行 */}
              <div className="card p-4 border border-gray-100 md:p-6">
                <h3 className="mb-3 text-sm font-bold text-text-primary md:text-base">学生排行</h3>
                <div className="space-y-2 md:space-y-3">
                  {summaryData.studentSummaries.length > 0 ? (
                    summaryData.studentSummaries.map((student, index) => (
                      <div
                        key={student.studentId}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 md:rounded-2xl md:px-4 md:py-3"
                      >
                        <div className="flex items-center gap-2 md:gap-3">
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold md:h-7 md:w-7 md:text-xs ${
                              index === 0
                                ? "bg-yellow-400 text-white"
                                : index === 1
                                  ? "bg-gray-300 text-gray-700"
                                  : index === 2
                                    ? "bg-orange-300 text-orange-800"
                                    : "bg-gray-100 text-text-tertiary"
                            }`}
                          >
                            {index + 1}
                          </span>
                          <p className="text-sm font-semibold text-text-primary md:text-base">{student.studentName}</p>
                        </div>

                        {/* 桌面端数据 */}
                        <div className="hidden items-center gap-4 text-xs md:flex">
                          <div className="text-center">
                            <p className="font-semibold text-success">+{student.addTotal}</p>
                            <p className="text-text-tertiary">{student.addCount}次</p>
                          </div>
                          <div className="text-center">
                            <p className="font-semibold text-danger">-{student.subtractTotal}</p>
                            <p className="text-text-tertiary">{student.subtractCount}次</p>
                          </div>
                          <div className="text-center">
                            <p
                              className={`font-bold ${student.netScore >= 0 ? "text-success" : "text-danger"}`}
                            >
                              {student.netScore >= 0 ? "+" : ""}
                              {student.netScore}
                            </p>
                            <p className="text-text-tertiary">净得分</p>
                          </div>
                        </div>

                        {/* 手机端数据 */}
                        <div className="flex w-full items-center justify-around text-[10px] md:hidden">
                          <div className="text-center">
                            <p className="font-semibold text-success">+{student.addTotal}</p>
                            <p className="text-text-tertiary">{student.addCount}次</p>
                          </div>
                          <div className="text-center">
                            <p className="font-semibold text-danger">-{student.subtractTotal}</p>
                            <p className="text-text-tertiary">{student.subtractCount}次</p>
                          </div>
                          <div className="text-center">
                            <p
                              className={`font-bold ${student.netScore >= 0 ? "text-success" : "text-danger"}`}
                            >
                              {student.netScore >= 0 ? "+" : ""}
                              {student.netScore}
                            </p>
                            <p className="text-text-tertiary">净得分</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="py-4 text-center text-sm text-text-tertiary">该时间段内暂无记录</p>
                  )}
                </div>
              </div>

              {/* 规则统计 */}
              {summaryData.ruleSummaries.length > 0 && (
                <div className="card p-4 border border-gray-100 md:p-6">
                  <h3 className="mb-3 text-sm font-bold text-text-primary md:text-base">规则统计</h3>
                  <div className="space-y-2 md:space-y-3">
                    {summaryData.ruleSummaries.map((rule) => (
                      <div
                        key={`${rule.ruleId}-${rule.type}`}
                        className={`flex items-center justify-between rounded-xl border px-3 py-2 md:rounded-2xl md:px-4 md:py-3 ${
                          rule.type === "add"
                            ? "border-green-100 bg-green-50"
                            : "border-red-100 bg-red-50"
                        }`}
                      >
                        <div>
                          <p className="text-sm font-semibold text-text-primary md:text-base">{rule.ruleName || "未命名规则"}</p>
                          <p className="text-[10px] text-text-tertiary md:text-xs">使用 {rule.count} 次</p>
                        </div>
                        <p
                          className={`text-sm font-bold md:text-base ${
                            rule.type === "add" ? "text-success" : "text-danger"
                          }`}
                        >
                          {rule.type === "add" ? "+" : "-"}
                          {rule.totalScore}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default Records
