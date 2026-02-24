const tcb = require("tcb-admin-node")

const verifyToken = async (db, token) => {
  if (!token) return null
  const _ = db.command
  const result = await db
    .collection("TT_sessions")
    .where(_.or([{ token }, { "data.token": token }]))
    .limit(1)
    .get()
  const session = (result.data || [])[0]
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
    return { ranks: [] }
  }

  const _ = db.command
  const result = await db.collection("TT_students").where(
    _.or([{ classId }, { "data.classId": classId }])
  ).limit(1000).get()
  const students = (result.data || [])
    .map((item) => {
      const raw = item.data || item
      return { ...raw, id: item._id || raw.id }
    })

  const ranks = students
    .sort((a, b) => {
      if ((b.badges || 0) !== (a.badges || 0)) {
        return (b.badges || 0) - (a.badges || 0)
      }
      return (b.earnedScore || 0) - (a.earnedScore || 0)
    })
    .slice(0, 10)

  // 3. 聚合小组排名
  let groups = []
  try {
    const groupResult = await db.collection("TT_groups").where(
      _.or([{ classId }, { "data.classId": classId }])
    ).limit(1000).get()
    groups = (groupResult.data || []).map((row) => {
      const raw = row.data || row
      return {
        id: row._id || raw.id,
        name: raw.name || "",
        color: raw.color || "#6366F1",
        memberIds: raw.memberIds || [],
        order: raw.order ?? 0,
      }
    })
  } catch (_e) { /* 集合可能不存在 */ }

  let groupRanks = undefined
  if (groups.length > 0) {
    const studentMap = {}
    for (const s of students) {
      studentMap[s.id] = s
    }

    groupRanks = groups.map((g) => {
      const members = (g.memberIds || [])
        .map((id) => studentMap[id])
        .filter(Boolean)
      const totalEarnedScore = members.reduce((sum, m) => sum + (m.earnedScore || 0), 0)
      return {
        group: { id: g.id, name: g.name, color: g.color, memberIds: g.memberIds },
        totalEarnedScore,
        memberCount: members.length,
        members: members.map((m) => ({
          id: m.id,
          name: m.name,
          earnedScore: m.earnedScore || 0,
        })),
      }
    }).sort((a, b) => b.totalEarnedScore - a.totalEarnedScore)
  }

  return { ranks, groupRanks }
}
