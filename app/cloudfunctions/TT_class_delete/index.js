const tcb = require("tcb-admin-node")

exports.main = async (event = {}) => {
  if (!event.classId) {
    throw new Error("classId 为必填")
  }

  const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
  const db = app.database()

  await db.collection("TT_classes").doc(event.classId).remove()

  return { ok: true }
}
