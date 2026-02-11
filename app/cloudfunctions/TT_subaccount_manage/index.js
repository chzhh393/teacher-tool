const tcb = require("tcb-admin-node")
const bcrypt = require("bcryptjs")

const unwrap = (row) => (row?.data ? row.data : row)

const USERNAME_REG = /^[A-Za-z0-9_]{6,}$/

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

// 列出当前主账号的所有子账号
const handleList = async (db, user) => {
  const _ = db.command
  const result = await db.collection("TT_users").where(
    _.or([
      { parentUserId: user.userId },
      { "data.parentUserId": user.userId },
    ])
  ).limit(100).get()

  const subAccounts = (result.data || []).map((row) => {
    const raw = unwrap(row)
    return {
      id: row._id || raw._id,
      username: raw.username,
      nickname: raw.nickname || raw.username,
      authorizedClassIds: raw.authorizedClassIds || [],
      canRedeem: raw.canRedeem || false,
      createdAt: raw.createdAt,
    }
  })

  return { subAccounts }
}

// 创建子账号
const handleCreate = async (db, user, event) => {
  const { username, password, nickname, authorizedClassIds } = event
  if (!username || !password) {
    throw new Error("用户名和密码为必填")
  }
  if (!USERNAME_REG.test(username)) {
    throw new Error("用户名至少6位，仅支持字母、数字、下划线")
  }
  if (String(password).length < 6) {
    throw new Error("密码至少6位")
  }

  // 1. 校验用户名全局唯一
  const _ = db.command
  const existCheck = await db.collection("TT_users").where(
    _.or([{ username }, { "data.username": username }])
  ).limit(1).get()
  if ((existCheck.data || []).length > 0) {
    throw new Error("用户名已存在")
  }

  // 2. 校验授权班级归属当前主账号
  const classIds = Array.isArray(authorizedClassIds) ? authorizedClassIds : []
  if (classIds.length > 0) {
    const classResult = await db.collection("TT_classes").where(
      _.or([
        { userId: user.userId, _id: _.in(classIds) },
        { "data.userId": user.userId, "data._id": _.in(classIds) },
      ])
    ).get()
    const ownedIds = (classResult.data || []).map((row) => {
      const raw = unwrap(row)
      return row._id || raw._id
    })
    const invalid = classIds.filter((id) => !ownedIds.includes(id))
    if (invalid.length > 0) {
      throw new Error(`以下班级不属于您：${invalid.join(", ")}`)
    }
  }

  // 3. 创建子账号
  const now = new Date()
  const passwordHash = await bcrypt.hash(String(password), 10)
  const userId = `user-${Date.now()}`

  await db.collection("TT_users").doc(userId).set({
    data: {
      _id: userId,
      username,
      passwordHash,
      activated: true,
      role: "sub",
      nickname: nickname || username,
      parentUserId: user.userId,
      authorizedClassIds: classIds,
      canRedeem: Boolean(event.canRedeem),
      createdAt: now,
      updatedAt: now,
    },
  })

  return {
    subAccount: {
      id: userId,
      username,
      nickname: nickname || username,
      authorizedClassIds: classIds,
      canRedeem: Boolean(event.canRedeem),
    },
  }
}

