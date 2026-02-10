import type {
  ClassInfo,
  ClassSettings,
  ClassSummary,
  Group,
  RedeemRecord,
  ScoreRecord,
  ShopItem,
  Student,
} from "./index"

export interface TTClassGetResponse {
  classSummary: ClassSummary
}

export interface TTClassGetRequest {
  classId?: string
}

export interface TTClassListResponse {
  classes: ClassInfo[]
}

export interface TTClassUpsertRequest {
  classInfo: ClassInfo
}

export interface TTClassUpsertResponse {
  classInfo: ClassInfo
}

export interface TTClassDeleteRequest {
  classId: string
}

export interface TTClassDeleteResponse {
  ok: boolean
}

export interface TTStudentListResponse {
  students: Student[]
}

export interface TTStudentListRequest {
  classId?: string
}

export interface TTStudentUpsertRequest {
  student: Student
}

export interface TTStudentUpsertResponse {
  student: Student
}

export interface TTStudentDeleteRequest {
  studentId: string
}

export interface TTStudentDeleteResponse {
  ok: boolean
}

export interface TTScoreBatchRequest {
  classId: string
  studentIds: string[]
  ruleId: string
  ruleName?: string
  score: number
}

export interface TTScoreBatchResponse {
  updatedStudentIds: string[]
}

export interface TTScoreRevokeRequest {
  recordId: string
}

export interface TTScoreRevokeResponse {
  ok: boolean
}

export interface TTRecordListRequest {
  classId?: string
  page?: number
  pageSize?: number
  studentName?: string
}

export interface TTRecordListResponse {
  records: ScoreRecord[]
  total: number
}

export interface TTRecordExportResponse {
  csvUrl: string
}

export interface TTShopListRequest {
  classId?: string
}

export interface TTShopListResponse {
  items: ShopItem[]
}

export interface TTShopSaveRequest {
  classId: string
  items: ShopItem[]
}

export interface TTShopSaveResponse {
  ok: boolean
}

export interface TTShopRedeemRequest {
  studentId: string
  itemId: string
  classId?: string
}

export interface TTShopRedeemResponse {
  redeemRecord: RedeemRecord
}

export interface TTRedeemListRequest {
  classId?: string
  page?: number
  pageSize?: number
}

export interface TTRedeemListResponse {
  records: RedeemRecord[]
  total: number
}

export interface GroupRankItem {
  group: { id: string; name: string; color?: string; memberIds: string[] }
  totalEarnedScore: number
  memberCount: number
  members: Array<{ id: string; name: string; earnedScore: number }>
}

export interface TTHonorsListResponse {
  ranks: Student[]
  groupRanks?: GroupRankItem[]
}

export interface TTHonorsListRequest {
  classId?: string
}

// ---- 小组管理 ----

export interface TTGroupListRequest {
  classId: string
}

export interface TTGroupListResponse {
  groups: Group[]
}

export interface TTGroupSaveRequest {
  classId: string
  groups: Group[]
}

export interface TTGroupSaveResponse {
  ok: boolean
}

export interface TTSettingsGetRequest {
  classId?: string
}

export interface TTSettingsGetResponse {
  settings: ClassSettings | null
}

export interface TTSettingsSaveRequest {
  classId: string
  settings: ClassSettings
}

export interface TTSettingsSaveResponse {
  ok: boolean
}

// ---- 子账号管理 ----

export interface TTSubAccountListResponse {
  subAccounts: Array<{
    id: string
    username: string
    nickname: string
    authorizedClassIds: string[]
    canRedeem?: boolean
    createdAt?: string
  }>
}

export interface TTSubAccountCreateRequest {
  username: string
  password: string
  nickname: string
  authorizedClassIds: string[]
  canRedeem?: boolean
}

export interface TTSubAccountCreateResponse {
  subAccount: {
    id: string
    username: string
    nickname: string
    authorizedClassIds: string[]
    canRedeem?: boolean
  }
}

export interface TTSubAccountUpdateRequest {
  subAccountId: string
  nickname?: string
  password?: string
  authorizedClassIds?: string[]
  canRedeem?: boolean
}

export interface TTSubAccountDeleteRequest {
  subAccountId: string
}

// ---- 微信登录 ----

export interface TTWechatStateRequest {
  purpose: "login" | "bind"
  token?: string
}

export interface TTWechatStateResponse {
  authUrl: string
  state: string
}

export interface TTWechatCallbackRequest {
  code: string
  state: string
}

export interface TTWechatCallbackResponse {
  action: "login" | "need_bind" | "bind_success"
  token?: string
  username?: string
  tempToken?: string
  wechatNickname?: string
  wechatAvatar?: string
}

export interface TTWechatBindRequest {
  tempToken: string
  username: string
  password: string
}

export interface TTWechatBindResponse {
  token: string
  username: string
}

// ---- 进度分享 ----

export interface TTShareCreateRequest {
  type: "class" | "student"
  classId: string
  studentId?: string
}

export interface TTShareCreateResponse {
  shareToken: string
  shareUrl: string
  expiresAt: string
}

export interface TTShareListResponse {
  shares: Array<{
    token: string
    type: "class" | "student"
    className: string
    studentName?: string | null
    createdAt: string
    expiresAt: string
    revoked: boolean
  }>
}

export interface TTShareViewRequest {
  shareToken: string
}

export interface TTShareViewClassData {
  type: "class"
  className: string
  systemName: string
  students: Array<{
    name: string
    beastId?: string | null
    beastName?: string | null
    level: number
    totalScore: number
    earnedScore: number
    badges: number
    progress: number
    collectedBeasts?: string[]
  }>
}

export interface TTShareViewStudentData {
  type: "student"
  className: string
  systemName: string
  student: {
    name: string
    beastId?: string | null
    beastName?: string | null
    level: number
    totalScore: number
    earnedScore: number
    availableScore: number
    badges: number
    progress: number
    collectedBeasts?: string[]
  }
  recentRecords: Array<{
    ruleName: string
    score: number
    type: "add" | "subtract"
    createdAt: string
  }>
  levelThresholds: number[]
}

export type TTShareViewResponse =
  | TTShareViewClassData
  | TTShareViewStudentData
  | { error: string }
