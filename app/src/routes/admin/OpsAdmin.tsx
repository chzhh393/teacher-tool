import { Fragment, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { CloudApi } from "../../services/cloudApi"

interface OpsClassInfo {
  id: string
  name: string
  studentCount: number
  createdAt: string | null
}

interface OpsUserInfo {
  userId: string
  username: string
  activated: boolean
  createdAt: string | null
  activatedAt: string | null
  classCount: number
  totalStudents: number
  classes: OpsClassInfo[]
}

interface OpsStats {
  totalUsers: number
  activatedUsers: number
  totalClasses: number
  totalStudents: number
}

const formatDate = (value: string | null) => {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "-"
  return `${d.toLocaleDateString("zh-CN")} ${d.toLocaleTimeString("zh-CN")}`
}

const OpsAdmin = () => {
  const navigate = useNavigate()
  const [stats, setStats] = useState<OpsStats>({
    totalUsers: 0,
    activatedUsers: 0,
    totalClasses: 0,
    totalStudents: 0,
  })
  const [users, setUsers] = useState<OpsUserInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")

  const fetchData = async () => {
    setLoading(true)
    try {
      const data = await CloudApi.opsOverview()
      setStats(data.stats)
      setUsers(data.users)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (import.meta.env.PROD) {
      navigate("/", { replace: true })
      return
    }
    fetchData()
  }, [])

  const toggleExpand = (userId: string) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users
    const keyword = search.trim().toLowerCase()
    return users.filter((u) => u.username.toLowerCase().includes(keyword))
  }, [users, search])

  const statCards = [
    { label: "注册用户数", value: stats.totalUsers, color: "text-indigo-700" },
    { label: "已激活用户", value: stats.activatedUsers, color: "text-green-700" },
    { label: "总班级数", value: stats.totalClasses, color: "text-blue-700" },
    { label: "总学生数", value: stats.totalStudents, color: "text-amber-700" },
  ]

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">运营数据总览</h2>
          <p className="mt-1 text-sm text-text-secondary">
            查看用户注册、班级与学生概况
          </p>
        </div>
        <button
          type="button"
          className="btn-default text-sm"
          onClick={fetchData}
          disabled={loading}
        >
          {loading ? "加载中..." : "刷新数据"}
        </button>
      </header>

      {/* 统计卡片 */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((item) => (
          <div key={item.label} className="card p-5">
            <p className="text-xs text-text-secondary">{item.label}</p>
            <p className={`mt-2 text-2xl font-bold ${item.color}`}>
              {item.value}
            </p>
          </div>
        ))}
      </section>

      {/* 用户列表 */}
      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-4">
          <h3 className="text-lg font-semibold text-text-primary">用户列表</h3>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索用户名..."
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-text-tertiary">
              <tr>
                <th className="px-6 py-3">用户名</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">注册时间</th>
                <th className="px-4 py-3 text-center">班级数</th>
                <th className="px-4 py-3 text-center">学生数</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-text-secondary">
                    加载中...
                  </td>
                </tr>
              ) : !filteredUsers.length ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-text-secondary">
                    暂无数据
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <Fragment key={user.userId}>
                    {/* 用户行 */}
                    <tr className="border-t border-gray-100 hover:bg-orange-50/30">
                      <td className="px-6 py-3 font-medium text-text-primary">
                        {user.username}
                      </td>
                      <td className="px-4 py-3">
                        {user.activated ? (
                          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                            已激活
                          </span>
                        ) : (
                          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-500">
                            未激活
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                          {user.classCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                          {user.totalStudents}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {user.classCount > 0 && (
                          <button
                            type="button"
                            className="rounded-lg bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/20"
                            onClick={() => toggleExpand(user.userId)}
                          >
                            {expandedUsers.has(user.userId) ? "收起" : "展开班级"}
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* 展开的班级行 */}
                    {expandedUsers.has(user.userId) &&
                      user.classes.map((cls) => (
                        <tr key={cls.id} className="bg-gray-50/60">
                          <td className="py-2.5 pl-12 pr-4 text-text-secondary" colSpan={2}>
                            {cls.name}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-text-tertiary">
                            {formatDate(cls.createdAt)}
                          </td>
                          <td className="px-4 py-2.5 text-center text-xs text-text-secondary" colSpan={3}>
                            {cls.studentCount} 名学生
                          </td>
                        </tr>
                      ))}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-gray-100 px-6 py-3 text-xs text-text-tertiary">
          共 {filteredUsers.length} 名用户
        </div>
      </section>
    </div>
  )
}

export default OpsAdmin
