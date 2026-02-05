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
  const { classId, settings, token } = event
  if (!classId || !settings) {
    throw new Error("classId 与 settings 为必填")
  }

  const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
  const db = app.database()
  const now = new Date()

  // 验证用户身份
  const user = await verifyToken(db, token)
  if (!user) {
    throw new Error("未登录或登录已过期")
  }

  // 验证班级所有权
  const classResult = await db.collection("TT_classes").doc(classId).get()
  const classData = (classResult.data || [])[0]
  if (!classData) {
    throw new Error("班级不存在")
  }
  const classRaw = classData.data || classData
  if (classRaw.userId && classRaw.userId !== user.userId) {
    throw new Error("无权修改此班级的设置")
  }

  const settingsId = `settings-${classId}`
  await db.collection("TT_settings").doc(settingsId).set({
    data: {
      _id: settingsId,
      classId,
      ...settings,
      updatedAt: now,
      createdAt: settings.createdAt || now,
    },
  })

  await db.collection("TT_classes").doc(classId).update({
    data: {
      settingsId,
      updatedAt: now,
    },
  })

  return { ok: true }
}
