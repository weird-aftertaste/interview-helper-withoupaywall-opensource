export interface CandidateProfile {
  name?: string
  resume?: string
  jobDescription?: string
}

export interface ProcessingPayload {
  problem_statement?: string
  constraints?: string
  example_input?: string
  example_output?: string
  code?: string
  thoughts?: string[]
  time_complexity?: string
  space_complexity?: string
  debug_analysis?: string
  [key: string]: unknown
}

export interface UpdateInfoPayload {
  [key: string]: unknown
}

export interface AppConfig {
  apiKey: string
  model: string
  language?: string
  opacity?: number
  apiProvider?: "openai" | "gemini" | "anthropic"
  extractionModel?: string
  solutionModel?: string
  debuggingModel?: string
  answerModel?: string
  answerSystemPrompt?: string
  speechRecognitionModel?: string
  transcriptionProvider?: "openai" | "gemini" | "groq"
  openaiBaseUrl?: string
  openaiCustomModel?: string
  groqApiKey?: string
  groqWhisperModel?: string
  candidateProfile?: CandidateProfile
}

export type AppConfigUpdate = Partial<AppConfig>

export interface ConversationMessage {
  id: string
  speaker: "interviewer" | "interviewee"
  text: string
  timestamp: number
  edited?: boolean
}

export interface ElectronAPI {
  openSubscriptionPortal: (authData: {
    id: string
    email: string
  }) => Promise<{ success: boolean; error?: string }>
  updateContentDimensions: (dimensions: {
    width: number
    height: number
  }) => Promise<void>
  clearStore: () => Promise<{ success: boolean; error?: string }>
  getScreenshots: () => Promise<Array<{ path: string; preview: string }>>
  deleteScreenshot: (
    path: string
  ) => Promise<{ success: boolean; error?: string }>
  onScreenshotTaken: (
    callback: (data: { path: string; preview: string }) => void
  ) => () => void
  onResetView: (callback: () => void) => () => void
  onSolutionStart: (callback: () => void) => () => void
  onDebugStart: (callback: () => void) => () => void
  onDebugSuccess: <T = ProcessingPayload>(callback: (data: T) => void) => () => void
  onSolutionError: (callback: (error: string) => void) => () => void
  onProcessingNoScreenshots: (callback: () => void) => () => void
  onProblemExtracted: <T = ProcessingPayload>(callback: (data: T) => void) => () => void
  onSolutionSuccess: <T = ProcessingPayload>(callback: (data: T) => void) => () => void
  onUnauthorized: (callback: () => void) => () => void
  onDebugError: (callback: (error: string) => void) => () => void
  openExternal: (url: string) => void
  toggleMainWindow: () => Promise<{ success: boolean; error?: string }>
  triggerScreenshot: () => Promise<{ success: boolean; error?: string }>
  triggerProcessScreenshots: () => Promise<{ success: boolean; error?: string }>
  triggerReset: () => Promise<{ success: boolean; error?: string }>
  triggerMoveLeft: () => Promise<{ success: boolean; error?: string }>
  triggerMoveRight: () => Promise<{ success: boolean; error?: string }>
  triggerMoveUp: () => Promise<{ success: boolean; error?: string }>
  triggerMoveDown: () => Promise<{ success: boolean; error?: string }>
  onSubscriptionUpdated: (callback: () => void) => () => void
  onSubscriptionPortalClosed: (callback: () => void) => () => void
  startUpdate: () => Promise<{ success: boolean; error?: string }>
  installUpdate: () => void
  onUpdateAvailable: <T = UpdateInfoPayload>(callback: (info: T) => void) => () => void
  onUpdateDownloaded: <T = UpdateInfoPayload>(callback: (info: T) => void) => () => void

  decrementCredits: () => Promise<void>
  setInitialCredits: (credits: number) => Promise<void>
  onCreditsUpdated: (callback: (credits: number) => void) => () => void
  onOutOfCredits: (callback: () => void) => () => void
  openSettingsPortal: () => Promise<void>
  getPlatform: () => string
  onShowSettings: (callback: () => void) => () => void

  getConfig: () => Promise<AppConfig>
  updateConfig: (config: AppConfigUpdate) => Promise<boolean>
  checkApiKey: () => Promise<boolean>
  validateApiKey: (apiKey: string) => Promise<{ valid: boolean; error?: string }>
  openLink: (url: string) => void
  onApiKeyInvalid: (callback: () => void) => () => void
  removeListener: (eventName: string, callback: (...args: unknown[]) => void) => void
  onDeleteLastScreenshot: (callback: () => void) => () => void
  deleteLastScreenshot: () => Promise<{ success: boolean; error?: string }>

  transcribeAudio: (audioBuffer: ArrayBuffer, mimeType: string) => Promise<{ success: boolean; result?: { text: string; language?: string }; error?: string }>
  addConversationMessage: (text: string, speaker?: ConversationMessage["speaker"]) => Promise<{ success: boolean; message?: ConversationMessage; error?: string }>
  toggleSpeaker: () => Promise<{ success: boolean; speaker?: ConversationMessage["speaker"]; error?: string }>
  getConversation: () => Promise<{ success: boolean; messages: ConversationMessage[]; error?: string }>
  clearConversation: () => Promise<{ success: boolean; error?: string }>
  updateConversationMessage: (messageId: string, newText: string) => Promise<{ success: boolean; error?: string }>
  getAnswerSuggestions: (question: string, screenshotContext?: string, candidateProfile?: unknown) => Promise<{ success: boolean; suggestions?: { suggestions: string[]; reasoning: string }; error?: string }>
  onConversationMessageAdded: (callback: (message: ConversationMessage) => void) => () => void
  onSpeakerChanged: (callback: (speaker: ConversationMessage["speaker"]) => void) => () => void
  onConversationMessageUpdated: (callback: (message: ConversationMessage) => void) => () => void
  onConversationCleared: (callback: () => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
    electron: {
      ipcRenderer: {
        on: (channel: string, func: (...args: unknown[]) => void) => void
        removeListener: (
          channel: string,
          func: (...args: unknown[]) => void
        ) => void
      }
    }
    __CREDITS__: number
    __LANGUAGE__: string
    __IS_INITIALIZED__: boolean
    __AUTH_TOKEN__?: string | null
  }
}
