import type {
  ClassInfo,
  ClassSettings,
  ClassSummary,
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

export interface TTHonorsListResponse {
  ranks: Student[]
}

export interface TTHonorsListRequest {
  classId?: string
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
