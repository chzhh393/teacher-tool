const tcb = require("tcb-admin-node")

const verifyToken = async (db, token) => {
  if (!token) return null
  // 尝试根级别查询
  let result = await db.collection("TT_sessions").where({ token }).get()
  let session = (result.data || [])[0]
  // 如果没找到，尝试嵌套查询
  if (!session) {
    result = await db.collection("TT_sessions").where({ "data.token": token }).get()
    session = (result.data || [])[0]
  }
  if (!session) return null
  const raw = session.data || session
  if (new Date(raw.expiredAt) < new Date()) return null
  return {
    userId: raw.userId,
    username: raw.username,
    role: raw.role || "main",
    authorizedClassIds: raw.authorizedClassIds || [],
  }
}

const getClassId = async (db, classId, user) => {
  if (classId) {
    const classDoc = await db.collection("TT_classes").doc(classId).get()
    const classRow = classDoc.data?.[0]
    const raw = classRow?.data || classRow
    if (!raw) return null
    if (user.role === "sub") {
      if (!(user.authorizedClassIds || []).includes(classId)) return null
    } else if (raw.userId && raw.userId !== user.userId) {
      return null
    }
    return classId
  }

  if (user.role === "sub") {
    return user.authorizedClassIds.length > 0 ? user.authorizedClassIds[0] : null
  }
  const classResult = await db.collection("TT_classes").where({ userId: user.userId }).limit(1).get()
  const first = classResult.data?.[0]
  return first ? first._id : null
}

exports.main = async (event = {}) => {
  const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
  const db = app.database()

  const user = await verifyToken(db, event.token)
  if (!user) {
    return { students: [] }
  }

  const classId = await getClassId(db, event.classId, user)
  if (!classId) {
    return { students: [] }
  }

  const result = await db.collection("TT_students").where({ "data.classId": classId }).limit(1000).get()
  const students = (result.data || [])
    .map((item) => item.data || item)
    .map((item) => ({
      ...item,
      id: item.id || item._id || "",
    }))
    .sort((a, b) => (a.order || 0) - (b.order || 0))

  return { students }
}
