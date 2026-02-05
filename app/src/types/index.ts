export type DinosaurStage = "egg" | "baby" | "juvenile" | "adult" | "king"

export interface Dinosaur {
  id: string
  name: string
  englishName: string
  category: "carnivore" | "herbivore" | "pterosaur" | "marine"
  description: string
  images: Record<DinosaurStage, string>
}

export interface Student {
  id: string
  name: string
  beastId?: string
  beastName?: string
  dinosaurId?: string
  dinosaurName?: string
  level: number
  totalScore: number
  availableScore: number
  badges: number
  progress: number
  lastScoreTime?: string
  order?: number
  classId?: string
}

export interface ScoreRule {
  id: string
  name: string
  score: number
  icon: string
  pinyin: string
  order: number
  type: "add" | "subtract"
}

export interface ShopItem {
  id: string
  name: string
  description: string
  cost: number
  icon: string
  type: "physical" | "privilege" | "decoration"
  stock: number
  limitPerStudent: number
  order: number
}

export interface ScoreRecord {
  id: string
  classId: string
  studentId: string
  studentName: string
  ruleId: string
  ruleName: string
  type: "add" | "subtract" | "revoke"
  score: number
  createdAt: string
  revoked?: boolean
}

export interface RedeemRecord {
  id: string
  classId: string
  studentId: string
  studentName: string
  itemId: string
  itemName: string
  cost: number
  status: "pending" | "completed"
  createdAt: string
}

export interface ClassSettings {
  id?: string
  classId?: string
  systemName: string
  themeColor: string
  levelThresholds: number[]
  scoreRules: ScoreRule[]
}

export interface ClassInfo {
  id: string
  name: string
  settingsId?: string
}

export interface ClassSummary {
  id: string
  name: string
  studentCount: number
  totalBadges: number
  averageLevel: number
  totalScore: number
}
