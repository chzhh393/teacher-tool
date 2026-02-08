const tcb = require("tcb-admin-node")

const unwrap = (row) => (row?.data ? row.data : row)

const listAll = async (db, collectionName) => {
  const result = await db.collection(collectionName).limit(1000).get()
  return (result.data || []).map((row) => {
    const raw = unwrap(row)
    return { ...raw, _id: raw._id || row._id }
  })
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
      activated: user.activated === true,
      createdAt: user.createdAt || null,
      activatedAt: user.activatedAt || null,
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

  return {
    stats: {
      totalUsers: allUsers.length,
      activatedUsers: allUsers.filter((u) => u.activated === true).length,
      totalClasses: allClasses.length,
      totalStudents: allStudents.length,
    },
    users,
  }
}
