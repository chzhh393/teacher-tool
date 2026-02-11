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
  const classDoc = await db.collection("TT_classes").doc(classId).get()
  const classRow = classDoc.data?.[0]
  const raw = classRow?.data || classRow
  return raw && raw.userId === user.userId
}

const getClassId = async (db, classId, user) => {
  if (classId) {
    const hasAccess = await verifyClassAccess(db, classId, user)
    if (!hasAccess) throw new Error("未授权：无权访问该班级")
    return classId
  }
  if (user.role === "sub") {
    return (user.authorizedClassIds || [])[0] || null
  }
  const classResult = await db.collection("TT_classes").where({ "data.userId": user.userId }).limit(1).get()
  const first = classResult.data?.[0]
  return first ? first._id : null
}

// 计算时间范围（Asia/Shanghai 时区，UTC+8）
function calculateTimeRange(type) {
  const now = new Date()
  // 转换为上海时区的日期部分
  const shanghaiOffset = 8 * 60 * 60 * 1000
  const utcMs = now.getTime()
  const shanghaiMs = utcMs + shanghaiOffset
  const shanghaiDate = new Date(shanghaiMs)

  const year = shanghaiDate.getUTCFullYear()
  const month = shanghaiDate.getUTCMonth()
  const date = shanghaiDate.getUTCDate()
  const dayOfWeek = shanghaiDate.getUTCDay()

  let startMs, endMs

  if (type === "week") {
    // 本周一 00:00 (Asia/Shanghai)
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const mondayDate = date - mondayOffset
    // 构造上海时区的起止时间，再转回 UTC 时间戳
    startMs = Date.UTC(year, month, mondayDate, 0, 0, 0, 0) - shanghaiOffset
    endMs = Date.UTC(year, month, date, 23, 59, 59, 999) - shanghaiOffset
  } else {
    // 本月 1 日 00:00 (Asia/Shanghai)
    startMs = Date.UTC(year, month, 1, 0, 0, 0, 0) - shanghaiOffset
    endMs = Date.UTC(year, month, date, 23, 59, 59, 999) - shanghaiOffset
  }

  const startDate = new Date(startMs + shanghaiOffset)
  const endDate = new Date(endMs + shanghaiOffset)
  const pad = (n) => String(n).padStart(2, "0")

  return {
    type,
    startTimestamp: startMs,
    endTimestamp: endMs,
    startDate: `${startDate.getUTCFullYear()}-${pad(startDate.getUTCMonth() + 1)}-${pad(startDate.getUTCDate())}`,
    endDate: `${endDate.getUTCFullYear()}-${pad(endDate.getUTCMonth() + 1)}-${pad(endDate.getUTCDate())}`,
  }
}

exports.main = async (event = {}) => {
  const { token } = event

  const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
  const db = app.database()
  const _ = db.command

  // 1. 认证
  const user = await verifyToken(db, token)
  if (!user) throw new Error("未授权：无效的token")

  // 2. 获取并验证 classId
  const classId = await getClassId(db, event.classId, user)
  if (!classId) {
    return { timeRange: {}, studentSummaries: [], ruleSummaries: [], classSummary: {} }
  }

  // 3. 计算时间范围
  const timeRange = calculateTimeRange(event.timeRange || "week")

  // 4. 查询该时间段内所有未撤回记录
  //    时间条件需要双路径兼容
  //    CloudBase admin SDK 单次最多返回 1000 条，需分批拉取
  const classCondition = _.or([{ classId }, { "data.classId": classId }])
  const timeCondition = _.or([
    { createdAt: _.gte(timeRange.startTimestamp).lte(timeRange.endTimestamp) },
    { "data.createdAt": _.gte(timeRange.startTimestamp).lte(timeRange.endTimestamp) },
  ])
  const condition = _.and([classCondition, timeCondition])

  const batchSize = 1000
  let allRecords = []
  let skip = 0
  while (true) {
    const batch = await db
      .collection("TT_score_records")
      .where(condition)
      .skip(skip)
      .limit(batchSize)
      .get()
    const rows = batch.data || []
    allRecords = allRecords.concat(rows)
    if (rows.length < batchSize) break
    skip += batchSize
  }

  // 5. 在云函数内聚合统计
  const studentMap = {}
  const ruleMap = {}
  let totalAddCount = 0
  let totalAddScore = 0
  let totalSubtractCount = 0
  let totalSubtractScore = 0

  for (const item of allRecords) {
    const raw = item.data || item

    // 排除已撤回和撤回操作记录
    if (raw.revoked === true || raw.type === "revoke") continue

    const sid = raw.studentId
    const score = raw.score || 0
    const ruleKey = `${raw.ruleId || "unknown"}_${score >= 0 ? "add" : "subtract"}`

    // 学生汇总
    if (!studentMap[sid]) {
      studentMap[sid] = {
        studentId: sid,
        studentName: raw.studentName || "",
        addCount: 0,
        addTotal: 0,
        subtractCount: 0,
        subtractTotal: 0,
      }
    }

    // 规则汇总
    if (!ruleMap[ruleKey]) {
      ruleMap[ruleKey] = {
        ruleId: raw.ruleId || "",
        ruleName: raw.ruleName || "",
        type: score >= 0 ? "add" : "subtract",
        count: 0,
        totalScore: 0,
      }
    }

    if (score >= 0) {
      studentMap[sid].addCount++
      studentMap[sid].addTotal += score
      ruleMap[ruleKey].count++
      ruleMap[ruleKey].totalScore += score
      totalAddCount++
      totalAddScore += score
    } else {
      studentMap[sid].subtractCount++
      studentMap[sid].subtractTotal += Math.abs(score)
      ruleMap[ruleKey].count++
      ruleMap[ruleKey].totalScore += Math.abs(score)
      totalSubtractCount++
      totalSubtractScore += Math.abs(score)
    }
  }

  // 6. 转为数组并排序
  const studentSummaries = Object.values(studentMap)
    .map((s) => ({ ...s, netScore: s.addTotal - s.subtractTotal }))
    .sort((a, b) => b.netScore - a.netScore)

  const ruleSummaries = Object.values(ruleMap).sort((a, b) => b.count - a.count)

  return {
    timeRange: {
      type: timeRange.type,
      startDate: timeRange.startDate,
      endDate: timeRange.endDate,
    },
    studentSummaries,
    ruleSummaries,
    classSummary: {
      totalAddCount,
      totalAddScore,
      totalSubtractCount,
      totalSubtractScore,
      totalOperations: totalAddCount + totalSubtractCount,
      netScore: totalAddScore - totalSubtractScore,
      activeStudentCount: studentSummaries.length,
    },
  }
}
