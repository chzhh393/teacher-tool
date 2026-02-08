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

  // 2. 子账号不能删除班级
  if (user.role === "sub") {
    throw new Error("子账号无权删除班级")
  }

  if (!event.classId) {
    throw new Error("classId 为必填")
  }

  // 3. 验证班级所有权
  const classResult = await db.collection("TT_classes").doc(event.classId).get()
  const classDoc = classResult.data?.[0]
  if (!classDoc) {
    throw new Error("未找到班级")
  }
  const classRaw = classDoc.data || classDoc
  if (classRaw.userId !== user.userId) {
    throw new Error("无权删除该班级")
  }

  // 4. 删除班级
  await db.collection("TT_classes").doc(event.classId).remove()

  return { ok: true }
}
