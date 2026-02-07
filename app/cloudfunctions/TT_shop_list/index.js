const tcb = require("tcb-admin-node")

exports.main = async (event = {}) => {
  const { classId } = event
  const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
  const db = app.database()

  // 获取全部，内存过滤（避免 where 对 data 嵌套的兼容问题）
  const result = await db.collection("TT_shop_items").limit(1000).get()
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
