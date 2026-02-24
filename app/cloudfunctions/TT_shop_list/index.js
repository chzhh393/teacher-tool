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
  const { classId } = event
  const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
  const db = app.database()

  // 1. 验证 token
  const user = await verifyToken(db, event.token)
  if (!user) {
    throw new Error("未登录或登录已过期")
  }

  // 2. 如果提供了 classId，验证访问权限
  if (classId) {
    const classResult = await db.collection("TT_classes").doc(classId).get()
    const classDoc = classResult.data?.[0]
    if (!classDoc) {
      throw new Error("未找到班级")
    }
    const classRaw = classDoc.data || classDoc

    // 主账号：验证班级所有权
    if (user.role === "main") {
      if (classRaw.userId !== user.userId) {
        throw new Error("无权访问该班级的小卖部")
      }
    }
    // 子账号：验证授权班级列表
    else if (user.role === "sub") {
      if (!user.authorizedClassIds.includes(classId)) {
        throw new Error("无权访问该班级的小卖部")
      }
    }
  }

  // 3. 获取商品列表（保持原有逻辑）
  const _ = db.command
  const query = classId
    ? _.or([{ classId }, { "data.classId": classId }])
    : null
  const result = query
    ? await db.collection("TT_shop_items").where(query).limit(1000).get()
    : await db.collection("TT_shop_items").limit(1000).get()
  const allItems = (result.data || []).map((doc) => {
    const d = doc.data || doc
    return { ...d, id: doc._id || d.id }
  })

  // 按 classId 过滤
  const items = classId
    ? allItems.filter((item) => item.classId === classId)
    : allItems

  items.sort((a, b) => (a.order || 0) - (b.order || 0))
  return { items }
}
