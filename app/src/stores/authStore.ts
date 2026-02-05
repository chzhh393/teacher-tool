import { create } from "zustand"

interface AuthState {
  token: string
  username: string
  status: "checking" | "authed" | "guest"
  setAuth: (token: string, username: string) => void
  clearAuth: () => void
  setStatus: (status: AuthState["status"]) => void
}

const getStored = () => {
  if (typeof window === "undefined") {
    return { token: "", username: "" }
  }
  return {
    token: localStorage.getItem("tt-auth-token") || "",
    username: localStorage.getItem("tt-auth-username") || "",
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  ...getStored(),
  status: "checking",
  setAuth: (token, username) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("tt-auth-token", token)
      localStorage.setItem("tt-auth-username", username)
    }
    set({ token, username, status: "authed" })
  },
  clearAuth: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("tt-auth-token")
      localStorage.removeItem("tt-auth-username")
    }
    set({ token: "", username: "", status: "guest" })
  },
  setStatus: (status) => set({ status }),
}))
