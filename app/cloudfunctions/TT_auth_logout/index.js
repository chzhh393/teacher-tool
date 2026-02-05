const tcb = require("tcb-admin-node")

exports.main = async (event = {}) => {
  const { token } = event
  if (!token) {
    return { ok: true }
  }

  const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
  const db = app.database()

  const result = await db.collection("TT_sessions").get()
  const targets = (result.data || []).filter((row) => {
    const session = row?.data || row
    return session && session.token === token
  })

  for (const row of targets) {
    await db.collection("TT_sessions").doc(row._id).remove()
  }

  return { ok: true }
}
