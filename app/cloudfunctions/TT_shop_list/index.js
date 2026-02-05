const tcb = require("tcb-admin-node")

exports.main = async () => {
  const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
  const db = app.database()

  const result = await db.collection("TT_shop_items").orderBy("order", "asc").get()

  return {
    items: result.data ?? [],
  }
}
