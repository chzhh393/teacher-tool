import { useState } from "react"

import { beasts, type Beast, type EvolutionStage } from "../../data/beasts"

const STAGES: { key: EvolutionStage; label: string }[] = [
  { key: "egg", label: "蛋" },
  { key: "baby", label: "幼年" },
  { key: "juvenile", label: "少年" },
  { key: "adult", label: "成年" },
  { key: "ultimate", label: "究极" },
]

const SERIES_MAP = {
  dreamy: { label: "梦幻系", color: "bg-pink-100 text-pink-700" },
  "hot-blooded": { label: "热血系", color: "bg-red-100 text-red-700" },
}

const BeastAdmin = () => {
  const [seriesFilter, setSeriesFilter] = useState<"" | "dreamy" | "hot-blooded">("")
  const [search, setSearch] = useState("")

  const filteredBeasts = beasts.filter((beast) => {
    if (seriesFilter && beast.series !== seriesFilter) return false
    if (search) {
      const keyword = search.toLowerCase()
      return (
        beast.name.toLowerCase().includes(keyword) ||
        beast.englishName.toLowerCase().includes(keyword) ||
        beast.id.toLowerCase().includes(keyword)
      )
    }
    return true
  })

  const dreamyCount = beasts.filter((b) => b.series === "dreamy").length
  const hotBloodedCount = beasts.filter((b) => b.series === "hot-blooded").length

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">🐉 幻兽图鉴管理</h2>
          <p className="mt-1 text-sm text-text-secondary">
            查看所有幻兽的5个进化形态 · 共 {beasts.length} 只幻兽
          </p>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-xs text-text-secondary">总幻兽数</p>
          <p className="mt-2 text-2xl font-bold text-text-primary">{beasts.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-text-secondary">梦幻系</p>
          <p className="mt-2 text-2xl font-bold text-pink-600">{dreamyCount}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-text-secondary">热血系</p>
          <p className="mt-2 text-2xl font-bold text-red-600">{hotBloodedCount}</p>
        </div>
      </section>

      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-4">
          <h3 className="text-lg font-semibold text-text-primary">幻兽列表</h3>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索幻兽名称"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <select
              value={seriesFilter}
              onChange={(e) => setSeriesFilter(e.target.value as typeof seriesFilter)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-text-secondary"
            >
              <option value="">全部系列</option>
              <option value="dreamy">梦幻系</option>
              <option value="hot-blooded">热血系</option>
            </select>
          </div>
        </div>

        <div className="p-6">
          <p className="mb-4 text-sm text-text-tertiary">
            显示 {filteredBeasts.length} 只幻兽
          </p>

          <div className="space-y-6">
            {filteredBeasts.map((beast) => (
              <BeastCard key={beast.id} beast={beast} />
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

const BeastCard = ({ beast }: { beast: Beast }) => {
  const seriesInfo = SERIES_MAP[beast.series]

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <h4 className="text-lg font-bold text-text-primary">{beast.name}</h4>
        <span className="text-sm text-text-tertiary">{beast.englishName}</span>
        <span className={`rounded px-2 py-0.5 text-xs font-semibold ${seriesInfo.color}`}>
          {seriesInfo.label}
        </span>
        <span className="text-xs text-text-tertiary">ID: {beast.id}</span>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {STAGES.map((stage) => (
          <div key={stage.key} className="text-center">
            <div className="mb-2 aspect-square overflow-hidden rounded-lg bg-gray-50">
              <img
                src={beast.images[stage.key]}
                alt={`${beast.name} - ${stage.label}`}
                className="h-full w-full object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = "none"
                  target.parentElement!.innerHTML = `<div class="flex h-full items-center justify-center text-xs text-red-400">缺失</div>`
                }}
              />
            </div>
            <p className="text-xs font-medium text-text-secondary">{stage.label}</p>
            <p className="mt-0.5 truncate text-[10px] text-text-tertiary" title={beast.images[stage.key]}>
              {beast.images[stage.key].split("/").pop()}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default BeastAdmin
