const tcb = require("tcb-admin-node")

const getClassId = async (db, classId) => {
  if (classId) {
    return classId
  }

  const classResult = await db.collection("TT_classes").limit(1).get()
  const first = classResult.data?.[0]
  return first ? first._id : null
}

const formatDate = (date) => {
  if (!date) return ""
  // 处理 {$date: timestamp} 格式
  if (date.$date) {
    return new Date(date.$date).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })
  }
  if (date instanceof Date) {
    return date.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })
  }
  if (typeof date === "number") {
    return new Date(date).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })
  }
  if (typeof date === "string") {
    const parsed = Date.parse(date)
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })
    }
  }
  return String(date)
}

exports.main = async (event = {}) => {
  const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
  const db = app.database()

  const classId = await getClassId(db, event.classId)
  if (!classId) {
    return { records: [], total: 0 }
  }

  const page = Number(event.page || 1)
  const pageSize = Number(event.pageSize || 20)
  const skip = (page - 1) * pageSize

  // 获取所有记录然后过滤（因为数据可能在 data 嵌套中）
  const allRecordsResult = await db.collection("TT_score_records").get()
  const allRecords = (allRecordsResult.data || [])
    .map((item) => {
      const raw = item.data || item
      return {
        ...raw,
        id: raw.id || item._id,
        _id: item._id,
        createdAt: formatDate(raw.createdAt),
      }
    })
    .filter((item) => item.classId === classId)
    .sort((a, b) => {
      // 按创建时间倒序
      const timeA = a.createdAt || ""
      const timeB = b.createdAt || ""
      return timeB.localeCompare(timeA)
    })

  const total = allRecords.length
  const records = allRecords.slice(skip, skip + pageSize)

  return {
    records,
    total,
  }
}
