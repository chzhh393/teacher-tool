import { useMemo, useState } from "react"

import type { ScoreRule } from "../types"
import Modal from "./Modal"

interface ScoreModalProps {
  open: boolean
  onClose: () => void
  rules: ScoreRule[]
  onSubmit: (rule: ScoreRule) => void
  mode?: "add" | "subtract"
}

const ScoreModal = ({ open, onClose, rules, onSubmit, mode = "add" }: ScoreModalProps) => {
  const [tab, setTab] = useState<"add" | "subtract">(mode)

  const filtered = useMemo(
    () => rules.filter((rule) => (tab === "add" ? rule.score > 0 : rule.score < 0)),
    [rules, tab]
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={tab === "add" ? "加分喂养" : "扣分提醒"}
      description="选择一项积分规则进行操作"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="btn-default"
        >
          取消
        </button>
      }
    >
      <div className="flex gap-3 bg-gray-100 p-1 rounded-xl w-full md:w-fit">
        {[
          { key: "add", label: "加分" },
          { key: "subtract", label: "扣分" },
        ].map((item) => (
          <button
            type="button"
            key={item.key}
            onClick={() => setTab(item.key as "add" | "subtract")}
            className={`flex-1 rounded-lg px-4 py-1.5 text-sm font-semibold transition-all md:flex-none ${tab === item.key
                ? "bg-white text-primary shadow-sm"
                : "text-text-secondary hover:text-text-primary"
              }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto p-1 md:mt-6 md:gap-3 md:max-h-[60vh] lg:grid-cols-3">
        {filtered.map((rule) => (
          <button
            type="button"
            key={rule.id}
            onClick={() => onSubmit(rule)}
            className="flex items-center gap-1.5 card px-2 py-2 text-left border border-transparent hover:border-primary/30 min-h-[44px] md:gap-3 md:px-4 md:py-3 md:min-h-[52px]"
          >
            <span className="text-lg shrink-0 md:text-2xl">{rule.icon}</span>
            <span className="text-xs font-semibold text-text-primary truncate md:text-sm">{rule.name}</span>
            <span className={`text-[10px] font-semibold shrink-0 ml-auto md:text-xs ${rule.score > 0 ? "text-success" : "text-danger"}`}>
              {rule.score > 0 ? `+${rule.score}` : rule.score}
            </span>
          </button>
        ))}
      </div>
    </Modal>
  )
}

export default ScoreModal
