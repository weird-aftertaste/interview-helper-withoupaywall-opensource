import { OpenAI } from "openai"

export const resolveOpenAIModel = (
  selectedModel: string | undefined,
  openaiCustomModel?: string,
  openaiBaseUrl?: string
): string => {
  const custom = openaiCustomModel?.trim()
  if (custom) {
    return custom
  }

  const selected = selectedModel || "gpt-4o"
  if (openaiBaseUrl?.trim() && (selected === "gpt-4o" || selected === "gpt-4o-mini")) {
    return "gpt-5.3-codex"
  }

  return selected
}

export const shouldSendOpenAITemperature = (openaiBaseUrl?: string): boolean =>
  !openaiBaseUrl?.trim()

export const buildOpenAIClient = (
  apiKey: string,
  openaiBaseUrl?: string
): OpenAI =>
  new OpenAI({
    apiKey,
    baseURL: openaiBaseUrl?.trim() || undefined,
    timeout: 60000,
    maxRetries: 2,
  })
