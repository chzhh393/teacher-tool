const tcb = require("tcb-admin-node")

const DEFAULT_THRESHOLDS = [0, 5, 12, 22, 35, 50, 70, 95, 125, 160]

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

const computeLevel = (totalScore, thresholds) => {
  const maxLevel = thresholds.length
  let level = 1
  for (let i = 0; i < maxLevel; i += 1) {
    if (totalScore >= thresholds[i]) {
      level = i + 1
    }
  }

  if (level >= maxLevel) {
    return { level, progress: 100 }
  }
  const currentBase = thresholds[level - 1] ?? 0
  const nextBase = thresholds[level] ?? currentBase
  const range = Math.max(nextBase - currentBase, 1)
  const progress = Math.min(100, Math.max(0, Math.round(((totalScore - currentBase) / range) * 100)))

  return { level, progress }
}

const getThresholds = async (db, classId) => {
  const _ = db.command
  const settingsResult = await db.collection("TT_settings").where(_.or([
    { classId },
    { "data.classId": classId },
  ])).limit(1).get()
  const settings = settingsResult.data?.[0]
  const raw = settings?.data || settings
  return raw?.levelThresholds || DEFAULT_THRESHOLDS
}

exports.main = async (event = {}) => {
  const { token, classId, studentIds, ruleId, ruleName, score } = event
  if (!classId || !Array.isArray(studentIds) || !studentIds.length || typeof score !== "number") {
    throw new Error("classId, studentIds, score 为必填")
  }

  const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
  const db = app.database()
  const _ = db.command

  // 1. 验证token
  const user = await verifyToken(db, token)
  if (!user) {
    throw new Error("未授权：无效的token")
  }

  // 2. 验证班级访问权限
  const hasAccess = await verifyClassAccess(db, classId, user)
  if (!hasAccess) {
    throw new Error("未授权：无权访问该班级")
  }

  const now = new Date()

  const thresholds = await getThresholds(db, classId)
  const studentsResult = await db
    .collection("TT_students")
    .where({ _id: _.in(studentIds) })
    .get()

  const students = studentsResult.data ?? []
  const updatedIds = []

  for (const student of students) {
    const raw = student.data || student
    if (raw.classId !== classId) {
      continue
    }
    const previousLevel = raw.level || 1
    const maxTotalScore = thresholds[thresholds.length - 1] || 160
    const rawNextTotalScore = Math.max(0, (raw.totalScore || 0) + score)
    const nextTotalScore = score > 0 ? Math.min(rawNextTotalScore, maxTotalScore) : rawNextTotalScore
    const nextAvailable = Math.max(0, (raw.availableScore || 0) + score)
    const nextEarned = score > 0 ? (raw.earnedScore || 0) + score : (raw.earnedScore || 0)
    const { level, progress } = computeLevel(nextTotalScore, thresholds)
    const maxLevel = thresholds.length
    const reachedMax = level === maxLevel && previousLevel < maxLevel
    const nextBadges = reachedMax ? (raw.badges || 0) + 1 : raw.badges || 0
    const nextCollected = reachedMax && raw.beastId
      ? [...(raw.collectedBeasts || []), raw.beastId]
      : (raw.collectedBeasts || [])

    const updated = {
      ...raw,
      totalScore: nextTotalScore,
      availableScore: nextAvailable,
      earnedScore: nextEarned,
      level,
      progress,
      badges: nextBadges,
      collectedBeasts: nextCollected,
      lastScoreTime: score > 0 ? now : raw.lastScoreTime || now,
      updatedAt: now,
    }

    await db.collection("TT_students").doc(student._id).set({ data: updated })

    await db.collection("TT_score_records").add({
      data: {
        classId,
        studentId: student._id,
        studentName: raw.name,
        ruleId: ruleId || "",
        ruleName: ruleName || "",
        type: score >= 0 ? "add" : "subtract",
        score,
        operatorId: user.userId,
        operatorName: user.nickname || user.username,
        createdAt: now,
      },
    })

    updatedIds.push(student._id)
  }

  return {
    updatedStudentIds: updatedIds,
  }
}
