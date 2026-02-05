import { Navigate, Outlet } from "react-router-dom"

import { useAuthStore } from "../stores/authStore"

const RequireAuth = () => {
  const { status } = useAuthStore()

  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-text-tertiary">
        加载中...
      </div>
    )
  }

  if (status === "guest") {
    return <Navigate to="/auth" replace />
  }

  return <Outlet />
}

export default RequireAuth
