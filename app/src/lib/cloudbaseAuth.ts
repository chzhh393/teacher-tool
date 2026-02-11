import { cloudbaseAuth, isCloudbaseConfigured } from "./cloudbase"

// Singleton cache for anonymous login state
let cachedLoginState: unknown | null = null
let loginPromise: Promise<unknown> | null = null

export const signInAnonymously = async () => {
  if (!isCloudbaseConfigured || !cloudbaseAuth) {
    return null
  }

  // Return cached state if available
  if (cachedLoginState) {
    return cachedLoginState
  }

  // Return existing promise if login is in progress
  if (loginPromise) {
    return loginPromise
  }

  // Check existing login state
  const loginState = await cloudbaseAuth.getLoginState()
  if (loginState) {
    cachedLoginState = loginState
    return loginState
  }

  // Create new login promise and cache it
  loginPromise = cloudbaseAuth.signInAnonymously().then((result) => {
    cachedLoginState = result
    loginPromise = null
    return result
  }).catch((error) => {
    loginPromise = null
    throw error
  })

  return loginPromise
}

// Clear cache (useful for logout scenarios)
export const clearAnonymousLoginCache = () => {
  cachedLoginState = null
  loginPromise = null
}
