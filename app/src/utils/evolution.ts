import type { EvolutionStage } from "../data/beasts"

export const getEvolutionStage = (level: number): EvolutionStage => {
  if (level <= 1) return "egg"
  if (level <= 3) return "baby"
  if (level <= 5) return "juvenile"
  if (level <= 7) return "adult"
  return "ultimate"
}

export const stageNames: Record<EvolutionStage, string> = {
  egg: "蛋",
  baby: "幼年",
  juvenile: "少年",
  adult: "成年",
  ultimate: "究极",
}
