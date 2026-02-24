const tcb = require("tcb-admin-node")

const generateId = () => `stu-${Date.now()}-${Math.floor(Math.random() * 10000)}`

// 验证 token 并返回用户信息
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
  if (raw.expiredAt && new Date(raw.expiredAt).getTime() < Date.now()) return null
  return {
    userId: raw.userId,
    username: raw.username,
    role: raw.role || "main",
    nickname: raw.nickname || raw.username,
    authorizedClassIds: raw.authorizedClassIds || [],
  }
}

exports.main = async (event = {}) => {
  const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
  const db = app.database()
  const _ = db.command

  // 1. 验证 token
  const user = await verifyToken(db, event.token)
  if (!user) {
    throw new Error("未登录或登录已过期")
  }

  // 2. 子账号不能编辑学生
  if (user.role === "sub") {
    throw new Error("子账号无权编辑学生")
  }

  const student = event.student
  if (!student || !student.classId || !student.name) {
    throw new Error("student.classId 与 student.name 为必填")
  }

  // 3. 验证班级所有权
  const classResult = await db.collection("TT_classes").doc(student.classId).get()
  const classDoc = classResult.data?.[0]
  if (!classDoc) {
    throw new Error("未找到班级")
  }
  const classRaw = classDoc.data || classDoc
  if (classRaw.userId !== user.userId) {
    throw new Error("无权编辑该班级的学生")
  }

  // 4. 创建或更新学生
  const now = new Date()
  const studentId = student._id || student.id || generateId()

  // 读取已有记录，保留原始 createdAt（避免编辑时覆盖创建时间）
  let existingCreatedAt = null
  let isNewStudent = true
  try {
    const existing = await db.collection("TT_students").doc(studentId).get()
    const existingDoc = (existing.data || [])[0]
    if (existingDoc) {
      const raw = existingDoc.data || existingDoc
      existingCreatedAt = raw.createdAt
      isNewStudent = false
    }
  } catch (e) { /* 新学生，无已有记录 */ }

  // 5. 新学生时检查班级人数上限（100人）
  if (isNewStudent) {
    const MAX_STUDENTS_PER_CLASS = 100
    const countResult = await db.collection("TT_students").where(
      _.or([{ classId: student.classId }, { "data.classId": student.classId }])
    ).count()
    const currentCount = countResult.total || 0
    if (currentCount >= MAX_STUDENTS_PER_CLASS) {
      throw new Error(`该班级学生已达上限（${MAX_STUDENTS_PER_CLASS}人），无法继续添加`)
    }
  }

  const data = {
    ...student,
    _id: studentId,
    level: student.level || 1,
    totalScore: student.totalScore || 0,
    availableScore: student.availableScore || 0,
    badges: student.badges || 0,
    progress: student.progress || 0,
    updatedAt: now,
    createdAt: existingCreatedAt || student.createdAt || now,
  }

  await db.collection("TT_students").doc(studentId).set({ data })

  return { student: data }
}
