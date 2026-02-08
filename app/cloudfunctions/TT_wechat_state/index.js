const tcb = require("tcb-admin-node")
const crypto = require("crypto")

const WECHAT_APP_ID = "wxc0d50d63443ddd8a"
const REDIRECT_URI = "https://cloud1-3g9mi825a3a27f25-1368265332.tcloudbaseapp.com/"

const unwrap = (row) => (row?.data ? row.data : row)

const findSession = async (db, token) => {
  let result = await db.collection("TT_sessions").where({ token }).limit(1).get()
  let session = (result.data || [])[0]
  if (!session) {
    result = await db.collection("TT_sessions").where({ "data.token": token }).limit(1).get()
    session = (result.data || [])[0]
  }
  return session ? unwrap(session) : null
}

exports.main = async (event = {}) => {
  const { purpose, token } = event

  if (!purpose || !["login", "bind"].includes(purpose)) {
    throw new Error("purpose 必须为 login 或 bind")
  }

  const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
  const db = app.database()
  const now = new Date()

  let userId = null

  // 1. 绑定场景需要验证当前登录态
  if (purpose === "bind") {
    if (!token) {
      throw new Error("绑定微信需要登录")
    }
    const session = await findSession(db, token)
    if (!session || (session.expiredAt && new Date(session.expiredAt).getTime() < Date.now())) {
      throw new Error("登录已过期，请重新登录")
    }
    userId = session.userId
  }

  // 2. 生成随机 state
  const state = crypto.randomBytes(16).toString("hex")

  // 3. 存入 TT_wechat_states 集合
  await db.collection("TT_wechat_states").add({
    data: {
      state,
      purpose,
      userId,
      createdAt: now,
      expiredAt: new Date(now.getTime() + 1000 * 60 * 5),
    },
  })

  // 4. 拼接微信授权 URL
  const authUrl =
    "https://open.weixin.qq.com/connect/qrconnect" +
    "?appid=" + WECHAT_APP_ID +
    "&redirect_uri=" + encodeURIComponent(REDIRECT_URI) +
    "&response_type=code" +
    "&scope=snsapi_login" +
    "&state=" + state +
    "#wechat_redirect"

  return { authUrl, state }
}
