interface Window {
  __IS_INITIALIZED__: boolean
  __CREDITS__: number
  __LANGUAGE__: string
  __AUTH_TOKEN__: string | null
  supabase: unknown
  electron: {
    ipcRenderer: {
      on: (channel: string, func: (...args: unknown[]) => void) => void
      removeListener: (channel: string, func: (...args: unknown[]) => void) => void
    }
  }
  electronAPI: import("./electron").ElectronAPI
}
