const tcb = require("tcb-admin-node")

exports.main = async (event = {}) => {
  const { studentId, itemId, classId } = event
  if (!studentId || !itemId) {
    throw new Error("studentId 与 itemId 为必填")
  }

  const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
  const db = app.database()
  const now = new Date()

  const studentResult = await db.collection("TT_students").doc(studentId).get()
  const studentDoc = studentResult.data?.[0]
  if (!studentDoc) {
    throw new Error("未找到学生")
  }
  const student = studentDoc.data || studentDoc

  const itemResult = await db.collection("TT_shop_items").doc(itemId).get()
  const itemDoc = itemResult.data?.[0]
  if (!itemDoc) {
    throw new Error("未找到商品")
  }
  const item = itemDoc.data || itemDoc

  if ((student.availableScore || 0) < (item.cost || 0)) {
    throw new Error("积分不足")
  }

  const updatedStudent = {
    ...student,
    availableScore: (student.availableScore || 0) - (item.cost || 0),
    updatedAt: now,
  }
  await db.collection("TT_students").doc(studentId).set({ data: updatedStudent })

  const redeemRecord = {
    classId: classId || student.classId,
    studentId,
    studentName: student.name,
    itemId,
    itemName: item.name,
    cost: item.cost || 0,
    status: "pending",
    createdAt: now,
  }

  const result = await db.collection("TT_redeem_records").add({ data: redeemRecord })

  return {
    redeemRecord: {
      ...redeemRecord,
      _id: result.id,
    },
  }
}
