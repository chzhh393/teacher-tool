const tcb = require("tcb-admin-node")

const verifyToken = async (db, token) => {
  if (!token) return null
  let result = await db.collection("TT_sessions").where({ token }).limit(1).get()
  let session = (result.data || [])[0]
  if (!session) {
    result = await db.collection("TT_sessions").where({ "data.token": token }).limit(1).get()
    session = (result.data || [])[0]
  }
  if (!session) return null
  const raw = session.data || session
  if (raw.expiredAt && new Date(raw.expiredAt).getTime() < Date.now()) return null
  return {
    userId: raw.userId,
    username: raw.username,
    role: raw.role || "main",
    nickname: raw.nickname || raw.username,
    authorizedClassIds: raw.authorizedClassIds || [],
  }
}

const verifyClassAccess = async (db, classId, user) => {
  if (user.role === "sub") {
    return (user.authorizedClassIds || []).includes(classId)
  }
  // 主账号验证班级所有权
  const classDoc = await db.collection("TT_classes").doc(classId).get()
  const classRow = classDoc.data?.[0]
  const raw = classRow?.data || classRow
  return raw && raw.userId === user.userId
}

const getClassId = async (db, classId, user) => {
  if (classId) {
    const hasAccess = await verifyClassAccess(db, classId, user)
    if (!hasAccess) {
      throw new Error("未授权：无权访问该班级")
    }
    return classId
  }

  // 如果没有指定classId，尝试获取用户的第一个可访问班级
  if (user.role === "sub") {
    // 子账号返回第一个授权的班级
    return (user.authorizedClassIds || [])[0] || null
  }

  // 主账号返回第一个自己的班级
  const classResult = await db.collection("TT_classes").where({ "data.userId": user.userId }).limit(1).get()
  const first = classResult.data?.[0]
  return first ? first._id : null
}

const formatDate = (date) => {
  if (!date) return ""
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
  const { token } = event

  const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
  const db = app.database()

  // 1. 验证token
  const user = await verifyToken(db, token)
  if (!user) {
    throw new Error("未授权：无效的token")
  }

  // 2. 获取并验证classId
  const classId = await getClassId(db, event.classId, user)
  if (!classId) {
    return { records: [], total: 0 }
  }

  const page = Number(event.page || 1)
  const pageSize = Number(event.pageSize || 20)
  const skip = (page - 1) * pageSize

  const allRecordsResult = await db.collection("TT_redeem_records").where({ "data.classId": classId }).limit(1000).get()
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
    .sort((a, b) => {
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
