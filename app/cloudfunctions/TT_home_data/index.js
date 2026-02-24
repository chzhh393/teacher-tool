const tcb = require("tcb-admin-node")

const DEFAULT_THRESHOLDS = [0, 5, 12, 22, 35, 50, 70, 95, 125, 160]

const verifyToken = async (db, token) => {
  if (!token) return null
  const _ = db.command
  const result = await db
    .collection("TT_sessions")
    .where(_.or([{ token }, { "data.token": token }]))
    .limit(1)
    .get()
  const session = (result.data || [])[0]
  if (!session) return null
  const raw = session.data || session
  if (new Date(raw.expiredAt) < new Date()) return null
  return {
    userId: raw.userId,
    username: raw.username,
    role: raw.role || "main",
    nickname: raw.nickname || raw.username,
    authorizedClassIds: raw.authorizedClassIds || [],
  }
}

const canAccessClass = (user, classRaw) => {
  if (user.role === "sub") {
    return (user.authorizedClassIds || []).includes(classRaw._id)
  }
  return classRaw.userId === user.userId
}

const getClassInfo = async (db, classId, user) => {
  if (classId) {
    const classDoc = await db.collection("TT_classes").doc(classId).get()
    const classRow = classDoc.data?.[0]
    const raw = classRow?.data || classRow
    if (!raw) return null
    if (!canAccessClass(user, { ...raw, _id: classId })) return null
    return { id: classId, raw }
  }

  if (user.role === "sub") {
    const fallbackId = user.authorizedClassIds.length > 0 ? user.authorizedClassIds[0] : null
    if (!fallbackId) return null
    const classDoc = await db.collection("TT_classes").doc(fallbackId).get()
    const classRow = classDoc.data?.[0]
    const raw = classRow?.data || classRow
    if (!raw) return null
    if (!canAccessClass(user, { ...raw, _id: fallbackId })) return null
    return { id: fallbackId, raw }
  }

  const _ = db.command
  const classResult = await db
    .collection("TT_classes")
    .where(_.or([{ userId: user.userId }, { "data.userId": user.userId }]))
    .limit(1)
    .get()
  const first = classResult.data?.[0]
  if (!first) return null
  const raw = first.data || first
  const id = raw._id || first._id
  return id ? { id, raw } : null
}

exports.main = async (event = {}) => {
  const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
  const db = app.database()
  const _ = db.command

  // 1. 验证 token
  const user = await verifyToken(db, event.token)
  if (!user) {
    return { classSummary: null, students: [] }
  }

  // 2. 获取并验证班级
  const classInfo = await getClassInfo(db, event.classId, user)
  if (!classInfo) {
    return { classSummary: null, students: [] }
  }

  const classId = classInfo.id
  const className = classInfo.raw.name || "班级"

  // 3. 查询学生（单次查询，同时用于摘要聚合和列表返回）
  const studentsResult = await db
    .collection("TT_students")
    .where(_.or([{ classId }, { "data.classId": classId }]))
    .limit(1000)
    .get()

  const students = (studentsResult.data || []).map((item) => {
    const raw = item.data || item
    return { ...raw, id: raw.id || item._id || "" }
  })

  // 4. 聚合班级摘要
  const studentCount = students.length
  const totalBadges = students.reduce((sum, s) => sum + (s.badges || 0), 0)
  const totalScore = students.reduce((sum, s) => sum + (s.totalScore || 0), 0)
  const totalLevel = students.reduce((sum, s) => sum + (s.level || 1), 0)
  const averageLevel = studentCount ? +(totalLevel / studentCount).toFixed(1) : 0

  // 5. 查询设置（内联，省去独立的 settingsGet 调用）
  const settingsId = `settings-${classId}`
  const settingsResult = await db.collection("TT_settings").doc(settingsId).get()
  const settingsRow = settingsResult.data?.[0]
  const settings = settingsRow ? (settingsRow.data || settingsRow) : null

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
    students: students.sort((a, b) => (a.order || 0) - (b.order || 0)),
    settings,
  }
}
