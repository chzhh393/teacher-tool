import { create } from "zustand"

interface ClassState {
  classId: string
  className: string
  setClass: (id: string, name: string) => void
  clearClass: () => void
}

const getStored = () => {
  if (typeof window === "undefined") {
    return { classId: "", className: "" }
  }
  return {
    classId: localStorage.getItem("tt-class-id") || "",
    className: localStorage.getItem("tt-class-name") || "",
  }
}

export const useClassStore = create<ClassState>((set) => ({
  ...getStored(),
  setClass: (id, name) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("tt-class-id", id)
      localStorage.setItem("tt-class-name", name)
    }
    set({ classId: id, className: name })
  },
  clearClass: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("tt-class-id")
      localStorage.removeItem("tt-class-name")
    }
    set({ classId: "", className: "" })
  },
}))
