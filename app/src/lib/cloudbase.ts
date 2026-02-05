import cloudbase from "@cloudbase/js-sdk"

import { env } from "../config/env"

export const cloudbaseConfig = {
  env: env.tcbEnvId,
  region: env.tcbRegion,
}

export const isCloudbaseConfigured = Boolean(env.tcbEnvId) && Boolean(env.tcbRegion)

export const cloudbaseApp = isCloudbaseConfigured
  ? cloudbase.init(cloudbaseConfig)
  : null

export const cloudbaseAuth = cloudbaseApp ? cloudbaseApp.auth() : null
