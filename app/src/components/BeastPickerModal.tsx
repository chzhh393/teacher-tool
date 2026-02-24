import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { beasts } from "../data/beasts"
import type { Beast } from "../data/beasts"
import Modal from "./Modal"

interface BeastPickerModalProps {
  open: boolean
  onClose: () => void
  onSelect: (beast: Beast) => void
  collectedBeasts?: string[]
}

const BeastPickerModal = ({ open, onClose, onSelect, collectedBeasts = [] }: BeastPickerModalProps) => {
  const [series, setSeries] = useState<"dreamy" | "hot-blooded" | "cosmic" | "mythology" | "all">("all")
  const [showFade, setShowFade] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setShowFade(el.scrollHeight - el.scrollTop - el.clientHeight > 20)
  }, [])

  // 弹窗打开或筛选切换后重新检测
  useEffect(() => {
    if (!open) return
    // 等 DOM 渲染完成
    requestAnimationFrame(checkScroll)
  }, [open, series, checkScroll])

  const filtered = useMemo(() => {
    if (series === "all") return beasts
    return beasts.filter((item) => item.series === series)
  }, [series])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="领养幻兽"
      description="可按系列筛选，确认后将绑定给学生。"
    >
      <div className="flex flex-wrap gap-2 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { key: "all", label: "全部" },
          { key: "dreamy", label: "梦幻系" },
          { key: "hot-blooded", label: "热血系" },
          { key: "cosmic", label: "星辰系" },
          { key: "mythology", label: "山海系" },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setSeries(item.key as typeof series)}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-all ${series === item.key
                ? "bg-white text-primary shadow-sm"
                : "text-text-secondary hover:text-text-primary"
              }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="relative mt-6">
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 max-h-[70vh] overflow-y-auto p-1"
        >
          {filtered.map((beast) => {
            const isCollected = collectedBeasts.includes(beast.id)
            return (
              <button
                type="button"
                key={beast.id}
                onClick={() => !isCollected && onSelect(beast)}
                disabled={isCollected}
                className={`card group p-3 text-left border border-transparent ${isCollected ? "opacity-50 cursor-not-allowed" : "hover:border-primary/30"}`}
              >
                <div className="relative aspect-square rounded-xl bg-gray-50 p-2 mb-2 flex items-center justify-center">
                  <img
                    src={beast.images.egg}
                    alt={beast.name}
                    className={`h-full w-full object-contain drop-shadow-sm ${isCollected ? "grayscale" : "transition-transform duration-300 group-hover:scale-110"}`}
                  />
                  {isCollected && (
                    <span className="absolute top-1 right-1 bg-gray-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">已收集</span>
                  )}
                </div>
                <h4 className="text-sm font-semibold text-text-primary">{beast.name}</h4>
                <p className="text-xs text-text-secondary">{beast.englishName}</p>
              </button>
            )
          })}
        </div>
        <div
          className={`pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent rounded-b-2xl transition-opacity duration-300 ${showFade ? "opacity-100" : "opacity-0"}`}
        />
      </div>
    </Modal>
  )
}

export default BeastPickerModal
