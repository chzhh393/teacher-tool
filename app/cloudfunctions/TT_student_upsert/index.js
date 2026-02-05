const tcb = require("tcb-admin-node")

const generateId = () => `stu-${Date.now()}-${Math.floor(Math.random() * 10000)}`

exports.main = async (event = {}) => {
  const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
  const db = app.database()

  const student = event.student
  if (!student || !student.classId || !student.name) {
    throw new Error("student.classId 与 student.name 为必填")
  }

  const now = new Date()
  const studentId = student._id || student.id || generateId()
  const data = {
    ...student,
    _id: studentId,
    level: student.level || 1,
    totalScore: student.totalScore || 0,
    availableScore: student.availableScore || 0,
    badges: student.badges || 0,
    progress: student.progress || 0,
    updatedAt: now,
    createdAt: student.createdAt || now,
  }

  await db.collection("TT_students").doc(studentId).set({ data })

  return { student: data }
}
