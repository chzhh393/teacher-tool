const tcb = require("tcb-admin-node")

const DEFAULT_THRESHOLDS = [0, 5, 12, 22, 35, 50, 70, 95, 125, 160]

exports.main = async (event = {}) => {
  const { shareToken } = event

  if (!shareToken) {
    return { error: "缺少分享令牌" }
  }

  const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
  const db = app.database()
  const _ = db.command

  // 1. 查找分享令牌
  const query = _.or([
    { "data.token": shareToken },
    { token: shareToken },
  ])
  const shareResult = await db.collection("TT_shares").where(query).limit(1).get()
  const shareDoc = (shareResult.data || [])[0]

  if (!shareDoc) {
    return { error: "链接无效" }
  }

  const share = shareDoc.data || shareDoc

  // 2. 校验有效性
  if (share.revoked) {
    return { error: "链接已失效" }
  }
  if (share.expiresAt && new Date(share.expiresAt).getTime() < Date.now()) {
    return { error: "链接已过期" }
  }

  const classId = share.classId

  // 3. 获取班级设置（等级阈值和系统名称）
  const settingsQuery = _.or([
    { "data.classId": classId },
    { classId },
  ])
  const settingsResult = await db.collection("TT_settings").where(settingsQuery).limit(1).get()
  const settingsDoc = (settingsResult.data || [])[0]
  const settings = settingsDoc ? (settingsDoc.data || settingsDoc) : {}
  const systemName = settings.systemName || "成长值"
  const thresholds = settings.levelThresholds || DEFAULT_THRESHOLDS

  // 4. 根据类型返回数据
  if (share.type === "class") {
    return await handleClassShare(db, _, classId, share.className, systemName)
  }

  if (share.type === "student") {
    return await handleStudentShare(db, _, classId, share.studentId, share.className, systemName, thresholds)
  }

  return { error: "未知分享类型" }
}

async function handleClassShare(db, _, classId, className, systemName) {
  const studentQuery = _.or([
    { "data.classId": classId },
    { classId },
  ])
  const result = await db.collection("TT_students").where(studentQuery).limit(1000).get()

  const students = (result.data || [])
    .map((item) => {
      const r = item.data || item
      return {
        name: r.name,
        beastId: r.beastId || r.dinosaurId || null,
        beastName: r.beastName || r.dinosaurName || null,
        level: r.level || 1,
        totalScore: r.totalScore || 0,
        earnedScore: r.earnedScore || 0,
        badges: r.badges || 0,
        progress: r.progress || 0,
        collectedBeasts: r.collectedBeasts || [],
      }
    })
    .sort((a, b) => {
      if (b.badges !== a.badges) return b.badges - a.badges
      return b.earnedScore - a.earnedScore
    })

  return {
    type: "class",
    className,
    systemName,
    students,
  }
}

async function handleStudentShare(db, _, classId, studentId, className, systemName, thresholds) {
  // 查询学生数据
  const stuDoc = await db.collection("TT_students").doc(studentId).get()
  const stuRow = stuDoc.data?.[0]
  if (!stuRow) {
    return { error: "学生数据不存在" }
  }

  const r = stuRow.data || stuRow
  const student = {
    name: r.name,
    beastId: r.beastId || r.dinosaurId || null,
    beastName: r.beastName || r.dinosaurName || null,
    level: r.level || 1,
    totalScore: r.totalScore || 0,
    earnedScore: r.earnedScore || 0,
    availableScore: r.availableScore || 0,
    badges: r.badges || 0,
    progress: r.progress || 0,
    collectedBeasts: r.collectedBeasts || [],
  }

  // 查询最近 10 条积分记录
  const recordQuery = _.or([
    { "data.studentId": studentId, "data.classId": classId },
    { studentId, classId },
  ])
  const recordResult = await db.collection("TT_score_records")
    .where(recordQuery)
    .orderBy("data.createdAt", "desc")
    .limit(10)
    .get()

  const recentRecords = (recordResult.data || [])
    .map((item) => {
      const rec = item.data || item
      if (rec.revoked) return null
      return {
        ruleName: rec.ruleName,
        score: rec.score,
        type: rec.type,
        createdAt: rec.createdAt,
      }
    })
    .filter(Boolean)

  return {
    type: "student",
    className,
    systemName,
    student,
    recentRecords,
    levelThresholds: thresholds,
  }
}
