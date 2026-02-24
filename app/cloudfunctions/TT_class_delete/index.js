const tcb = require("tcb-admin-node")

// 验证 token 并返回用户信息
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
  const groups = await readAll(db, "TT_groups", cond)

  let settings = null
  try {
    const settingsResult = await db.collection("TT_settings").doc(`settings-${classId}`).get()
    const settingsDoc = (settingsResult.data || [])[0]
    if (settingsDoc) settings = unwrap(settingsDoc)
  } catch (_e) { /* 设置可能不存在 */ }

  // 5. 写入归档文档（大数据量时分片，避免超出 16MB 单文档限制）
  const CHUNK_SIZE = 5000
  const scoreChunks = []
  for (let i = 0; i < scoreRecords.length; i += CHUNK_SIZE) {
    scoreChunks.push(scoreRecords.slice(i, i + CHUNK_SIZE))
  }

  const archiveDoc = {
    classId,
    className: classRaw.name || classRaw.className || "",
    archivedAt: now,
    archiveReason: "class_deleted",
    archivedBy: user.userId,
    class: unwrap(classDoc),
    students: students.map(unwrap),
    scoreRecords: scoreChunks.length <= 1 ? scoreRecords.map(unwrap) : [],
    scoreRecordChunks: scoreChunks.length > 1 ? scoreChunks.length : 0,
    redeemRecords: redeemRecords.map(unwrap),
    shopItems: shopItems.map(unwrap),
    shares: shares.map(unwrap),
    groups: groups.map(unwrap),
    settings,
  }

  const addResult = await db.collection("TT_archive").add(archiveDoc)
  if (!addResult.id) {
    throw new Error("归档写入失败，删除操作已中止")
  }

  // 积分记录过多时分片写入子文档
  if (scoreChunks.length > 1) {
    for (let i = 0; i < scoreChunks.length; i++) {
      await db.collection("TT_archive").add({
        parentArchiveId: addResult.id,
        classId,
        chunkIndex: i,
        chunkType: "scoreRecords",
        archivedAt: now,
        records: scoreChunks[i].map(unwrap),
      })
    }
  }

  // 6. 物理删除所有关联数据
  const studentsDeleted = await removeAll(db, "TT_students", cond)
  const recordsDeleted = await removeAll(db, "TT_score_records", cond)
  const redeemDeleted = await removeAll(db, "TT_redeem_records", cond)
  const shopDeleted = await removeAll(db, "TT_shop_items", cond)
  const sharesDeleted = await removeAll(db, "TT_shares", cond)
  const groupsDeleted = await removeAll(db, "TT_groups", cond)

  try {
    await db.collection("TT_settings").doc(`settings-${classId}`).remove()
  } catch (_e) { /* 设置可能不存在 */ }

  // 7. 清理子账号中对该班级的授权引用
  try {
    const subAccounts = await readAll(db, "TT_users", _.or([
      { parentUserId: user.userId },
      { "data.parentUserId": user.userId },
    ]))
    for (const sub of subAccounts) {
      const raw = sub.data && typeof sub.data === "object" ? sub.data : sub
      const ids = raw.authorizedClassIds || []
      if (ids.includes(classId)) {
        const newIds = ids.filter((id) => id !== classId)
        await db.collection("TT_users").doc(sub._id).update({
          data: { authorizedClassIds: newIds },
        })
      }
    }
  } catch (_e) { /* 子账号清理失败不阻断主流程 */ }

  // 8. 删除班级本身
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
      groups: groups.length,
    },
    deleted: {
      students: studentsDeleted,
      scoreRecords: recordsDeleted,
      redeemRecords: redeemDeleted,
      shopItems: shopDeleted,
      shares: sharesDeleted,
      groups: groupsDeleted,
    },
  }
}
