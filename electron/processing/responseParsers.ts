import type { DebugResponsePayload, ProcessingProblemInfo } from "./types"

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const extractJsonCandidate = (responseText: string): string => {
  const fencedMatch = responseText.match(/```\s*[A-Za-z0-9_-]*\s*\n([\s\S]*?)```/)
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim()
  }
  return responseText.trim()
}

export const parseProblemInfoResponse = (
  responseText: string
): ProcessingProblemInfo | null => {
  try {
    const jsonText = extractJsonCandidate(responseText)
    const parsed = JSON.parse(jsonText) as unknown
    if (!isPlainObject(parsed)) {
      return null
    }
    return parsed as ProcessingProblemInfo
  } catch {
    return null
  }
}

export const normalizeDebugContent = (debugContent: string): string => {
  if (debugContent.includes("# ") || debugContent.includes("## ")) {
    return debugContent
  }

  return debugContent
    .replace(/^[ ]*(?:issues identified|problems found|bugs found)[ ]*$/gim, "## Issues Identified")
    .replace(/^[ ]*(?:code improvements|improvements|suggested changes)[ ]*$/gim, "## Code Improvements")
    .replace(/^[ ]*(?:optimizations|performance improvements)[ ]*$/gim, "## Optimizations")
    .replace(/^[ ]*(?:explanation|detailed analysis)[ ]*$/gim, "## Explanation")
}

export const extractThoughts = (content: string): string[] => {
  const bulletPoints = content.match(/(?:^|\n)[ ]*(?:[-*•]|\d+\.)[ ]+([^\n]+)/g)
  if (!bulletPoints) {
    return ["Debug analysis based on your screenshots"]
  }
  return bulletPoints
    .map((point) => point.replace(/^[ ]*(?:[-*•]|\d+\.)[ ]+/, "").trim())
    .slice(0, 5)
}

export const buildDebugResponse = (
  extractedCode: string,
  debugContent: string
): DebugResponsePayload => {
  const formattedDebugContent = normalizeDebugContent(debugContent)
  const thoughts = extractThoughts(formattedDebugContent)

  return {
    code: extractedCode,
    debug_analysis: formattedDebugContent,
    thoughts,
    time_complexity: "N/A - Debug mode",
    space_complexity: "N/A - Debug mode",
  }
}
