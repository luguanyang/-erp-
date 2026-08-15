declare module '@cloudbase/js-sdk' {
  interface CloudBaseSession {
    session?: unknown
    user?: unknown
    access_token?: string
  }

  interface CloudBaseAuth {
    signInWithPassword(params: {
      username: string
      password: string
    }): Promise<{
      data?: { user?: unknown; session?: CloudBaseSession } | null
      error?: { message?: string } | null
    }>
    getSession(): Promise<{ data?: { session?: CloudBaseSession } | null; error?: unknown }>
    signOut(): Promise<unknown>
  }

  interface CloudBaseApp {
    callFunction(options: {
      name: string
      data?: Record<string, unknown>
    }): Promise<{ result?: unknown }>
    auth: CloudBaseAuth
  }

  const cloudbase: {
    init(options: Record<string, unknown>): CloudBaseApp
  }

  export default cloudbase
}
