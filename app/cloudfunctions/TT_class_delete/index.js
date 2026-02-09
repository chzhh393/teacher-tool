const tcb = require("tcb-admin-node")

// 验证 token 并返回用户信息
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

// 读取集合中所有匹配记录（分页）
const readAll = async (db, collection, condition) => {
  const PAGE = 1000
  const all = []
  let offset = 0
  while (true) {
    const result = await db.collection(collection).where(condition).skip(offset).limit(PAGE).get()
    const rows = result.data || []
    if (!rows.length) break
    all.push(...rows)
    offset += PAGE
  }
  return all
}

// 解包记录
const unwrap = (record) => {
  const raw = record.data && typeof record.data === "object" ? record.data : record
  return { ...raw, _originalId: record._id }
}

// 批量删除（where().remove() 单次最多删 100 条，需循环）
const removeAll = async (db, collection, condition) => {
  let total = 0
  while (true) {
    const res = await db.collection(collection).where(condition).remove()
    const deleted = res.deleted || 0
    if (deleted === 0) break
    total += deleted
  }
  return total
}

exports.main = async (event = {}) => {
  const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
  const db = app.database()

  // 1. 验证 token
  const user = await verifyToken(db, event.token)
  if (!user) {
    throw new Error("未登录或登录已过期")
  }

  // 2. 子账号不能删除班级
  if (user.role === "sub") {
    throw new Error("子账号无权删除班级")
  }

  if (!event.classId) {
    throw new Error("classId 为必填")
  }

  // 3. 验证班级所有权
  const classResult = await db.collection("TT_classes").doc(event.classId).get()
  const classDoc = classResult.data?.[0]
  if (!classDoc) {
    throw new Error("未找到班级")
  }
  const classRaw = classDoc.data || classDoc
  if (classRaw.userId !== user.userId) {
    throw new Error("无权删除该班级")
  }

  const _ = db.command
  const classId = event.classId
  const now = new Date()
  const cond = _.or([{ classId }, { "data.classId": classId }])

  // 4. 读取所有关联数据
  const students = await readAll(db, "TT_students", cond)
  const scoreRecords = await readAll(db, "TT_score_records", cond)
  const redeemRecords = await readAll(db, "TT_redeem_records", cond)
  const shopItems = await readAll(db, "TT_shop_items", cond)
  const shares = await readAll(db, "TT_shares", cond)

  let settings = null
  try {
    const settingsResult = await db.collection("TT_class_settings").doc(`settings-${classId}`).get()
    const settingsDoc = (settingsResult.data || [])[0]
    if (settingsDoc) settings = unwrap(settingsDoc)
  } catch (_e) { /* 设置可能不存在 */ }

  // 5. 一次性写入归档文档（单条文档，所有数据打包为数组）
  const archiveDoc = {
    classId,
    className: classRaw.name || classRaw.className || "",
    archivedAt: now,
    archiveReason: "class_deleted",
    archivedBy: user.userId,
    class: unwrap(classDoc),
    students: students.map(unwrap),
    scoreRecords: scoreRecords.map(unwrap),
    redeemRecords: redeemRecords.map(unwrap),
    shopItems: shopItems.map(unwrap),
    shares: shares.map(unwrap),
    settings,
  }

  const addResult = await db.collection("TT_archive").add(archiveDoc)
  if (!addResult.id) {
    throw new Error("归档写入失败，删除操作已中止")
  }

  // 6. 物理删除所有关联数据
  const studentsDeleted = await removeAll(db, "TT_students", cond)
  const recordsDeleted = await removeAll(db, "TT_score_records", cond)
  const redeemDeleted = await removeAll(db, "TT_redeem_records", cond)
  const shopDeleted = await removeAll(db, "TT_shop_items", cond)
  const sharesDeleted = await removeAll(db, "TT_shares", cond)

  try {
    await db.collection("TT_class_settings").doc(`settings-${classId}`).remove()
  } catch (_e) { /* 设置可能不存在 */ }

  // 7. 删除班级本身
  await db.collection("TT_classes").doc(classId).remove()

  return {
    ok: true,
    archiveId: addResult.id,
    archived: {
      students: students.length,
      scoreRecords: scoreRecords.length,
      redeemRecords: redeemRecords.length,
      shopItems: shopItems.length,
      shares: shares.length,
    },
    deleted: {
      students: studentsDeleted,
      scoreRecords: recordsDeleted,
      redeemRecords: redeemDeleted,
      shopItems: shopDeleted,
      shares: sharesDeleted,
    },
  }
}
