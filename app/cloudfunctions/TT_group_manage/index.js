const tcb = require("tcb-admin-node")

const unwrap = (row) => (row?.data && typeof row.data === "object" ? row.data : row)

const verifyToken = async (db, token) => {
  if (!token) return null
  let result = await db.collection("TT_sessions").where({ token }).limit(1).get()
  let session = (result.data || [])[0]
  if (!session) {
    result = await db.collection("TT_sessions").where({ "data.token": token }).limit(1).get()
    session = (result.data || [])[0]
  }
  if (!session) return null
  const raw = unwrap(session)
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

// 获取班级所有小组
const handleList = async (db, classId) => {
  const _ = db.command
  const result = await db.collection("TT_groups").where(
    _.or([{ classId }, { "data.classId": classId }])
  ).limit(1000).get()

  const groups = (result.data || []).map((row) => {
    const raw = unwrap(row)
    return {
      id: row._id || raw.id,
      classId: raw.classId,
      name: raw.name || "",
      color: raw.color || "#6366F1",
      memberIds: raw.memberIds || [],
      order: raw.order ?? 0,
    }
  }).sort((a, b) => a.order - b.order)

  return { groups }
}

// 整体覆盖保存所有小组
const handleSave = async (db, classId, groups, user) => {
  // 仅主账号可保存
  if (user.role === "sub") {
    throw new Error("子账号无权管理小组")
  }

  if (!Array.isArray(groups)) {
    throw new Error("groups 必须为数组")
  }

  // 1. 校验成员归属该班级
  const _ = db.command
  const studentResult = await db.collection("TT_students").where(
    _.or([{ classId }, { "data.classId": classId }])
  ).limit(1000).get()
  const validStudentIds = new Set(
    (studentResult.data || []).map((row) => row._id || unwrap(row).id)
  )

  // 2. 校验一个学生不能在多个小组中
  const seenStudentIds = new Set()
  for (const group of groups) {
    for (const memberId of group.memberIds || []) {
      if (!validStudentIds.has(memberId)) {
        throw new Error(`学生 ${memberId} 不属于该班级`)
      }
      if (seenStudentIds.has(memberId)) {
        throw new Error(`学生 ${memberId} 被分配到了多个小组`)
      }
      seenStudentIds.add(memberId)
    }
  }

  // 3. 删除旧小组
  const oldCond = _.or([{ classId }, { "data.classId": classId }])
  while (true) {
    const res = await db.collection("TT_groups").where(oldCond).remove()
    if ((res.deleted || 0) === 0) break
  }

  // 4. 写入新小组
  const now = new Date()
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i]
    const id = g.id || `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    await db.collection("TT_groups").doc(id).set({
      data: {
        id,
        classId,
        name: g.name || "",
        color: g.color || "#6366F1",
        memberIds: g.memberIds || [],
        order: i,
        createdAt: g.createdAt || now,
        updatedAt: now,
      },
    })
  }

  return { ok: true }
}

exports.main = async (event = {}) => {
  const { action, token, classId } = event

  const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
  const db = app.database()

  // 1. 验证 token
  const user = await verifyToken(db, token)
  if (!user) {
    throw new Error("未登录或登录已过期")
  }

  if (!classId) {
    throw new Error("classId 为必填")
  }

  // 2. 验证班级访问权限
  const hasAccess = await verifyClassAccess(db, classId, user)
  if (!hasAccess) {
    throw new Error("未授权：无权访问该班级")
  }

  switch (action) {
    case "list":
      return handleList(db, classId)
    case "save":
      return handleSave(db, classId, event.groups, user)
    default:
      throw new Error(`未知操作: ${action}`)
  }
}
