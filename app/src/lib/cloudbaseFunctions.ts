import { cloudbaseApp, isCloudbaseConfigured } from "./cloudbase"

export const callCloudFunction = async <TData extends object, TResult>(
  name: string,
  data?: TData
) => {
  if (!isCloudbaseConfigured || !cloudbaseApp) {
    throw new Error("Cloudbase 未配置")
  }

  const response = await cloudbaseApp.callFunction({
    name,
    data: data ?? {},
  })

  return response.result as TResult
}
