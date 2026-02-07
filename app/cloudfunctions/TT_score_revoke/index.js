const tcb = require("tcb-admin-node")

const DEFAULT_THRESHOLDS = [0, 5, 12, 22, 35, 50, 70, 95, 125, 160]

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
  if (!event.recordId) {
    throw new Error("recordId 为必填")
  }

  const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
  const db = app.database()
  const now = new Date()

  const recordResult = await db.collection("TT_score_records").doc(event.recordId).get()
  const recordRow = recordResult.data?.[0]
  const record = recordRow?.data || recordRow
  if (!record) {
    throw new Error("未找到记录")
  }

  if (record.revoked) {
    return { ok: true }
  }

  // 尝试查找学生，如果学生已被删除则跳过分数更新
  const studentResult = await db.collection("TT_students").doc(record.studentId).get()
  const studentRow = studentResult.data?.[0]
  const student = studentRow?.data || studentRow

  if (student) {
    // 学生存在，更新学生分数
    const thresholds = await getThresholds(db, record.classId)
    const score = record.score || 0
    const reverseTotalScore = score >= 0
      ? Math.max(0, (student.totalScore || 0) - score)
      : Math.max(0, (student.totalScore || 0) + Math.abs(score))
    const reverseAvailable = score > 0
      ? Math.max(0, (student.availableScore || 0) - score)
      : Math.max(0, (student.availableScore || 0) + Math.abs(score))
    const reverseEarned = score > 0
      ? Math.max(0, (student.earnedScore || 0) - score)
      : (student.earnedScore || 0)

    const { level, progress } = computeLevel(reverseTotalScore, thresholds)
    const maxLevel = thresholds.length
    let nextBadges = student.badges || 0
    let nextCollected = student.collectedBeasts || []
    if (student.level === maxLevel && level < maxLevel) {
      nextBadges = Math.max(0, nextBadges - 1)
      // 撤回满级时移除最后收集的幻兽
      if (nextCollected.length > 0) {
        nextCollected = nextCollected.slice(0, -1)
      }
    } else if (student.level < maxLevel && level === maxLevel) {
      nextBadges += 1
      if (student.beastId) {
        nextCollected = [...nextCollected, student.beastId]
      }
    }

    const updatedStudent = {
      ...student,
      totalScore: reverseTotalScore,
      availableScore: reverseAvailable,
      level,
      progress,
      badges: nextBadges,
      collectedBeasts: nextCollected,
      earnedScore: reverseEarned,
      updatedAt: now,
    }

    await db.collection("TT_students").doc(record.studentId).set({ data: updatedStudent })
  }
  // 如果学生不存在，只标记记录为已撤回，不更新学生分数

  if (recordRow) {
    const updatedRecord = { ...record, revoked: true, revokedAt: now }
    await db.collection("TT_score_records").doc(recordRow._id).set({ data: updatedRecord })
  }

  await db.collection("TT_score_records").add({
    data: {
      classId: record.classId,
      studentId: record.studentId,
      studentName: record.studentName,
      ruleId: record.ruleId,
      ruleName: record.ruleName,
      type: "revoke",
      score: 0,
      createdAt: now,
    },
  })

  return { ok: true }
}
