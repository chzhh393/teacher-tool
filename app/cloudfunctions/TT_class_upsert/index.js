const tcb = require("tcb-admin-node")

const verifyToken = async (db, token) => {
  if (!token) return null
  let result = await db.collection("TT_sessions").where({ token }).get()
  let session = (result.data || [])[0]
  if (!session) {
    result = await db.collection("TT_sessions").where({ "data.token": token }).get()
    session = (result.data || [])[0]
  }
  if (!session) return null
  const raw = session.data || session
  if (new Date(raw.expiredAt) < new Date()) return null
  return { userId: raw.userId, username: raw.username }
}

exports.main = async (event = {}) => {
  const { classInfo, token } = event
  if (!classInfo || !classInfo.id || !classInfo.name) {
    throw new Error("classInfo.id 与 classInfo.name 为必填")
  }

  const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
  const db = app.database()
  const now = new Date()

  const user = await verifyToken(db, token)
  if (!user) {
    throw new Error("未登录或登录已过期")
  }

  // 检查是否是更新已有班级（验证所有权）
  const existResult = await db.collection("TT_classes").doc(classInfo.id).get()
  const existClass = (existResult.data || [])[0]
  if (existClass) {
    const raw = existClass.data || existClass
    if (raw.userId && raw.userId !== user.userId) {
      throw new Error("无权修改此班级")
    }
  }

  await db.collection("TT_classes").doc(classInfo.id).set({
    data: {
      _id: classInfo.id,
      name: classInfo.name,
      userId: user.userId,
      settingsId: classInfo.settingsId || `settings-${classInfo.id}`,
      updatedAt: now,
      createdAt: classInfo.createdAt || now,
    },
  })

  return {
    classInfo: {
      id: classInfo.id,
      name: classInfo.name,
      settingsId: classInfo.settingsId || `settings-${classInfo.id}`,
    },
  }
}
