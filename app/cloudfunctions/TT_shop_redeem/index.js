const tcb = require("tcb-admin-node")

// 验证 token 并返回用户信息
const verifyToken = async (db, token) => {
  if (!token) return null
  let result = await db.collection("TT_sessions").where({ token }).limit(1).get()
  let session = (result.data || [])[0]
  if (!session) {
    result = await db.collection("TT_sessions").where({ "data.token": token }).limit(1).get()
    session = (result.data || [])[0]
  }
  if (!session) return null
  const raw = session.data || session
  if (raw.expiredAt && new Date(raw.expiredAt).getTime() < Date.now()) return null
  return {
    userId: raw.userId,
    username: raw.username,
    role: raw.role || "main",
    nickname: raw.nickname || raw.username,
    authorizedClassIds: raw.authorizedClassIds || [],
    canRedeem: raw.canRedeem || false,
  }
}

exports.main = async (event = {}) => {
  const { studentId, itemId, classId } = event
  if (!studentId || !itemId) {
    throw new Error("studentId 与 itemId 为必填")
  }

  const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
  const db = app.database()
  const _ = db.command

  // 1. 验证 token
  const user = await verifyToken(db, event.token)
  if (!user) {
    throw new Error("未登录或登录已过期")
  }

  // 2. 子账号权限检查
  if (user.role === "sub" && !user.canRedeem) {
    throw new Error("子账号无权兑换商品")
  }

  // 3. 获取学生信息并验证班级访问权限
  const studentResult = await db.collection("TT_students").doc(studentId).get()
  const studentDoc = studentResult.data?.[0]
  if (!studentDoc) {
    throw new Error("未找到学生")
  }
  const student = studentDoc.data || studentDoc

  if (user.role === "sub") {
    if (!(user.authorizedClassIds || []).includes(student.classId)) {
      throw new Error("无权访问该班级")
    }
  } else {
    const classResult = await db.collection("TT_classes").doc(student.classId).get()
    const classDoc = classResult.data?.[0]
    if (!classDoc) {
      throw new Error("未找到学生所属班级")
    }
    const classRaw = classDoc.data || classDoc
    if (classRaw.userId !== user.userId) {
      throw new Error("无权为该学生兑换商品")
    }
  }

  // 4. 兑换逻辑（保持原有逻辑）
  const now = new Date()

  const itemResult = await db.collection("TT_shop_items").doc(itemId).get()
  const itemDoc = itemResult.data?.[0]
  if (!itemDoc) {
    throw new Error("未找到商品")
  }
  const item = itemDoc.data || itemDoc

  // 库存检查
  if ((item.stock ?? 0) <= 0) {
    throw new Error("商品已售罄")
  }

  if ((student.availableScore || 0) < (item.cost || 0)) {
    throw new Error("积分不足")
  }

  // 扣减学生积分
  const updatedStudent = {
    ...student,
    availableScore: (student.availableScore || 0) - (item.cost || 0),
    updatedAt: now,
  }
  await db.collection("TT_students").doc(studentId).set({ data: updatedStudent })

  // 原子扣减库存
  await db.collection("TT_shop_items").doc(itemId).update({
    data: { stock: _.inc(-1) },
  })

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
