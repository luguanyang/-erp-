import cloudbase from '@cloudbase/js-sdk'

const env = import.meta.env.VITE_CLOUDBASE_ENV_ID || ''
const region = import.meta.env.VITE_CLOUDBASE_REGION || 'ap-shanghai'
const accessKey = import.meta.env.VITE_CLOUDBASE_ACCESS_KEY || ''

const options: Record<string, unknown> = {
  env,
  region,
  auth: { detectSessionInUrl: true },
}
if (accessKey) options.accessKey = accessKey

export const app = cloudbase.init(options)
export const auth = app.auth

export async function callAdmin<T>(data: object): Promise<T> {
  const res = await app.callFunction({
    name: 'admin',
    data: data as Record<string, unknown>,
  })
  const result = res?.result
  if (typeof result !== 'object' || result === null) {
    throw new Error('云函数返回异常')
  }
  const payload = result as { success?: boolean; data?: unknown; errMsg?: string }
  if (payload.success !== true) {
    throw new Error(payload.errMsg || '请求失败')
  }
  return payload.data as T
}
