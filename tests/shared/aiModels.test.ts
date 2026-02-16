import { describe, expect, it, vi } from "vitest"
import {
  ALLOWED_MODELS,
  DEFAULT_MODELS,
  sanitizeModelSelection
} from "../../shared/aiModels"

describe("sanitizeModelSelection", () => {
  it("returns provided model when model is allowed", () => {
    const allowedModel = ALLOWED_MODELS.openai[0]
    expect(
      sanitizeModelSelection(allowedModel, "openai", "solutionModel")
    ).toBe(allowedModel)
  })

  it("falls back to provider default when model is invalid", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined)

    expect(
      sanitizeModelSelection("not-a-real-model", "gemini", "debuggingModel")
    ).toBe(DEFAULT_MODELS.gemini.debuggingModel)

    warnSpy.mockRestore()
  })

  it("logs a warning when model is invalid", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined)

    sanitizeModelSelection("invalid", "anthropic", "answerModel")

    expect(warnSpy).toHaveBeenCalledTimes(1)
    warnSpy.mockRestore()
  })
})
