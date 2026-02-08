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
  TTHonorsListResponse,
  TTHonorsListRequest,
  TTRecordExportResponse,
  TTRecordListRequest,
  TTRecordListResponse,
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
} from "../types/api"
import type { UserRole } from "../types"

const getToken = () => useAuthStore.getState().token

export const CloudApi = {
  classGet: async (data?: TTClassGetRequest) => {
    return callCloudFunction<TTClassGetRequest & { token?: string }, TTClassGetResponse>(
      "TT_class_get",
      { ...data, token: getToken() } as TTClassGetRequest & { token?: string }
    )
  },
  classList: async () => {
    return callCloudFunction<{ token: string }, TTClassListResponse>("TT_class_list", {
      token: getToken(),
    })
  },
  classUpsert: async (data: TTClassUpsertRequest) => {
    return callCloudFunction<TTClassUpsertRequest & { token: string }, TTClassUpsertResponse>(
      "TT_class_upsert",
      { ...data, token: getToken() }
    )
  },
  classDelete: async (data: TTClassDeleteRequest) => {
    return callCloudFunction<TTClassDeleteRequest & { token: string }, TTClassDeleteResponse>(
      "TT_class_delete",
      { ...data, token: getToken() }
    )
  },
  studentList: async (data?: TTStudentListRequest) => {
    return callCloudFunction<TTStudentListRequest & { token: string }, TTStudentListResponse>(
      "TT_student_list",
      { ...data, token: getToken() } as TTStudentListRequest & { token: string }
    )
  },
  studentUpsert: async (data: TTStudentUpsertRequest) => {
    return callCloudFunction<TTStudentUpsertRequest & { token: string }, TTStudentUpsertResponse>(
      "TT_student_upsert",
      { ...data, token: getToken() }
    )
  },
  studentDelete: async (data: TTStudentDeleteRequest) => {
    return callCloudFunction<TTStudentDeleteRequest & { token: string }, TTStudentDeleteResponse>(
      "TT_student_delete",
      { ...data, token: getToken() }
    )
  },
  scoreBatch: async (data: TTScoreBatchRequest) => {
    return callCloudFunction<TTScoreBatchRequest & { token: string }, TTScoreBatchResponse>(
      "TT_score_batch",
      { ...data, token: getToken() }
    )
  },
  scoreRevoke: async (data: TTScoreRevokeRequest) => {
    return callCloudFunction<TTScoreRevokeRequest & { token: string }, TTScoreRevokeResponse>(
      "TT_score_revoke",
      { ...data, token: getToken() }
    )
  },
  recordList: async (data: TTRecordListRequest) => {
    return callCloudFunction<TTRecordListRequest & { token: string }, TTRecordListResponse>(
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
  shopList: async (data?: TTShopListRequest) => {
    return callCloudFunction<TTShopListRequest & { token: string }, TTShopListResponse>(
      "TT_shop_list",
      { ...data, token: getToken() } as TTShopListRequest & { token: string }
    )
  },
  shopSave: async (data: TTShopSaveRequest) => {
    return callCloudFunction<TTShopSaveRequest & { token: string }, TTShopSaveResponse>(
      "TT_shop_save",
      { ...data, token: getToken() }
    )
  },
  shopRedeem: async (data: TTShopRedeemRequest) => {
    return callCloudFunction<TTShopRedeemRequest & { token: string }, TTShopRedeemResponse>(
      "TT_shop_redeem",
      { ...data, token: getToken() }
    )
  },
  redeemList: async (data: TTRedeemListRequest) => {
    return callCloudFunction<TTRedeemListRequest & { token: string }, TTRedeemListResponse>(
      "TT_redeem_list",
      { ...data, token: getToken() }
    )
  },
  honorsList: async (data?: TTHonorsListRequest) => {
    return callCloudFunction<TTHonorsListRequest & { token: string }, TTHonorsListResponse>(
      "TT_honors_list",
      { ...data, token: getToken() } as TTHonorsListRequest & { token: string }
    )
  },
  settingsGet: async (data: TTSettingsGetRequest) => {
    return callCloudFunction<TTSettingsGetRequest & { token: string }, TTSettingsGetResponse>(
      "TT_settings_get",
      { ...data, token: getToken() }
    )
  },
  settingsSave: async (data: TTSettingsSaveRequest) => {
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
}
