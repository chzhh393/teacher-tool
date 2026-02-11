const tcb = require("tcb-admin-node")
const bcrypt = require("bcryptjs")
const crypto = require("crypto")

const unwrap = (row) => (row?.data ? row.data : row)

exports.main = async (event = {}) => {
  const { username, password } = event
  if (!username || !password) {
    throw new Error("username 与 password 为必填")
  }

  const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
  const db = app.database()
  const now = new Date()

  const _ = db.command
  const result = await db
    .collection("TT_users")
    .where(_.or([{ username }, { "data.username": username }]))
    .limit(10)
    .get()
  const user = (result.data || []).map((row) => unwrap(row)).find((row) => row && row.username === username)
  if (!user) {
    throw new Error("用户不存在")
  }

  const match = await bcrypt.compare(String(password), user.passwordHash || "")
  if (!match) {
    throw new Error("密码错误")
  }

  if (user.activated === false) {
    throw new Error("账号未激活")
  }

  // 子账号登录时检查主账号是否仍然有效
  const userRole = user.role || "main"
  if (userRole === "sub" && user.parentUserId) {
    const parentResult = await db.collection("TT_users").doc(user.parentUserId).get()
    const parentRow = parentResult.data?.[0]
    const parent = parentRow?.data || parentRow
    if (!parent || parent.activated === false) {
      throw new Error("主账号已停用，子账号无法登录")
    }
  }

  const nickname = user.nickname || user.username
  const authorizedClassIds = user.authorizedClassIds || []
  const canRedeem = user.canRedeem || false

  // 更新用户最后登录时间
  await db.collection("TT_users").doc(user._id).update({ data: { lastLoginAt: now } })

  const token = crypto.randomBytes(24).toString("hex")
  await db.collection("TT_sessions").add({
    data: {
      token,
      userId: user._id,
      username: user.username,
      role: userRole,
      nickname,
      authorizedClassIds,
      canRedeem,
      createdAt: now,
      expiredAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30),
    },
  })

  return { token, username: user.username, role: userRole, nickname, canRedeem }
}
