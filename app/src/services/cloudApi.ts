import { callCloudFunction } from "../lib/cloudbaseFunctions"
import { useAuthStore } from "../stores/authStore"
import type {
  TTClassGetRequest,
  TTClassDeleteRequest,
  TTClassDeleteResponse,
  TTClassGetResponse,
  TTClassListResponse,
  TTClassUpsertRequest,
  TTClassUpsertResponse,
  TTGroupListRequest,
  TTGroupListResponse,
  TTGroupSaveRequest,
  TTGroupSaveResponse,
  TTHonorsListResponse,
  TTHonorsListRequest,
  TTRecordExportResponse,
  TTRecordListRequest,
  TTRecordListResponse,
  TTRecordSummaryRequest,
  TTRecordSummaryResponse,
  TTRedeemListRequest,
  TTRedeemListResponse,
  TTScoreBatchRequest,
  TTScoreBatchResponse,
  TTScoreRevokeRequest,
  TTScoreRevokeResponse,
  TTSettingsGetRequest,
  TTSettingsGetResponse,
  TTSettingsSaveRequest,
  TTSettingsSaveResponse,
  TTShareCreateRequest,
  TTShareCreateResponse,
  TTShareListResponse,
  TTShareViewRequest,
  TTShareViewResponse,
  TTShopListRequest,
  TTShopListResponse,
  TTShopRedeemRequest,
  TTShopRedeemResponse,
  TTShopSaveRequest,
  TTShopSaveResponse,
  TTStudentDeleteRequest,
  TTStudentDeleteResponse,
  TTStudentListRequest,
  TTStudentListResponse,
  TTStudentUpsertRequest,
  TTStudentUpsertResponse,
  TTSubAccountCreateRequest,
  TTSubAccountCreateResponse,
  TTSubAccountListResponse,
  TTSubAccountUpdateRequest,
  TTWechatStateRequest,
  TTWechatStateResponse,
  TTWechatCallbackRequest,
  TTWechatCallbackResponse,
  TTWechatBindRequest,
  TTWechatBindResponse,
  TTHomeDataRequest,
  TTHomeDataResponse,
} from "../types/api"
import type { UserRole } from "../types"

// ---------------------------------------------------------------------------
// Cache infrastructure
// ---------------------------------------------------------------------------
interface CacheEntry<T> {
  data: T
  expiry: number
}

const cache = new Map<string, CacheEntry<unknown>>()

// Per-function TTL configuration (in seconds)
const CACHE_TTL: Record<string, number> = {
  TT_class_list: 300,      // 5 min – class list rarely changes
  TT_settings_get: 120,    // 2 min – invalidated on save
  TT_student_list: 30,     // 30s – invalidated after score/redeem ops
  TT_shop_list: 120,       // 2 min – invalidated on save
  TT_honors_list: 60,      // 1 min – invalidated after score ops
  TT_class_get: 60,        // 1 min – invalidated after score ops
  TT_redeem_list: 60,      // 1 min – invalidated after redeem ops
  TT_record_summary: 60,   // 1 min – invalidated after score ops
  TT_home_data: 60,        // 1 min – combined class+students; invalidated after mutations
  TT_record_list: 30,      // 30s – invalidated after score ops
}

// Write operation → cache keys to invalidate
const INVALIDATION_MAP: Record<string, string[]> = {
  TT_settings_save: ["TT_settings_get", "TT_home_data"],
  TT_shop_save: ["TT_shop_list"],
  TT_student_upsert: ["TT_student_list", "TT_honors_list", "TT_class_get", "TT_home_data"],
  TT_student_delete: ["TT_student_list", "TT_honors_list", "TT_class_get", "TT_home_data"],
  TT_score_batch: ["TT_student_list", "TT_honors_list", "TT_class_get", "TT_record_list", "TT_record_summary", "TT_home_data"],
  TT_score_revoke: ["TT_student_list", "TT_honors_list", "TT_class_get", "TT_record_list", "TT_record_summary", "TT_home_data"],
  TT_shop_redeem: ["TT_student_list", "TT_redeem_list", "TT_shop_list", "TT_home_data"],
  TT_class_upsert: ["TT_class_list", "TT_class_get", "TT_home_data"],
  TT_class_delete: ["TT_class_list", "TT_home_data"], // + all keys for deleted classId
  TT_group_manage: ["TT_honors_list"], // for save action
}

/**
 * Invalidate all cache entries whose key starts with any of the prefixes
 * mapped to the given function name.
 */
