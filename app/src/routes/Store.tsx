import { useEffect, useState } from "react"

import Modal from "../components/Modal"
import { CloudApi } from "../services/cloudApi"
import { useClassStore } from "../stores/classStore"
import type { RedeemRecord, ShopItem, Student } from "../types"
import { normalizeRedeemRecords, normalizeShopItems, normalizeStudents } from "../utils/normalize"

const Store = () => {
  const [tab, setTab] = useState<"items" | "records">("items")
  const [items, setItems] = useState<ShopItem[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [records, setRecords] = useState<RedeemRecord[]>([])
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null)
  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const { classId } = useClassStore()

  const refresh = async () => {
    setLoading(true)
    try {
      const [itemResult, studentResult, recordResult] = await Promise.all([
        CloudApi.shopList({ classId }),
        CloudApi.studentList({ classId }),
        CloudApi.redeemList({ classId, page: 1, pageSize: 50 }),
      ])
      setItems(normalizeShopItems(itemResult.items || []))
      setStudents(normalizeStudents(studentResult.students || []))
      setRecords(normalizeRedeemRecords(recordResult.records || []))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    setSelectedItem(null)
    setSelectedStudentId("")
    setNotice(null)
  }, [classId])

  useEffect(() => {
    if (notice) {
      const timer = window.setTimeout(() => setNotice(null), 2000)
      return () => window.clearTimeout(timer)
    }
    return undefined
  }, [notice])

  const selectedStudent = students.find((student) => student.id === selectedStudentId) || null
  const hasEnoughScore = selectedStudent && selectedItem
    ? selectedStudent.availableScore >= selectedItem.cost
    : true
  const canRedeem = !loading && Boolean(selectedItem) && Boolean(selectedStudentId) && (selectedItem?.stock ?? 0) > 0 && hasEnoughScore

  const handleRedeem = async () => {
    if (!selectedItem || !selectedStudentId) return
    if (!hasEnoughScore) {
      setNotice({ type: "error", message: "积分不足，无法兑换。" })
      return
    }
    if (!canRedeem) return
    setLoading(true)
    try {
      await CloudApi.shopRedeem({ studentId: selectedStudentId, itemId: selectedItem.id, classId })
      setSelectedItem(null)
      setSelectedStudentId("")
      await refresh()
      setTab("records")
      setNotice({ type: "success", message: "兑换成功！" })
    } catch (error) {
      setNotice({ type: "error", message: "兑换失败，请稍后重试。" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="card p-6 border border-gray-100">
        <h2 className="text-2xl font-bold text-text-primary">小卖部</h2>
        <p className="mt-2 text-sm text-text-secondary">学生可用积分兑换奖励或装饰品。</p>
        <p className="mt-1 text-xs text-text-tertiary">可用积分 = 累计积分 - 已兑换，兑换后扣减；成长值决定幻兽等级，领养新幻兽后重新计算。</p>
      </div>

      <div className="flex gap-3">
        {[
          { key: "items", label: "商品列表" },
          { key: "records", label: "兑换记录" },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key as "items" | "records")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === item.key
                ? "btn-active"
                : "btn-default"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {notice ? (
        <div
          className={`rounded-xl border px-4 py-2 text-sm ${notice.type === "success"
            ? "border-success/30 bg-success/10 text-success"
            : "border-danger/30 bg-danger/10 text-danger"
            }`}
        >
          {notice.message}
        </div>
      ) : null}

      {tab === "items" ? (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="card p-5 border border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-2xl">{item.icon}</span>
                <span className="rounded-lg bg-warning/10 px-3 py-1 text-xs font-semibold text-warning">
                  {item.cost} 分
                </span>
              </div>
              <h3 className="mt-3 text-lg font-semibold text-text-primary">{item.name}</h3>
              <p className="mt-1 text-sm text-text-secondary">{item.description}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-text-tertiary">
                <span>库存 {item.stock}</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedItem(item)
                    setSelectedStudentId("")
                    setNotice(null)
                  }}
                  disabled={loading || item.stock <= 0}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold ${item.stock <= 0 || loading
                    ? "bg-gray-100 text-text-tertiary cursor-not-allowed"
                    : "btn-active"
                    }`}
                >
                  {item.stock <= 0 ? "售罄" : "兑换"}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-6 border border-gray-100">
          <div className="space-y-3 text-sm text-text-secondary">
            {records.length ? (
              records.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-text-primary">
                      {record.studentName} 兑换 {record.itemName}
                    </p>
                    <p className="text-xs text-text-tertiary">{record.createdAt}</p>
                  </div>
                  <span className="text-xs font-semibold text-warning">-{record.cost} 分</span>
                </div>
              ))
            ) : (
              <p>暂无兑换记录</p>
            )}
          </div>
        </div>
      )}

      <Modal
        open={Boolean(selectedItem)}
        onClose={() => {
          setSelectedItem(null)
          setSelectedStudentId("")
          setNotice(null)
        }}
        title="选择学生兑换"
        description="请选择兑换该奖励的学生"
        footer={
          <button
            type="button"
            onClick={handleRedeem}
            disabled={!canRedeem}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${!canRedeem
              ? "bg-gray-100 text-text-tertiary cursor-not-allowed"
              : "btn-active"
              }`}
          >
            确认兑换
          </button>
        }
      >
        <div className="space-y-3">
          <select
            value={selectedStudentId}
            onChange={(event) => {
              setSelectedStudentId(event.target.value)
              setNotice(null)
            }}
            className="w-full rounded-2xl border border-gray-200 px-4 py-2 text-sm"
          >
            <option value="">请选择学生</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>
          {selectedItem ? (
            <p className="text-sm text-text-secondary">
              兑换：{selectedItem.name}（{selectedItem.cost} 分）
            </p>
          ) : null}
          {selectedStudent && selectedItem ? (
            <p className={`text-xs ${hasEnoughScore ? "text-text-tertiary" : "text-danger"}`}>
              可用积分：{selectedStudent.availableScore}
              {hasEnoughScore ? "" : "（不足）"}
            </p>
          ) : null}
          {notice ? (
            <p className={`text-xs ${notice.type === "success" ? "text-success" : "text-danger"}`}>
              {notice.message}
            </p>
          ) : null}
          {loading ? <p className="text-xs text-text-tertiary">处理中...</p> : null}
        </div>
      </Modal>
    </div>
  )
}

export default Store
