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

exports.main = async (event = {}) => {
  const { classId, items } = event
  if (!classId || !Array.isArray(items)) {
    throw new Error("classId 和 items 为必填")
  }

  const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
  const db = app.database()

  // 1. 验证 token
  const user = await verifyToken(db, event.token)
  if (!user) {
    throw new Error("未登录或登录已过期")
  }

  // 2. 子账号不能编辑小卖部
  if (user.role === "sub") {
    throw new Error("子账号无权编辑小卖部")
  }

  // 3. 验证班级所有权
  const classResult = await db.collection("TT_classes").doc(classId).get()
  const classDoc = classResult.data?.[0]
  if (!classDoc) {
    throw new Error("未找到班级")
  }
  const classRaw = classDoc.data || classDoc
  if (classRaw.userId !== user.userId) {
    throw new Error("无权编辑该班级的小卖部")
  }

  // 4. 保存商品逻辑（保持原有逻辑）
  const now = new Date()

  // 获取该班级的现有商品
  const _ = db.command
  const result = await db.collection("TT_shop_items").where(
    _.or([{ classId }, { "data.classId": classId }])
  ).limit(1000).get()
  const existing = (result.data || [])
    .map((doc) => {
      const d = doc.data || doc
      return { _id: doc._id, classId: d.classId }
    })

  const existingIds = new Set(existing.map((doc) => doc._id))
  const newIds = new Set(items.map((item) => item.id))

  // 删除不在新列表中的商品
  for (const doc of existing) {
    if (!newIds.has(doc._id)) {
      await db.collection("TT_shop_items").doc(doc._id).remove()
    }
  }

  // 更新或创建商品
  for (let i = 0; i < items.length; i++) {
    const { id, ...itemData } = items[i]
    const payload = { ...itemData, classId, order: i, updatedAt: now }

    if (existingIds.has(id)) {
      await db.collection("TT_shop_items").doc(id).update({ data: payload })
    } else {
      await db.collection("TT_shop_items").add({ data: { ...payload, createdAt: now } })
    }
  }

  return { ok: true }
}
