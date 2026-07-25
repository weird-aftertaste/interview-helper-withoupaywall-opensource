import { describe, expect, it } from "vitest"
import {
  buildDebugPrompt,
  buildExtractionPrompt,
  buildSolutionPrompt,
} from "../../../electron/processing/promptBuilders"
import { parseBiotechSolutionResponse } from "../../../electron/processing/responseParsers"

describe("biotech workflow", () => {
  it("extracts scientific context without coding instructions", () => {
    const prompt = buildExtractionPrompt(
      "python",
      "The interviewer asked about assay controls",
      "biotech"
    )

    expect(prompt.systemPrompt).toContain("biotechnology")
    expect(prompt.systemPrompt).toContain("uncertainties")
    expect(prompt.userPrompt).toContain("assay")
    expect(prompt.userPrompt).not.toContain("coding language")
  })

  it("requests a structured, evidence-aware biotech answer", () => {
    const prompt = buildSolutionPrompt(
      {
        problem_statement: "How would you validate this biomarker?",
        key_entities: ["biomarker"],
        uncertainties: ["cohort size"],
      },
      "python",
      "biotech"
    )

    expect(prompt).toContain("How would you validate this biomarker?")
    expect(prompt).toContain('"evidence"')
    expect(prompt).toContain('"caveats"')
    expect(prompt).toContain("Do not fabricate")
  })

  it("builds a scientific review prompt for follow-up screenshots", () => {
    const prompt = buildDebugPrompt(
      { problem_statement: "Interpret the dose-response curve" },
      "python",
      "biotech"
    )

    expect(prompt.systemPrompt).toContain("### Revised Answer")
    expect(prompt.systemPrompt).toContain("### Evidence and Assumptions")
    expect(prompt.userPrompt).toContain("controls")
  })

  it("parses biotech answer JSON into the shared solution payload", () => {
    const result = parseBiotechSolutionResponse(
      JSON.stringify({
        answer: "Use orthogonal analytical and clinical validation.",
        key_points: ["Define intended use", "Pre-specify acceptance criteria"],
        evidence: "The screenshot identifies the candidate marker.",
        caveats: "An independent cohort is still required.",
      })
    )

    expect(result).toMatchObject({
      workflow: "biotech",
      code: "Use orthogonal analytical and clinical validation.",
      evidence: "The screenshot identifies the candidate marker.",
      caveats: "An independent cohort is still required.",
    })
    expect(result?.thoughts).toHaveLength(2)
  })

  it("rejects malformed biotech responses", () => {
    expect(parseBiotechSolutionResponse("not json")).toBeNull()
    expect(parseBiotechSolutionResponse('{"key_points":[]}')).toBeNull()
  })
})
