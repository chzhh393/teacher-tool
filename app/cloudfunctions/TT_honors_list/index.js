const tcb = require("tcb-admin-node")

const getClassId = async (db, classId) => {
  if (classId) {
    return classId
  }

  const classResult = await db.collection("TT_classes").limit(1).get()
  const first = classResult.data?.[0]
  return first ? first._id : null
}

exports.main = async (event = {}) => {
  const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
  const db = app.database()

  const classId = await getClassId(db, event.classId)
  if (!classId) {
    return { ranks: [] }
  }

  const result = await db.collection("TT_students").where({ "data.classId": classId }).limit(1000).get()
  const students = (result.data || [])
    .map((item) => item.data || item)

  const ranks = students
    .sort((a, b) => {
      if ((b.badges || 0) !== (a.badges || 0)) {
        return (b.badges || 0) - (a.badges || 0)
      }
      if ((b.level || 0) !== (a.level || 0)) {
        return (b.level || 0) - (a.level || 0)
      }
      return (b.totalScore || 0) - (a.totalScore || 0)
    })
    .slice(0, 10)

  return { ranks }
}
