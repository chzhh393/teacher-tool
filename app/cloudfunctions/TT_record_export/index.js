const tcb = require("tcb-admin-node")

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
  }
}

const verifyClassAccess = async (db, classId, user) => {
  if (user.role === "sub") {
    return (user.authorizedClassIds || []).includes(classId)
  }
  // 主账号验证班级所有权
  const classDoc = await db.collection("TT_classes").doc(classId).get()
  const classRow = classDoc.data?.[0]
  const raw = classRow?.data || classRow
  return raw && raw.userId === user.userId
}

const getClassId = async (db, classId, user) => {
  if (classId) {
    const hasAccess = await verifyClassAccess(db, classId, user)
    if (!hasAccess) {
      throw new Error("未授权：无权访问该班级")
    }
    return classId
  }

  // 如果没有指定classId，尝试获取用户的第一个可访问班级
  if (user.role === "sub") {
    // 子账号返回第一个授权的班级
    return (user.authorizedClassIds || [])[0] || null
  }

  // 主账号返回第一个自己的班级
  const classResult = await db.collection("TT_classes").where({ "data.userId": user.userId }).limit(1).get()
  const first = classResult.data?.[0]
  return first ? first._id : null
}

const formatDate = (date) => {
  if (!date) return ""
  // 处理 {$date: timestamp} 格式
  if (date.$date) {
    return new Date(date.$date).toISOString()
  }
  if (date instanceof Date) {
    return date.toISOString()
  }
  return String(date)
}

const toCsv = (records) => {
  const header = ["时间", "学生", "类型", "规则", "分值", "状态"]
  const rows = records.map((record) => [
    formatDate(record.createdAt),
    record.studentName,
    record.type === "add" ? "加分" : record.type === "subtract" ? "扣分" : "撤回",
    record.ruleName,
    record.score,
    record.revoked ? "已撤回" : "",
  ])
  return [header, ...rows].map((row) => row.map((cell) => `"${cell ?? ""}"`).join(",")).join("\n")
}

exports.main = async (event = {}) => {
  const { token } = event

  const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
  const db = app.database()

  // 1. 验证token
  const user = await verifyToken(db, token)
  if (!user) {
    throw new Error("未授权：无效的token")
  }

  // 2. 获取并验证classId
  const classId = await getClassId(db, event.classId, user)
  if (!classId) {
    return { csvUrl: "" }
  }

  const allResult = await db.collection("TT_score_records").where({ "data.classId": classId }).limit(1000).get()
  const records = (allResult.data || [])
    .map((item) => item.data || item)
    .sort((a, b) => {
      const timeA = formatDate(a.createdAt)
      const timeB = formatDate(b.createdAt)
      return timeB.localeCompare(timeA)
    })

  const csvContent = toCsv(records)
  const cloudPath = `exports/score-records-${classId}-${Date.now()}.csv`

  const uploadResult = await app.uploadFile({
    cloudPath,
    fileContent: Buffer.from(csvContent),
  })

  const tempUrlResult = await app.getTempFileURL({
    fileList: [uploadResult.fileID],
  })

  return {
    csvUrl: tempUrlResult.fileList?.[0]?.tempFileURL || "",
  }
}
