import { useEffect, useRef, useState } from "react"

import { CloudApi } from "../services/cloudApi"
import { beasts, type Beast } from "../data/beasts"
import type { Student } from "../types"
import type { GroupRankItem } from "../types/api"
import { normalizeStudents } from "../utils/normalize"
import { useClassStore } from "../stores/classStore"

interface HoverInfo {
  beast: Beast
  x: number
  y: number
}

const Honors = () => {
  const [ranks, setRanks] = useState<Student[]>([])
  const [groupRanks, setGroupRanks] = useState<GroupRankItem[] | undefined>()
  const [activeTab, setActiveTab] = useState<"personal" | "group">("personal")
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null)
  const [hover, setHover] = useState<HoverInfo | null>(null)
  const hoverTimeout = useRef<number>(0)
  const { classId } = useClassStore()

  useEffect(() => {
    setRanks([])
    setGroupRanks(undefined)

    const fetchRanks = async () => {
      try {
        const result = await CloudApi.honorsList({ classId })
        setRanks(normalizeStudents(result.ranks || []))
        setGroupRanks(result.groupRanks)
      } catch (error) {
        setRanks([])
        setGroupRanks(undefined)
      }
    }

    fetchRanks()
  }, [classId])

  const hasGroups = groupRanks && groupRanks.length > 0

  return (
    <div className="space-y-6">
      <div className="card p-6 border border-gray-100">
        <h2 className="text-2xl font-bold text-text-primary">光荣榜</h2>
        <p className="mt-2 text-sm text-text-secondary">按徽章数量与累计积分排序展示。</p>
        <p className="mt-1 text-xs text-text-tertiary">累计积分 = 历史总获得（不受兑换和换幻兽影响）；可用积分 = 当前余额，可在小卖部兑换奖励。</p>
      </div>

      {hasGroups && (
        <div className="flex rounded-xl border border-gray-100 bg-white p-1">
          <button
            type="button"
            onClick={() => setActiveTab("personal")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === "personal"
                ? "bg-primary/10 text-primary"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            个人榜
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("group")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === "group"
                ? "bg-primary/10 text-primary"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            小组PK
          </button>
        </div>
      )}

      {/* 个人榜 */}
      {activeTab !== "group" && (
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
                            className="h-8 w-8 cursor-pointer rounded-full border-2 border-white object-contain bg-amber-50 transition-transform hover:scale-110 hover:z-10"
                            onMouseEnter={(e) => {
                              window.clearTimeout(hoverTimeout.current)
                              const rect = e.currentTarget.getBoundingClientRect()
                              setHover({ beast: beast!, x: rect.left + rect.width / 2, y: rect.top })
                            }}
                            onMouseLeave={() => {
                              hoverTimeout.current = window.setTimeout(() => setHover(null), 150)
                            }}
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
      )}

      {/* 小组PK榜 */}
      {activeTab === "group" && hasGroups && (
        <div className="card p-6 border border-gray-100">
          <div className="space-y-3">
            {groupRanks!.map((item, index) => {
              const highlight = index < 3
              const isExpanded = expandedGroupId === item.group.id
              const avgScore = item.memberCount > 0
                ? Math.round(item.totalEarnedScore / item.memberCount)
                : 0
              return (
                <div key={item.group.id}>
                  <button
                    type="button"
                    onClick={() => setExpandedGroupId(isExpanded ? null : item.group.id)}
                    className={`w-full rounded-2xl px-4 py-3 text-left transition-colors ${
                      highlight ? "bg-orange-50" : "bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
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
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block h-3 w-3 rounded-full"
                            style={{ backgroundColor: item.group.color || "#6366F1" }}
                          />
                          <p className="font-semibold text-text-primary">{item.group.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-bold text-primary">{item.totalEarnedScore} 分</p>
                          <p className="text-xs text-text-tertiary">{item.memberCount}人 · 人均 {avgScore} 分</p>
                        </div>
                        <span className={`text-text-tertiary transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="mt-1 ml-11 space-y-1.5 rounded-xl bg-gray-50 p-3">
                      {item.members.length === 0 ? (
                        <p className="text-xs text-text-tertiary">暂无成员</p>
                      ) : (
                        [...item.members]
                          .sort((a, b) => b.earnedScore - a.earnedScore)
                          .map((m) => (
                            <div key={m.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-1.5">
                              <span className="text-sm text-text-secondary">{m.name}</span>
                              <span className="text-xs text-text-tertiary">{m.earnedScore} 分</span>
                            </div>
                          ))
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {hover && (
        <div
          className="pointer-events-none fixed z-50 flex flex-col items-center"
          style={{ left: hover.x, top: hover.y, transform: "translate(-50%, -110%)" }}
        >
          <div className="rounded-2xl bg-white p-3 shadow-xl border border-gray-100">
            <img
              src={hover.beast.images.ultimate}
              alt={hover.beast.name}
              className="h-32 w-32 object-contain"
            />
            <p className="mt-1 text-center text-sm font-semibold text-text-primary">{hover.beast.name}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Honors
