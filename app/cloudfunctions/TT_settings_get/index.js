const tcb = require("tcb-admin-node")

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
    authorizedClassIds: raw.authorizedClassIds || [],
  }
}

exports.main = async (event = {}) => {
  const { classId, token } = event
  const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
  const db = app.database()

  const user = await verifyToken(db, token)
  if (!user) {
    return { settings: null }
  }

  if (!classId) {
    return { settings: null }
  }

  // 验证班级访问权限（主账号校验所有权，子账号校验授权列表）
  const classResult = await db.collection("TT_classes").doc(classId).get()
  const classData = (classResult.data || [])[0]
  if (!classData) {
    return { settings: null }
  }
  const classRaw = classData.data || classData
  if (user.role === "sub") {
    if (!(user.authorizedClassIds || []).includes(classId)) {
      return { settings: null }
    }
  } else if (classRaw.userId && classRaw.userId !== user.userId) {
    return { settings: null }
  }

  const settingsId = `settings-${classId}`
  const result = await db.collection("TT_settings").doc(settingsId).get()
  const row = result.data?.[0]
  const settings = row ? row.data || row : null

  return { settings }
}
