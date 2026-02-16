import { describe, expect, it } from "vitest"
import {
  buildDebugPrompt,
  buildExtractionPrompt,
  buildSolutionPrompt,
} from "../../../electron/processing/promptBuilders"

describe("processing prompt builders", () => {
  it("includes conversation context in extraction prompt when provided", () => {
    const prompt = buildExtractionPrompt("python", "interviewer asked about edge cases")

    expect(prompt.userPrompt).toContain("conversation context")
    expect(prompt.userPrompt).toContain("python")
  })

  it("builds solution prompt with defaults when fields are missing", () => {
    const prompt = buildSolutionPrompt({}, "typescript")

    expect(prompt).toContain("PROBLEM STATEMENT")
    expect(prompt).not.toContain("undefined")
    expect(prompt).toContain("LANGUAGE: typescript")
  })

  it("contains required debug analysis sections", () => {
    const { systemPrompt, userPrompt } = buildDebugPrompt(
      { problem_statement: "Two Sum" },
      "python"
    )

    expect(systemPrompt).toContain("### Issues Identified")
    expect(systemPrompt).toContain("### Key Points")
    expect(userPrompt).toContain("Two Sum")
    expect(userPrompt).toContain("python")
  })
})
