import { create } from "zustand"
import type { UserRole } from "../types"

interface AuthState {
  token: string
  username: string
  role: UserRole
  nickname: string
  canRedeem: boolean
  status: "checking" | "authed" | "guest"
  setAuth: (token: string, username: string, role?: UserRole, nickname?: string, canRedeem?: boolean) => void
  clearAuth: () => void
  setStatus: (status: AuthState["status"]) => void
  isSubAccount: () => boolean
}

const getStored = () => {
  if (typeof window === "undefined") {
    return { token: "", username: "", role: "main" as UserRole, nickname: "", canRedeem: false }
  }
  return {
    token: localStorage.getItem("tt-auth-token") || "",
    username: localStorage.getItem("tt-auth-username") || "",
    role: (localStorage.getItem("tt-auth-role") || "main") as UserRole,
    nickname: localStorage.getItem("tt-auth-nickname") || "",
    canRedeem: localStorage.getItem("tt-auth-canRedeem") === "true",
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  ...getStored(),
  status: "checking",
  setAuth: (token, username, role = "main", nickname = username, canRedeem = false) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("tt-auth-token", token)
      localStorage.setItem("tt-auth-username", username)
      localStorage.setItem("tt-auth-role", role)
      localStorage.setItem("tt-auth-nickname", nickname)
      localStorage.setItem("tt-auth-canRedeem", String(canRedeem))
    }
    set({ token, username, role, nickname, canRedeem, status: "authed" })
  },
  clearAuth: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("tt-auth-token")
      localStorage.removeItem("tt-auth-username")
      localStorage.removeItem("tt-auth-role")
      localStorage.removeItem("tt-auth-nickname")
      localStorage.removeItem("tt-auth-canRedeem")
    }
    set({ token: "", username: "", role: "main", nickname: "", canRedeem: false, status: "guest" })
  },
  setStatus: (status) => set({ status }),
  isSubAccount: () => get().role === "sub",
}))
