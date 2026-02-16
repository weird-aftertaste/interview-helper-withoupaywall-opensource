export type ProcessingProvider = "openai" | "gemini" | "anthropic"

export interface ProcessingProblemInfo {
  problem_statement?: string
  constraints?: string
  example_input?: string
  example_output?: string
  [key: string]: unknown
}

export interface PromptBundle {
  systemPrompt: string
  userPrompt: string
}

export interface DebugResponsePayload {
  code: string
  debug_analysis: string
  thoughts: string[]
  time_complexity: string
  space_complexity: string
}

export interface GeminiMessage {
  role: string
  parts: Array<{
    text?: string
    inlineData?: {
      mimeType: string
      data: string
    }
  }>
}

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string
      }>
    }
    finishReason: string
  }>
}
