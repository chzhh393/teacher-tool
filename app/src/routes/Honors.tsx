import { useEffect, useState } from "react"

import { CloudApi } from "../services/cloudApi"
import { beasts } from "../data/beasts"
import type { Student } from "../types"
import { normalizeStudents } from "../utils/normalize"
import { useClassStore } from "../stores/classStore"

const Honors = () => {
  const [ranks, setRanks] = useState<Student[]>([])
  const { classId } = useClassStore()

  useEffect(() => {
    const fetchRanks = async () => {
      try {
        const result = await CloudApi.honorsList({ classId })
        setRanks(normalizeStudents(result.ranks || []))
      } catch (error) {
        setRanks([])
      }
    }

    fetchRanks()
  }, [classId])

  return (
    <div className="space-y-6">
      <div className="card p-6 border border-gray-100">
        <h2 className="text-2xl font-bold text-text-primary">光荣榜</h2>
        <p className="mt-2 text-sm text-text-secondary">按徽章数量与累计积分排序展示。</p>
        <p className="mt-1 text-xs text-text-tertiary">累计积分 = 历史总获得（不受兑换和换幻兽影响）；可用积分 = 当前余额，可在小卖部兑换奖励。</p>
      </div>

      <div className="card p-6 border border-gray-100">
        <div className="space-y-3">
          {ranks.map((student, index) => {
            const highlight = index < 3
            const collected = (student.collectedBeasts || [])
              .map((id) => beasts.find((b) => b.id === id))
              .filter(Boolean)
            return (
              <div
                key={student.id}
                className={`flex items-center justify-between rounded-2xl px-4 py-3 ${
                  highlight ? "bg-orange-50" : "bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                      index === 0
                        ? "bg-warning text-white"
                        : index === 1
                        ? "bg-gray-200 text-gray-700"
                        : index === 2
                        ? "bg-orange-200 text-orange-700"
                        : "bg-white text-text-tertiary"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-text-primary">{student.name}</p>
                    <p className="text-xs text-text-secondary">Lv.{student.level}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {collected.length > 0 && (
                    <div className="flex -space-x-1">
                      {collected.map((beast) => (
                        <img
                          key={beast!.id}
                          src={beast!.images.ultimate}
                          alt={beast!.name}
                          title={beast!.name}
                          className="h-8 w-8 rounded-full border-2 border-white object-contain bg-amber-50"
                        />
                      ))}
                    </div>
                  )}
                  <div className="text-right text-xs text-text-secondary">
                    <p>徽章 {student.badges}</p>
                    <p>累计积分 {student.earnedScore || 0}</p>
                    <p>可用积分 {student.availableScore}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default Honors
