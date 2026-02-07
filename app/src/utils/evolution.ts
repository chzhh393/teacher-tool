import type { EvolutionStage } from "../data/beasts"

export const getEvolutionStage = (level: number): EvolutionStage => {
  if (level <= 2) return "egg"
  if (level <= 4) return "baby"
  if (level <= 6) return "juvenile"
  if (level <= 8) return "adult"
  return "ultimate"
}

export const stageNames: Record<EvolutionStage, string> = {
  egg: "蛋",
  baby: "幼年",
  juvenile: "少年",
  adult: "成年",
  ultimate: "究极",
}
