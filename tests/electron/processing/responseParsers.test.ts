import { describe, expect, it } from "vitest"
import {
  buildDebugResponse,
  extractThoughts,
  normalizeDebugContent,
  parseProblemInfoResponse,
} from "../../../electron/processing/responseParsers"

describe("processing response parsers", () => {
  it("parses JSON from markdown code blocks with uppercase language tag", () => {
    const parsed = parseProblemInfoResponse("```JSON\n{\"problem_statement\":\"Two Sum\"}\n```")

    expect(parsed).toEqual({ problem_statement: "Two Sum" })
  })

  it("returns null for non-object parsed JSON", () => {
    expect(parseProblemInfoResponse("[]")).toBeNull()
  })

  it("normalizes section headings at line starts", () => {
    const normalized = normalizeDebugContent(
      "issues identified\n- one\ncode improvements\n- two"
    )

    expect(normalized).toContain("## Issues Identified")
    expect(normalized).toContain("## Code Improvements")
  })

  it("extracts up to five bullet thoughts", () => {
    const thoughts = extractThoughts("- one\n- two\n- three\n- four\n- five\n- six")
    expect(thoughts).toHaveLength(5)
    expect(thoughts[0]).toBe("one")
  })

  it("builds debug payload with normalized content", () => {
    const payload = buildDebugResponse("print('x')", "issues identified\n- fix loop")
    expect(payload.code).toBe("print('x')")
    expect(payload.debug_analysis).toContain("## Issues Identified")
    expect(payload.time_complexity).toBe("N/A - Debug mode")
  })
})