const invalidateCache = (functionName: string) => {
  const prefixes = INVALIDATION_MAP[functionName]
  if (!prefixes) return

  for (const key of cache.keys()) {
    for (const prefix of prefixes) {
      if (key.startsWith(prefix)) {
        cache.delete(key)
        break
      }
    }
  }
}

/**
 * Wrapper around `callCloudFunction` that adds a transparent read-through
 * cache with per-function TTL.  Write operations should NOT use this –
 * they call `callCloudFunction` directly and trigger `invalidateCache`.
 */
const cachedCall = async <TData extends object, TResult>(
  name: string,
  data?: TData,
  skipCache = false
): Promise<TResult> => {
  const ttl = CACHE_TTL[name]
  const shouldCache = ttl && ttl > 0 && !skipCache

  if (shouldCache) {
    const cacheKey = `${name}::${JSON.stringify(data)}`
    const entry = cache.get(cacheKey)

    if (entry && entry.expiry > Date.now()) {
      return entry.data as TResult
    }

    const result = await callCloudFunction<TData, TResult>(name, data)
    cache.set(cacheKey, { data: result, expiry: Date.now() + ttl * 1000 })
    return result
  }

  return callCloudFunction<TData, TResult>(name, data)
}

const getToken = () => useAuthStore.getState().token

