const tcb = require("tcb-admin-node")

const getClassId = async (db, classId) => {
  if (classId) {
    return classId
  }

  const classResult = await db.collection("TT_classes").limit(1).get()
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
  const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
  const db = app.database()

  const classId = await getClassId(db, event.classId)
  if (!classId) {
    return { csvUrl: "" }
  }

  // 获取所有记录然后过滤（因为数据可能在 data 嵌套中）
  const allResult = await db.collection("TT_score_records").get()
  const records = (allResult.data || [])
    .map((item) => item.data || item)
    .filter((item) => item.classId === classId)
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
