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
  return { userId: raw.userId, username: raw.username }
}

exports.main = async (event = {}) => {
  const { token } = event
  const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
  const db = app.database()

  const user = await verifyToken(db, token)
  if (!user) {
    return { classes: [] }
  }

  const _ = db.command
  const result = await db.collection("TT_classes").where(_.or([
    { userId: user.userId },
    { "data.userId": user.userId },
  ])).limit(1000).get()
  const classes = (result.data || [])
    .map((item) => {
      const raw = item.data || item
      return {
        id: raw._id || item._id,
        name: raw.name || item.name,
        settingsId: raw.settingsId || item.settingsId,
        createdAt: raw.createdAt || item.createdAt,
        userId: raw.userId || item.userId,
      }
    })
    .sort((a, b) => {
      const left = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const right = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return left - right
    })
    .map((item) => ({
      id: item.id,
      name: item.name,
      settingsId: item.settingsId,
    }))

  return { classes }
}
