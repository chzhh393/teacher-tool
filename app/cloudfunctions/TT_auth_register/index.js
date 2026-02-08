const tcb = require("tcb-admin-node")
const bcrypt = require("bcryptjs")

const USERNAME_REG = /^[A-Za-z0-9_]{6,}$/

const unwrap = (row) => (row?.data ? row.data : row)

exports.main = async (event = {}) => {
  const { username, password } = event
  if (!username || !password) {
    throw new Error("username 与 password 为必填")
  }
  if (!USERNAME_REG.test(username)) {
    throw new Error("用户名格式不正确")
  }
  if (String(password).length < 6) {
    throw new Error("密码至少 6 位")
  }

  const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
  const db = app.database()
  const now = new Date()

  const existResult = await db.collection("TT_users").get()
  const exist = (existResult.data || [])
    .map((row) => unwrap(row))
    .find((row) => row && row.username === username)
  if (exist) {
    throw new Error("用户名已存在")
  }

  const passwordHash = await bcrypt.hash(String(password), 10)
  const userId = `user-${Date.now()}`

  await db.collection("TT_users").doc(userId).set({
    data: {
      _id: userId,
      username,
      passwordHash,
      activated: false,
      activatedAt: null,
      role: "main",
      nickname: username,
      parentUserId: null,
      authorizedClassIds: [],
      createdAt: now,
      updatedAt: now,
    },
  })

  return { username }
}
