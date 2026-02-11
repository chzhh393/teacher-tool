const tcb = require("tcb-admin-node")

exports.main = async (event = {}) => {
  const { token } = event
  if (!token) {
    return { ok: true }
  }

  const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
  const db = app.database()
  const _ = db.command

  const result = await db
    .collection("TT_sessions")
    .where(_.or([{ token }, { "data.token": token }]))
    .limit(10)
    .get()

  for (const row of result.data || []) {
    await db.collection("TT_sessions").doc(row._id).remove()
  }

  return { ok: true }
}
