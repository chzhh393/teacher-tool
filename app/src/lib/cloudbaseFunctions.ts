import { cloudbaseApp, isCloudbaseConfigured } from "./cloudbase"

// DEV ONLY: Extend Window interface for call counter
declare global {
  interface Window {
    __cfCallLog?: Array<{ name: string; data: unknown; timestamp: number }>
    __cfCallCount?: Record<string, number>
    __cfReset?: () => void
  }
}

// DEV ONLY: Initialize cloud function call counter
// This code is tree-shaken in production builds
if (import.meta.env.DEV) {
  window.__cfCallLog = []
  window.__cfCallCount = {}
  window.__cfReset = () => {
    window.__cfCallLog = []
    window.__cfCallCount = {}
    console.log("[CF] Counter reset")
  }
}

// Request deduplication: coalesce identical in-flight calls into one Promise
const inflightRequests = new Map<string, Promise<unknown>>()

export const callCloudFunction = async <TData extends object, TResult>(
  name: string,
  data?: TData
) => {
  if (!isCloudbaseConfigured || !cloudbaseApp) {
    throw new Error("Cloudbase 未配置")
  }

  const dedupKey = `${name}::${JSON.stringify(data)}`
  const inflight = inflightRequests.get(dedupKey)
  if (inflight) {
    return inflight as Promise<TResult>
  }

  const request = (async () => {
    // DEV ONLY: Count calls (only counted once per deduped group)
    if (import.meta.env.DEV) {
      window.__cfCallLog!.push({ name, data, timestamp: Date.now() })
      window.__cfCallCount![name] = (window.__cfCallCount![name] || 0) + 1
      const count = window.__cfCallCount![name]
      console.log(`[CF] ${name} (第${count}次)`)
    }

    const response = await cloudbaseApp.callFunction({
      name,
      data: data ?? {},
    })

    return response.result as TResult
  })()

  inflightRequests.set(dedupKey, request)
  request.finally(() => inflightRequests.delete(dedupKey))

  return request
}
