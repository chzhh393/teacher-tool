const tcb = require("tcb-admin-node")

// 验证 token 并返回用户信息
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

exports.main = async (event = {}) => {
  const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
  const db = app.database()

  // 1. 验证 token
  const user = await verifyToken(db, event.token)
  if (!user) {
    throw new Error("未登录或登录已过期")
  }

  // 2. 子账号不能删除学生
  if (user.role === "sub") {
    throw new Error("子账号无权删除学生")
  }

  if (!event.studentId) {
    throw new Error("studentId 为必填")
  }

  // 3. 验证学生所属班级的所有权
  const studentResult = await db.collection("TT_students").doc(event.studentId).get()
  const studentDoc = studentResult.data?.[0]
  if (!studentDoc) {
    throw new Error("未找到学生")
  }
  const student = studentDoc.data || studentDoc

  const classResult = await db.collection("TT_classes").doc(student.classId).get()
  const classDoc = classResult.data?.[0]
  if (!classDoc) {
    throw new Error("未找到学生所属班级")
  }
  const classRaw = classDoc.data || classDoc
  if (classRaw.userId !== user.userId) {
    throw new Error("无权删除该学生")
  }

  // 4. 归档学生记录
  const raw = studentDoc.data && typeof studentDoc.data === "object" ? studentDoc.data : studentDoc
  const addResult = await db.collection("TT_archive").add({
    archiveReason: "student_deleted",
    archivedAt: new Date(),
    archivedBy: user.userId,
    classId: student.classId,
    student: { ...raw, _originalId: studentDoc._id },
  })
  if (!addResult.id) {
    throw new Error("归档写入失败，删除操作已中止")
  }

  // 5. 物理删除学生
  await db.collection("TT_students").doc(event.studentId).remove()

  return { ok: true }
}