export const CloudApi = {
  homeData: async (data?: TTHomeDataRequest) => {
    return cachedCall<TTHomeDataRequest & { token?: string }, TTHomeDataResponse>(
      "TT_home_data",
      { ...data, token: getToken() } as TTHomeDataRequest & { token?: string }
    )
  },
  classGet: async (data?: TTClassGetRequest) => {
    return cachedCall<TTClassGetRequest & { token?: string }, TTClassGetResponse>(
      "TT_class_get",
      { ...data, token: getToken() } as TTClassGetRequest & { token?: string }
    )
  },
  classList: async () => {
    return cachedCall<{ token: string }, TTClassListResponse>("TT_class_list", {
      token: getToken(),
    })
  },
  classUpsert: async (data: TTClassUpsertRequest) => {
    invalidateCache("TT_class_upsert")
    return callCloudFunction<TTClassUpsertRequest & { token: string }, TTClassUpsertResponse>(
      "TT_class_upsert",
      { ...data, token: getToken() }
    )
  },
  classDelete: async (data: TTClassDeleteRequest) => {
    invalidateCache("TT_class_delete")
    return callCloudFunction<TTClassDeleteRequest & { token: string }, TTClassDeleteResponse>(
      "TT_class_delete",
      { ...data, token: getToken() }
    )
  },
  studentList: async (data?: TTStudentListRequest) => {
    return cachedCall<TTStudentListRequest & { token: string }, TTStudentListResponse>(
      "TT_student_list",
      { ...data, token: getToken() } as TTStudentListRequest & { token: string }
    )
  },
  studentUpsert: async (data: TTStudentUpsertRequest) => {
    invalidateCache("TT_student_upsert")
    return callCloudFunction<TTStudentUpsertRequest & { token: string }, TTStudentUpsertResponse>(
      "TT_student_upsert",
      { ...data, token: getToken() }
    )
  },
  studentDelete: async (data: TTStudentDeleteRequest) => {
    invalidateCache("TT_student_delete")
    return callCloudFunction<TTStudentDeleteRequest & { token: string }, TTStudentDeleteResponse>(
      "TT_student_delete",
      { ...data, token: getToken() }
    )
  },
  scoreBatch: async (data: TTScoreBatchRequest) => {
    invalidateCache("TT_score_batch")
    return callCloudFunction<TTScoreBatchRequest & { token: string }, TTScoreBatchResponse>(
      "TT_score_batch",
      { ...data, token: getToken() }
    )
  },
  scoreRevoke: async (data: TTScoreRevokeRequest) => {
    invalidateCache("TT_score_revoke")
    return callCloudFunction<TTScoreRevokeRequest & { token: string }, TTScoreRevokeResponse>(
      "TT_score_revoke",
      { ...data, token: getToken() }
    )
  },
  recordList: async (data: TTRecordListRequest) => {
    return cachedCall<TTRecordListRequest & { token: string }, TTRecordListResponse>(
      "TT_record_list",
      { ...data, token: getToken() }
    )
  },
  recordExport: async () => {
    return callCloudFunction<{ token: string }, TTRecordExportResponse>(
      "TT_record_export",
      { token: getToken() }
    )
  },
  recordSummary: async (data: TTRecordSummaryRequest) => {
    return cachedCall<TTRecordSummaryRequest & { token: string }, TTRecordSummaryResponse>(
      "TT_record_summary",
      { ...data, token: getToken() }
    )
  },
  shopList: async (data?: TTShopListRequest) => {
    return cachedCall<TTShopListRequest & { token: string }, TTShopListResponse>(
      "TT_shop_list",
      { ...data, token: getToken() } as TTShopListRequest & { token: string }
    )
  },
  shopSave: async (data: TTShopSaveRequest) => {
    invalidateCache("TT_shop_save")
    return callCloudFunction<TTShopSaveRequest & { token: string }, TTShopSaveResponse>(
      "TT_shop_save",
      { ...data, token: getToken() }
    )
  },
  shopRedeem: async (data: TTShopRedeemRequest) => {
    invalidateCache("TT_shop_redeem")
    return callCloudFunction<TTShopRedeemRequest & { token: string }, TTShopRedeemResponse>(
      "TT_shop_redeem",
      { ...data, token: getToken() }
    )
  },
  redeemList: async (data: TTRedeemListRequest) => {
    return cachedCall<TTRedeemListRequest & { token: string }, TTRedeemListResponse>(
      "TT_redeem_list",
      { ...data, token: getToken() }
    )
  },
  honorsList: async (data?: TTHonorsListRequest) => {
    return cachedCall<TTHonorsListRequest & { token: string }, TTHonorsListResponse>(
      "TT_honors_list",
      { ...data, token: getToken() } as TTHonorsListRequest & { token: string }
    )
  },
  settingsGet: async (data: TTSettingsGetRequest) => {
    return cachedCall<TTSettingsGetRequest & { token: string }, TTSettingsGetResponse>(
      "TT_settings_get",
      { ...data, token: getToken() }
    )
  },
  settingsSave: async (data: TTSettingsSaveRequest) => {
    invalidateCache("TT_settings_save")
    return callCloudFunction<TTSettingsSaveRequest & { token: string }, TTSettingsSaveResponse>(
      "TT_settings_save",
      { ...data, token: getToken() }
    )
  },
  authRegister: async (data: { username: string; password: string }) => {
    return callCloudFunction<typeof data, { username: string }>(
      "TT_auth_register",
      data
    )
  },
  authActivate: async (data: { username: string; code: string }) => {
    return callCloudFunction<typeof data, {
      token: string
      username: string
      role?: UserRole
      nickname?: string
    }>(
      "TT_auth_activate",
      data
    )
  },
  authReset: async (data: { username: string; code: string; newPassword: string }) => {
    return callCloudFunction<typeof data, {
      token: string
      username: string
      role?: UserRole
      nickname?: string
      canRedeem?: boolean
    }>(
      "TT_auth_reset",
      data
    )
  },
  authLookupUsername: async (data: { code: string }) => {
    return callCloudFunction<{ action: "lookup"; code: string }, { username: string }>(
      "TT_auth_reset",
      { action: "lookup", code: data.code }
    )
  },
  activationStats: async () => {
    return callCloudFunction<{ action: "stats" }, {
      total: number
      used: number
      unused: number
      revoked?: number
      fullLoaded?: number
    }>("TT_activation_admin", { action: "stats" })
  },
  activationList: async (data: {
    page: number
    pageSize: number
    search?: string
    status?: "" | "used" | "unused" | "revoked"
  }) => {
    return callCloudFunction<typeof data & { action: "list" }, {
      records: Record<string, any>[]
      total: number
      page: number
      pageSize: number
    }>("TT_activation_admin", { ...data, action: "list" })
  },
  activationGenerate: async (data: { count: number; batchName: string; expiresAt?: string | null }) => {
    return callCloudFunction<typeof data & { action: "generate" }, {
      count: number
      codes: string[]
      batchName: string
    }>("TT_activation_admin", { ...data, action: "generate" })
  },
  activationClearDevices: async (data: { code: string }) => {
    return callCloudFunction<typeof data & { action: "clearDevices" }, { ok: boolean }>(
      "TT_activation_admin",
      { ...data, action: "clearDevices" }
    )
  },
  activationRevoke: async (data: { code: string }) => {
    return callCloudFunction<typeof data & { action: "revoke" }, { ok: boolean }>(
      "TT_activation_admin",
      { ...data, action: "revoke" }
    )
  },
  authLogin: async (data: { username: string; password: string }) => {
    return callCloudFunction<typeof data, {
      token: string
      username: string
      role: UserRole
      nickname: string
      canRedeem?: boolean
    }>(
      "TT_auth_login",
      data
    )
  },
  authVerify: async (data: { token: string }) => {
    return callCloudFunction<typeof data, {
      ok: boolean
      username?: string
      role?: UserRole
      nickname?: string
      canRedeem?: boolean
      wechatBound?: { nickname: string; avatar: string } | null
    }>(
      "TT_auth_verify",
      data
    )
  },
  authLogout: async (data: { token: string }) => {
    return callCloudFunction<typeof data, { ok: boolean }>("TT_auth_logout", data)
  },
  wechatState: async (data: TTWechatStateRequest) => {
    return callCloudFunction<TTWechatStateRequest, TTWechatStateResponse>(
      "TT_wechat_state",
      data
    )
  },
  wechatCallback: async (data: TTWechatCallbackRequest) => {
    return callCloudFunction<TTWechatCallbackRequest, TTWechatCallbackResponse>(
      "TT_wechat_callback",
      data
    )
  },
  wechatBind: async (data: TTWechatBindRequest) => {
    return callCloudFunction<TTWechatBindRequest, TTWechatBindResponse>(
      "TT_wechat_bind",
      data
    )
  },
  // ---- 进度分享 ----
  shareCreate: async (data: TTShareCreateRequest) => {
    return callCloudFunction<TTShareCreateRequest & { token: string; action: "create" }, TTShareCreateResponse>(
      "TT_share_create",
      { ...data, token: getToken(), action: "create" }
    )
  },
  shareList: async () => {
    return callCloudFunction<{ token: string; action: "list" }, TTShareListResponse>(
      "TT_share_create",
      { token: getToken(), action: "list" }
    )
  },
  shareRevoke: async (data: { shareToken: string }) => {
    return callCloudFunction<typeof data & { token: string; action: "revoke" }, { ok: boolean }>(
      "TT_share_create",
      { ...data, token: getToken(), action: "revoke" }
    )
  },
  shareView: async (data: TTShareViewRequest) => {
    return callCloudFunction<TTShareViewRequest, TTShareViewResponse>(
      "TT_share_view",
      data
    )
  },
  // ---- 小组管理 ----
  groupList: async (data: TTGroupListRequest) => {
    return callCloudFunction<TTGroupListRequest & { token: string; action: "list" }, TTGroupListResponse>(
      "TT_group_manage",
      { ...data, token: getToken(), action: "list" }
    )
  },
  groupSave: async (data: TTGroupSaveRequest) => {
    invalidateCache("TT_group_manage")
    return callCloudFunction<TTGroupSaveRequest & { token: string; action: "save" }, TTGroupSaveResponse>(
      "TT_group_manage",
      { ...data, token: getToken(), action: "save" }
    )
  },
  // ---- 子账号管理 ----
  subAccountList: async () => {
    return callCloudFunction<{ token: string; action: "list" }, TTSubAccountListResponse>(
      "TT_subaccount_manage",
      { token: getToken(), action: "list" }
    )
  },
  subAccountCreate: async (data: TTSubAccountCreateRequest) => {
    return callCloudFunction<TTSubAccountCreateRequest & { token: string; action: "create" }, TTSubAccountCreateResponse>(
      "TT_subaccount_manage",
      { ...data, token: getToken(), action: "create" }
    )
  },
  subAccountUpdate: async (data: TTSubAccountUpdateRequest) => {
    return callCloudFunction<TTSubAccountUpdateRequest & { token: string; action: "update" }, { ok: boolean }>(
      "TT_subaccount_manage",
      { ...data, token: getToken(), action: "update" }
    )
  },
  subAccountDelete: async (data: { subAccountId: string }) => {
    return callCloudFunction<typeof data & { token: string; action: "delete" }, { ok: boolean }>(
      "TT_subaccount_manage",
      { ...data, token: getToken(), action: "delete" }
    )
  },
  opsOverview: async () => {
    return callCloudFunction<Record<string, never>, {
      stats: {
        totalUsers: number
        activatedUsers: number
        totalClasses: number
        totalStudents: number
      }
      dailyStats: Array<{
        date: string
        newUsers: number
        newActivated: number
        newClasses: number
        newStudents: number
      }>
      users: Array<{
        userId: string
        username: string
        role: string
        parentUserId: string | null
        activated: boolean
        createdAt: string | null
        activatedAt: string | null
        lastLoginAt: string | null
        classCount: number
        totalStudents: number
        classes: Array<{
          id: string
          name: string
          studentCount: number
          createdAt: string | null
        }>
      }>
    }>("TT_ops_overview")
  },
  _clearCache: () => {
    cache.clear()
  },
}
