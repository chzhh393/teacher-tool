import { useMemo, useState } from "react"

import { beasts } from "../data/beasts"
import type { Beast } from "../data/beasts"
import Modal from "./Modal"

interface BeastPickerModalProps {
  open: boolean
  onClose: () => void
  onSelect: (beast: Beast) => void
}

const BeastPickerModal = ({ open, onClose, onSelect }: BeastPickerModalProps) => {
  const [series, setSeries] = useState<"dreamy" | "hot-blooded" | "all">("all")
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

      <div className="mt-6 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 max-h-[70vh] overflow-y-auto p-1">
        {filtered.map((beast) => (
          <button
            type="button"
            key={beast.id}
            onClick={() => onSelect(beast)}
            className="card group p-3 text-left border border-transparent hover:border-primary/30"
          >
            <div className="aspect-square rounded-xl bg-gray-50 p-2 mb-2 flex items-center justify-center">
              <img
                src={beast.images.egg}
                alt={beast.name}
                className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-110 drop-shadow-sm"
              />
            </div>
            <h4 className="text-sm font-semibold text-text-primary">{beast.name}</h4>
            <p className="text-xs text-text-secondary">{beast.englishName}</p>
          </button>
        ))}
      </div>
    </Modal>
  )
}

export default BeastPickerModal
