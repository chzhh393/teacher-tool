import { updates } from "../data/updates"

const tagStyle = (tag: string) => {
  switch (tag) {
    case "功能":
      return "bg-primary/10 text-primary"
    case "体验":
      return "bg-blue-50 text-blue-700"
    case "修复":
      return "bg-green-50 text-green-700"
    case "优化":
      return "bg-orange-50 text-orange-700"
    case "内容":
      return "bg-amber-50 text-amber-700"
    case "公告":
      return "bg-gray-100 text-gray-700"
    default:
      return "bg-gray-100 text-gray-700"
  }
}

const Updates = () => {
  const sortedUpdates = [...updates].sort((a, b) => b.date.localeCompare(a.date))
  const latestDate = sortedUpdates[0]?.date

  return (
    <div className="space-y-6">
      <div className="card p-6 border border-gray-100">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-text-primary">更新日志</h2>
            <p className="mt-2 text-sm text-text-secondary">
              记录每一次功能迭代、体验优化与问题修复。
            </p>
          </div>
          <div className="rounded-xl border border-orange-100 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700">
            最近更新：{latestDate || "暂无"}
          </div>
        </div>
      </div>

      <div className="card p-6 border border-gray-100">
        {sortedUpdates.length ? (
          <div className="space-y-5">
            {sortedUpdates.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-text-tertiary">
                      <span>{item.date}</span>
                      {item.version && (
                        <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-text-secondary">
                          {item.version}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-1 text-lg font-semibold text-text-primary">{item.title}</h3>
                    <p className="mt-1 text-sm text-text-secondary">{item.summary}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.tags.map((tag) => (
                      <span
                        key={`${item.id}-${tag}`}
                        className={`rounded-full px-2 py-1 text-[11px] font-semibold ${tagStyle(tag)}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {item.highlights && item.highlights.length > 0 && (
                  <ul className="mt-3 grid gap-2 text-sm text-text-secondary">
                    {item.highlights.map((highlight, index) => (
                      <li key={`${item.id}-highlight-${index}`} className="flex items-start gap-2">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center">
            <p className="text-sm font-semibold text-text-secondary">暂无更新</p>
            <p className="mt-2 text-xs text-text-tertiary">
              我们会在这里持续记录产品迭代内容。
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Updates
