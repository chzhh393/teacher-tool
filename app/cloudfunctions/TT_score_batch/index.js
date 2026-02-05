const tcb = require("tcb-admin-node")

const DEFAULT_THRESHOLDS = [0, 5, 12, 22, 35, 50, 70, 95, 125, 160]

const computeLevel = (totalScore, thresholds) => {
  const levels = thresholds.length
  let level = 1
  for (let i = 0; i < levels; i += 1) {
    if (totalScore >= thresholds[i]) {
      level = i + 1
    }
  }

  const currentIndex = Math.min(level - 1, thresholds.length - 1)
  const currentBase = thresholds[currentIndex] ?? 0
  const nextBase = thresholds[currentIndex + 1] ?? currentBase
  const range = Math.max(nextBase - currentBase, 1)
  const progress = Math.min(100, Math.max(0, Math.round(((totalScore - currentBase) / range) * 100)))

  return { level, progress }
}

const getThresholds = async (db, classId) => {
  const settingsResult = await db.collection("TT_settings").where({ classId }).limit(1).get()
  const settings = settingsResult.data?.[0]
  return settings?.levelThresholds || DEFAULT_THRESHOLDS
}

exports.main = async (event = {}) => {
  const { classId, studentIds, ruleId, ruleName, score } = event
  if (!classId || !Array.isArray(studentIds) || !studentIds.length || typeof score !== "number") {
    throw new Error("classId, studentIds, score 为必填")
  }

  const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
  const db = app.database()
  const _ = db.command
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
    const nextTotalScore = Math.max(0, (raw.totalScore || 0) + score)
    const nextAvailable = Math.max(0, (raw.availableScore || 0) + score)
    const { level, progress } = computeLevel(nextTotalScore, thresholds)
    const nextBadges = level === 10 && previousLevel < 10 ? (raw.badges || 0) + 1 : raw.badges || 0

    const updated = {
      ...raw,
      totalScore: nextTotalScore,
      availableScore: nextAvailable,
      level,
      progress,
      badges: nextBadges,
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
        createdAt: now,
      },
    })

    updatedIds.push(student._id)
  }

  return {
    updatedStudentIds: updatedIds,
  }
}
