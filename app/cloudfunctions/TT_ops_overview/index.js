const tcb = require("tcb-admin-node")

const unwrap = (row) => (row?.data ? row.data : row)

const listAll = async (db, collectionName) => {
  const PAGE = 1000
  const all = []
  let offset = 0
  while (true) {
    const result = await db.collection(collectionName).skip(offset).limit(PAGE).get()
    const rows = (result.data || []).map((row) => {
      const raw = unwrap(row)
      return { ...raw, _id: raw._id || row._id }
    })
    all.push(...rows)
    if (rows.length < PAGE) break
    offset += PAGE
  }
  return all
}

exports.main = async (event = {}) => {
  const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
  const db = app.database()

  // 1. 并行查询三个集合
  const [allUsers, allClasses, allStudents] = await Promise.all([
    listAll(db, "TT_users"),
    listAll(db, "TT_classes"),
    listAll(db, "TT_students"),
  ])

  // 1.5 从 sessions 补充 lastLoginAt（兜底：用户表没有时从 sessions 取）
  let lastLoginByUser = {}
  const needFallback = allUsers.some((u) => !u.lastLoginAt)
  if (needFallback) {
    const allSessions = await listAll(db, "TT_sessions")
    for (const s of allSessions) {
      const uid = s.userId || ""
      if (!uid) continue
      const t = s.createdAt ? new Date(s.createdAt).getTime() : 0
      if (t > (lastLoginByUser[uid]?.time || 0)) {
        lastLoginByUser[uid] = { time: t, value: s.createdAt }
      }
    }
  }

  // 2. 按班级统计学生数
  const studentCountByClass = {}
  for (const student of allStudents) {
    const classId = student.classId || ""
    if (classId) {
      studentCountByClass[classId] = (studentCountByClass[classId] || 0) + 1
    }
  }

  // 3. 按用户聚合班级
  const classesByUser = {}
  for (const cls of allClasses) {
    const userId = cls.userId || ""
    if (!classesByUser[userId]) {
      classesByUser[userId] = []
    }
    classesByUser[userId].push({
      id: cls._id || "",
      name: cls.name || "未命名班级",
      studentCount: studentCountByClass[cls._id] || 0,
      createdAt: cls.createdAt || null,
    })
  }

  // 4. 组装用户列表
  const users = allUsers.map((user) => {
    const userId = user._id || ""
    const userClasses = classesByUser[userId] || []
    return {
      userId,
      username: user.username || "",
      role: user.role || "main",
      parentUserId: user.parentUserId || null,
      activated: user.activated === true,
      createdAt: user.createdAt || null,
      activatedAt: user.activatedAt || null,
      lastLoginAt: user.lastLoginAt || lastLoginByUser[userId]?.value || null,
      classCount: userClasses.length,
      totalStudents: userClasses.reduce((sum, c) => sum + c.studentCount, 0),
      classes: userClasses,
    }
  })

  // 5. 按注册时间降序排列
  users.sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return tb - ta
  })

  // 6. 按天聚合每日新增数据（北京时间 UTC+8）
  const toCNDate = (v) => {
    if (!v) return null
    const d = new Date(v)
    if (isNaN(d.getTime())) return null
    return new Date(d.getTime() + 8 * 3600000).toISOString().slice(0, 10)
  }
  const dailyMap = {}
  const ensureDay = (key) => {
    if (!dailyMap[key]) dailyMap[key] = { date: key, newUsers: 0, newActivated: 0, newClasses: 0, newStudents: 0 }
  }
  // 确保今天（北京时间）始终存在
  ensureDay(toCNDate(new Date()))
  for (const u of allUsers) {
    const k = toCNDate(u.createdAt)
    if (k) { ensureDay(k); dailyMap[k].newUsers++ }
    const ak = toCNDate(u.activatedAt)
    if (ak) { ensureDay(ak); dailyMap[ak].newActivated++ }
  }
  for (const c of allClasses) {
    const k = toCNDate(c.createdAt)
    if (k) { ensureDay(k); dailyMap[k].newClasses++ }
  }
  for (const s of allStudents) {
    const k = toCNDate(s.createdAt)
    if (k) { ensureDay(k); dailyMap[k].newStudents++ }
  }
  const dailyStats = Object.values(dailyMap).sort((a, b) => (b.date > a.date ? 1 : -1))

  return {
    stats: {
      totalUsers: allUsers.length,
      activatedUsers: allUsers.filter((u) => u.activated === true && (u.role || "main") !== "sub").length,
      totalClasses: allClasses.length,
      totalStudents: allStudents.length,
    },
    dailyStats,
    users,
  }
}
