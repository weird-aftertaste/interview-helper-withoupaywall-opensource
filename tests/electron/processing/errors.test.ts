import { describe, expect, it } from "vitest"
import {
  asProviderError,
  formatProviderError,
  getErrorMessage,
} from "../../../electron/processing/errors"

describe("processing errors", () => {
  it("maps non-object unknown error to empty shape", () => {
    expect(asProviderError("boom")).toEqual({})
  })

  it("formats response status and nested message", () => {
    const error = {
      response: {
        status: 429,
        data: {
          error: {
            message: "quota",
          },
        },
      },
    }

    expect(formatProviderError("openai", error, "Processing screenshots")).toBe(
      "[openai] Processing screenshots failed (status 429): quota"
    )
  })

  it("formats status zero explicitly when provided", () => {
    const error = {
      status: 0,
      message: "transport",
    }

    expect(formatProviderError("gemini", error, "Network")).toContain(
      "(status 0)"
    )
  })

  it("falls back to unknown message text", () => {
    expect(formatProviderError("anthropic", {}, "Parse")).toBe(
      "[anthropic] Parse failed: Unknown error"
    )
  })

  it("returns fallback message when provider error lacks message", () => {
    expect(getErrorMessage({}, "default")).toBe("default")
  })
})
