const tcb = require("tcb-admin-node")

exports.main = async (event = {}) => {
  const { classId, items } = event
  if (!classId || !Array.isArray(items)) {
    throw new Error("classId 和 items 为必填")
  }

  const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
  const db = app.database()
  const now = new Date()

  // 1. 获取该班级的现有商品
  const result = await db.collection("TT_shop_items").limit(1000).get()
  const existing = (result.data || [])
    .map((doc) => {
      const d = doc.data || doc
      return { _id: doc._id, classId: d.classId }
    })
    .filter((doc) => doc.classId === classId)

  const existingIds = new Set(existing.map((doc) => doc._id))
  const newIds = new Set(items.map((item) => item.id))

  // 2. 删除不在新列表中的商品
  for (const doc of existing) {
    if (!newIds.has(doc._id)) {
      await db.collection("TT_shop_items").doc(doc._id).remove()
    }
  }

  // 3. 更新或创建商品
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
