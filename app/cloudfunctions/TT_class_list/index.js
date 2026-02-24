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
    nickname: raw.nickname || raw.username,
    authorizedClassIds: raw.authorizedClassIds || [],
  }
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
  // 子账号：查询授权的班级；主账号：查询自己的班级
  const whereCondition = user.role === "sub"
    ? { _id: _.in(user.authorizedClassIds.length > 0 ? user.authorizedClassIds : ["__none__"]) }
    : _.or([{ userId: user.userId }, { "data.userId": user.userId }])
  const result = await db.collection("TT_classes").where(whereCondition).limit(1000).get()
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
