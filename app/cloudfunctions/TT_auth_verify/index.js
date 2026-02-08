const tcb = require("tcb-admin-node")

const unwrap = (row) => (row?.data ? row.data : row)

const findSession = async (db, token) => {
  let result = await db.collection("TT_sessions").where({ token }).limit(1).get()
  let session = (result.data || [])[0]
  if (!session) {
    result = await db.collection("TT_sessions").where({ "data.token": token }).limit(1).get()
    session = (result.data || [])[0]
  }
  return session
}

exports.main = async (event = {}) => {
  const { token } = event
  if (!token) {
    return { ok: false }
  }

  const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
  const db = app.database()

  const sessionRow = await findSession(db, token)
  if (!sessionRow) {
    return { ok: false }
  }

  const session = unwrap(sessionRow)

  if (session.expiredAt && new Date(session.expiredAt).getTime() < Date.now()) {
    return { ok: false }
  }

  let wechatBound = null

  if (session.userId) {
    const userResult = await db.collection("TT_users").doc(session.userId).get()
    const userRow = userResult.data?.[0]
    const user = userRow?.data || userRow
    if (!user || user.activated === false) {
      return { ok: false }
    }
    if (user.wechatOpenId) {
      wechatBound = {
        nickname: user.wechatNickname || "",
        avatar: user.wechatAvatar || "",
      }
    }
  }

  return {
    ok: true,
    username: session.username,
    role: session.role || "main",
    nickname: session.nickname || session.username,
    canRedeem: session.canRedeem || false,
    wechatBound,
  }
}
