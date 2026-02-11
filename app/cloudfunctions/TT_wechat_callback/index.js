const tcb = require("tcb-admin-node")
const crypto = require("crypto")
const https = require("https")

const WECHAT_APP_ID = "wxc0d50d63443ddd8a"
const WECHAT_APP_SECRET = "001628b923b52174b47fb0686924bdde"

const unwrap = (row) => (row?.data ? row.data : row)

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = ""
      res.on("data", (chunk) => { data += chunk })
      res.on("end", () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          reject(new Error("微信接口返回异常"))
        }
      })
    }).on("error", reject)
  })
}

exports.main = async (event = {}) => {
  const { code, state } = event

  if (!code || !state) {
    throw new Error("code 和 state 为必填")
  }

  const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
  const db = app.database()
  const now = new Date()

  // 1. 验证 state
  let stateResult = await db.collection("TT_wechat_states").where({ state }).limit(1).get()
  let stateRow = (stateResult.data || [])[0]
  if (!stateRow) {
    stateResult = await db.collection("TT_wechat_states").where({ "data.state": state }).limit(1).get()
    stateRow = (stateResult.data || [])[0]
  }
  if (!stateRow) {
    throw new Error("无效的授权请求")
  }

  const stateDoc = unwrap(stateRow)

  // 检查过期
  if (stateDoc.expiredAt && new Date(stateDoc.expiredAt).getTime() < Date.now()) {
    throw new Error("授权已过期，请重新扫码")
  }

  // 删除已使用的 state（一次性使用）
  await db.collection("TT_wechat_states").doc(stateRow._id).remove()

  // 2. 用 code 换取 access_token
  const tokenUrl =
    "https://api.weixin.qq.com/sns/oauth2/access_token" +
    "?appid=" + WECHAT_APP_ID +
    "&secret=" + WECHAT_APP_SECRET +
    "&code=" + code +
    "&grant_type=authorization_code"

  const tokenResult = await httpsGet(tokenUrl)

  if (tokenResult.errcode) {
    throw new Error("微信授权失败: " + (tokenResult.errmsg || tokenResult.errcode))
  }

  const { access_token, openid, unionid } = tokenResult

  // 3. 获取微信用户信息
  const userInfoUrl =
    "https://api.weixin.qq.com/sns/userinfo" +
    "?access_token=" + access_token +
    "&openid=" + openid

  const wechatUser = await httpsGet(userInfoUrl)

  const nickname = wechatUser.nickname || ""
  const avatar = wechatUser.headimgurl || ""
  const wechatUnionId = wechatUser.unionid || unionid || ""

  // 4. 根据 purpose 分流处理
  const { purpose, userId } = stateDoc

  if (purpose === "bind") {
    // ---- 场景 A：设置页绑定 ----
    return await handleBind(db, userId, openid, wechatUnionId, nickname, avatar, now)
  }

  // ---- 场景 B/C：登录页扫码 ----
  return await handleLogin(db, openid, wechatUnionId, nickname, avatar, now)
}

async function handleBind(db, userId, openid, unionId, nickname, avatar, now) {
  const _ = db.command
  // 检查 openid 是否已被其他账号绑定
  const existResult = await db
    .collection("TT_users")
    .where(_.or([{ wechatOpenId: openid }, { "data.wechatOpenId": openid }]))
    .limit(10)
    .get()
  const existingUser = (existResult.data || []).map((r) => unwrap(r)).find((u) => u && u.wechatOpenId === openid)

  if (existingUser && existingUser._id !== userId) {
    throw new Error("此微信已绑定其他账号")
  }

  // 查找当前用户
  const userResult = await db.collection("TT_users").doc(userId).get()
  const userRow = (userResult.data || [])[0]
  if (!userRow) {
    throw new Error("用户不存在")
  }
  const user = unwrap(userRow)

  // 写入微信字段
  await db.collection("TT_users").doc(userId).update({
    data: {
      wechatOpenId: openid,
      wechatUnionId: unionId,
      wechatNickname: nickname,
      wechatAvatar: avatar,
      wechatBoundAt: now,
      updatedAt: now,
    },
  })

  return { action: "bind_success", username: user.username }
}

async function handleLogin(db, openid, unionId, nickname, avatar, now) {
  const _ = db.command
  // 在 TT_users 中查找已绑定此 openid 的用户
  const result = await db
    .collection("TT_users")
    .where(_.or([{ wechatOpenId: openid }, { "data.wechatOpenId": openid }]))
    .limit(10)
    .get()
  const user = (result.data || []).map((r) => unwrap(r)).find((u) => u && u.wechatOpenId === openid)

  if (user) {
    // 场景 B：已绑定用户，直接登录
    if (user.activated === false) {
      throw new Error("账号未激活")
    }

    const token = crypto.randomBytes(24).toString("hex")
    await db.collection("TT_sessions").add({
      data: {
        token,
        userId: user._id,
        username: user.username,
        createdAt: now,
        expiredAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30),
      },
    })

    return { action: "login", token, username: user.username }
  }

  // 场景 C：未绑定，需要绑定已有账号
  const tempToken = crypto.randomBytes(16).toString("hex")
  await db.collection("TT_wechat_temps").add({
    data: {
      tempToken,
      openId: openid,
      unionId,
      nickname,
      avatar,
      createdAt: now,
      expiredAt: new Date(now.getTime() + 1000 * 60 * 10),
    },
  })

  return { action: "need_bind", tempToken, wechatNickname: nickname, wechatAvatar: avatar }
}
