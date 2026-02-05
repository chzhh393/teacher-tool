export const themeTokens = {
  pink: { primary: "#FFB6C1", secondary: "#E6E6FA", soft: "#FFF3F8" },
  lavender: { primary: "#E6E6FA", secondary: "#FFB6C1", soft: "#F6F1FF" },
  mint: { primary: "#98FB98", secondary: "#87CEEB", soft: "#F1FFF6" },
  lemon: { primary: "#FFFACD", secondary: "#FFB6C1", soft: "#FFFDF1" },
  sky: { primary: "#87CEEB", secondary: "#E6E6FA", soft: "#F1F8FF" },
  coral: { primary: "#FF7F50", secondary: "#FFB6C1", soft: "#FFF3EA" },
}

export type ThemeKey = keyof typeof themeTokens

export const applyTheme = (theme: ThemeKey | string) => {
  if (typeof document === "undefined") return
  const token = themeTokens[theme as ThemeKey] || themeTokens.coral
  const root = document.documentElement
  root.style.setProperty("--tt-primary", token.primary)
  root.style.setProperty("--tt-secondary", token.secondary)
  root.style.setProperty("--tt-soft", token.soft)
}
