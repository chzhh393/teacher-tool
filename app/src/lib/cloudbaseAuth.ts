import { cloudbaseAuth, isCloudbaseConfigured } from "./cloudbase"

export const signInAnonymously = async () => {
  if (!isCloudbaseConfigured || !cloudbaseAuth) {
    return null
  }

  const loginState = await cloudbaseAuth.getLoginState()
  if (loginState) {
    return loginState
  }

  return cloudbaseAuth.signInAnonymously()
}