// 修改子账号
const handleUpdate = async (db, user, event) => {
  const { subAccountId, nickname, password, authorizedClassIds } = event
  if (!subAccountId) {
    throw new Error("subAccountId 为必填")
  }

  // 1. 校验子账号存在且归属当前主账号
  const subResult = await db.collection("TT_users").doc(subAccountId).get()
  const subRow = subResult.data?.[0]
  const sub = subRow?.data || subRow
  if (!sub) {
    throw new Error("子账号不存在")
  }
  if ((sub.parentUserId || "") !== user.userId) {
    throw new Error("无权修改此子账号")
  }

  const now = new Date()
  const updateData = { updatedAt: now }

  if (nickname !== undefined) {
    updateData.nickname = nickname
  }
  if (password !== undefined) {
    if (String(password).length < 6) {
      throw new Error("密码至少6位")
    }
    updateData.passwordHash = await bcrypt.hash(String(password), 10)
  }
  if (event.canRedeem !== undefined) {
    updateData.canRedeem = Boolean(event.canRedeem)
  }
  if (authorizedClassIds !== undefined) {
    const classIds = Array.isArray(authorizedClassIds) ? authorizedClassIds : []
    // 校验班级归属
    if (classIds.length > 0) {
      const _ = db.command
      const classResult = await db.collection("TT_classes").where(
        _.or([
          { userId: user.userId, _id: _.in(classIds) },
          { "data.userId": user.userId, "data._id": _.in(classIds) },
        ])
      ).get()
      const ownedIds = (classResult.data || []).map((row) => {
        const raw = unwrap(row)
        return row._id || raw._id
      })
      const invalid = classIds.filter((id) => !ownedIds.includes(id))
      if (invalid.length > 0) {
        throw new Error(`以下班级不属于您：${invalid.join(", ")}`)
      }
    }
    updateData.authorizedClassIds = classIds
  }

  await db.collection("TT_users").doc(subAccountId).update({ data: updateData })

  // 同步更新该子账号的活跃 session
  const _ = db.command
  const sessionsResult = await db.collection("TT_sessions").where(
    _.or([
      { userId: subAccountId },
      { "data.userId": subAccountId },
    ])
  ).limit(100).get()

  const sessionUpdateData = {}
  if (nickname !== undefined) sessionUpdateData.nickname = nickname
  if (authorizedClassIds !== undefined) sessionUpdateData.authorizedClassIds = updateData.authorizedClassIds
  if (event.canRedeem !== undefined) sessionUpdateData.canRedeem = updateData.canRedeem

  if (Object.keys(sessionUpdateData).length > 0) {
    for (const sess of sessionsResult.data || []) {
      await db.collection("TT_sessions").doc(sess._id).update({ data: sessionUpdateData })
    }
  }

  return { ok: true }
}

// 删除子账号
const handleDelete = async (db, user, event) => {
  const { subAccountId } = event
  if (!subAccountId) {
    throw new Error("subAccountId 为必填")
  }

  // 校验子账号存在且归属当前主账号
  const subResult = await db.collection("TT_users").doc(subAccountId).get()
  const subRow = subResult.data?.[0]
  const sub = subRow?.data || subRow
  if (!sub) {
    throw new Error("子账号不存在")
  }
  if ((sub.parentUserId || "") !== user.userId) {
    throw new Error("无权删除此子账号")
  }

  // 归档用户记录
  const raw = subRow.data && typeof subRow.data === "object" ? subRow.data : subRow
  const addResult = await db.collection("TT_archive").add({
    archiveReason: "subaccount_deleted",
    archivedAt: new Date(),
    archivedBy: user.userId,
    subAccount: { ...raw, _originalId: subAccountId },
  })
  if (!addResult.id) {
    throw new Error("归档写入失败，删除操作已中止")
  }

  // 删除用户记录
  await db.collection("TT_users").doc(subAccountId).remove()

  // 清除所有 session
  const _ = db.command
  const sessionsResult = await db.collection("TT_sessions").where(
    _.or([
      { userId: subAccountId },
      { "data.userId": subAccountId },
    ])
  ).limit(100).get()
  for (const sess of sessionsResult.data || []) {
    await db.collection("TT_sessions").doc(sess._id).remove()
  }

  return { ok: true }
}

exports.main = async (event = {}) => {
  const { action, token } = event

  const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
  const db = app.database()

  const user = await verifyToken(db, token)
  if (!user) {
    throw new Error("未登录或登录已过期")
  }
  if (user.role === "sub") {
    throw new Error("子账号无权管理子账号")
  }

  switch (action) {
    case "list":
      return handleList(db, user)
    case "create":
      return handleCreate(db, user, event)
    case "update":
      return handleUpdate(db, user, event)
    case "delete":
      return handleDelete(db, user, event)
    default:
      throw new Error(`未知操作: ${action}`)
  }
}
