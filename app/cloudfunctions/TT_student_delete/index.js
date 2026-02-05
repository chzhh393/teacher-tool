const tcb = require("tcb-admin-node")

exports.main = async (event = {}) => {
  const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
  const db = app.database()

  if (!event.studentId) {
    throw new Error("studentId 为必填")
  }

  await db.collection("TT_students").doc(event.studentId).remove()

  return { ok: true }
}
