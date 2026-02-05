const tcb = require("tcb-admin-node")

const DEFAULT_THRESHOLDS = [0, 5, 12, 22, 35, 50, 70, 95, 125, 160]

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
  return { userId: raw.userId, username: raw.username }
}

const getClassId = async (db, classId, userId) => {
  if (classId) {
    // 验证该班级是否属于当前用户
    const classDoc = await db.collection("TT_classes").doc(classId).get()
    const classRow = classDoc.data?.[0]
    const raw = classRow?.data || classRow
    if (raw?.userId && raw.userId !== userId) {
      return null // 无权访问
    }
    return classId
  }

  // 获取当前用户的第一个班级
  const classResult = await db.collection("TT_classes").where({ userId }).limit(1).get()
  const first = classResult.data?.[0]
  return first ? first._id : null
}

exports.main = async (event = {}) => {
  const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
  const db = app.database()

  const user = await verifyToken(db, event.token)
  if (!user) {
    return {
      classSummary: null,
    }
  }

  const classId = await getClassId(db, event.classId, user.userId)
  if (!classId) {
    return {
      classSummary: null,
    }
  }

  const classDoc = await db.collection("TT_classes").doc(classId).get()
  const classRow = classDoc.data?.[0]
  const className = classRow?.name || classRow?.data?.name || "班级"

  const studentsResult = await db.collection("TT_students").get()
  const students = (studentsResult.data || [])
    .map((item) => item.data || item)
    .filter((item) => item.classId === classId)
  const studentCount = students.length
  const totalBadges = students.reduce((sum, item) => sum + (item.badges || 0), 0)
  const totalScore = students.reduce((sum, item) => sum + (item.totalScore || 0), 0)
  const totalLevel = students.reduce((sum, item) => sum + (item.level || 1), 0)
  const averageLevel = studentCount ? +(totalLevel / studentCount).toFixed(1) : 0

  return {
    classSummary: {
      id: classId,
      name: className,
      studentCount,
      totalBadges,
      averageLevel,
      totalScore,
      thresholds: DEFAULT_THRESHOLDS,
    },
  }
}
