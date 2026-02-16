import type { ProcessingProvider } from "./types"

export interface ProviderErrorShape {
  status?: number
  message?: string
  response?: {
    status?: number
    data?: {
      error?: {
        message?: string
      }
    }
  }
}

export const asProviderError = (error: unknown): ProviderErrorShape => {
  if (typeof error === "object" && error !== null) {
    return error as ProviderErrorShape
  }
  return {}
}

export const formatProviderError = (
  provider: ProcessingProvider,
  error: unknown,
  context: string
): string => {
  const providerError = asProviderError(error)
  const status =
    typeof providerError.status === "number"
      ? providerError.status
      : typeof providerError.response?.status === "number"
        ? providerError.response.status
        : undefined
  const message =
    providerError.message ||
    providerError.response?.data?.error?.message ||
    "Unknown error"
  const statusPart = status !== undefined ? ` (status ${status})` : ""
  return `[${provider}] ${context} failed${statusPart}: ${message}`
}

export const getErrorMessage = (error: unknown, fallback: string): string => {
  const providerError = asProviderError(error)
  return providerError.message || fallback
}
