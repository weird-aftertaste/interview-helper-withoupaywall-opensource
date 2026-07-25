import type { ProcessingProblemInfo, PromptBundle } from "./types"
import type { Workflow } from "../../shared/workflows"

export const buildExtractionPrompt = (
  language: string,
  conversationContext?: string | null,
  workflow: Workflow = "coding"
): PromptBundle => {
  if (workflow === "biotech") {
    const conversationSection = conversationContext
      ? `\n\nConversation context:\n${conversationContext}`
      : ""

    return {
      systemPrompt:
        "You are a biotechnology interview and scientific problem interpreter. Read the screenshots carefully and extract the question without inventing facts. Return only valid JSON with these fields: problem_statement, task_type, scientific_context, key_entities, evidence_in_screenshot, uncertainties. Use strings for text fields and arrays for key_entities and uncertainties.",
      userPrompt:
        `Extract the biotech, biopharma, life-sciences, or laboratory question from these screenshots. Preserve units, gene/protein/drug names, assay details, study design, and quantitative values. Distinguish information visible in the screenshots from assumptions. Return only JSON.${conversationSection}`,
    }
  }

  const baseSystemPrompt =
    "You are a coding challenge interpreter. Analyze the screenshot of the coding problem and extract all relevant information. Return the information in JSON format with these fields: problem_statement, constraints, example_input, example_output. Just return the structured JSON without any other text."

  const baseUserPrompt =
    "Extract the coding problem details from these screenshots. Return in JSON format."

  const conversationSection = conversationContext
    ? ` Consider the following conversation context:\n\n${conversationContext}\n\n`
    : " "

  const systemPrompt = conversationContext
    ? baseSystemPrompt.replace(
        "Return the information",
        "Consider the conversation context provided. Return the information"
      )
    : baseSystemPrompt

  const userPrompt = `${baseUserPrompt}${conversationSection}Preferred coding language we gonna use for this problem is ${language}.`

  return {
    systemPrompt,
    userPrompt,
  }
}

export const buildSolutionPrompt = (
  problemInfo: ProcessingProblemInfo,
  language: string,
  workflow: Workflow = "coding"
): string => {
  if (workflow === "biotech") {
    return `
Develop an interview-ready response to this biotechnology question.

QUESTION:
${problemInfo.problem_statement || "No question was extracted."}

TASK TYPE:
${problemInfo.task_type || "Not specified."}

SCIENTIFIC CONTEXT:
${problemInfo.scientific_context || "No additional context provided."}

KEY ENTITIES:
${JSON.stringify(problemInfo.key_entities || [])}

EVIDENCE VISIBLE IN THE SCREENSHOT:
${problemInfo.evidence_in_screenshot || "No explicit evidence extracted."}

UNCERTAINTIES:
${JSON.stringify(problemInfo.uncertainties || [])}

Return only valid JSON with this exact shape:
{
  "answer": "A concise but substantive interview-ready answer",
  "key_points": ["3-6 important reasoning points"],
  "evidence": "What supports the answer, clearly separating screenshot facts from domain knowledge or assumptions",
  "caveats": "Limitations, safety/quality considerations, and the most useful follow-up experiment or question"
}

Use precise scientific language. Do not fabricate citations, experimental results, patient data, or regulatory claims. Flag uncertainty and avoid presenting medical advice as a diagnosis or treatment recommendation.
`
  }

  return `
Generate a detailed solution for the following coding problem:

PROBLEM STATEMENT:
${problemInfo.problem_statement || "No problem statement provided."}

CONSTRAINTS:
${problemInfo.constraints || "No specific constraints provided."}

EXAMPLE INPUT:
${problemInfo.example_input || "No example input provided."}

EXAMPLE OUTPUT:
${problemInfo.example_output || "No example output provided."}

LANGUAGE: ${language}

I need the response in the following format:
1. Code: A clean, optimized implementation in ${language}
2. Your Thoughts: A list of key insights and reasoning behind your approach
3. Time complexity: O(X) with a detailed explanation (at least 2 sentences)
4. Space complexity: O(X) with a detailed explanation (at least 2 sentences)

For complexity explanations, please be thorough. For example: "Time complexity: O(n) because we iterate through the array only once. This is optimal as we need to examine each element at least once to find the solution." or "Space complexity: O(n) because in the worst case, we store all elements in the hashmap. The additional space scales linearly with the input size."

Your solution should be efficient, well-commented, and handle edge cases.
`
}

export const buildDebugPrompt = (
  problemInfo: ProcessingProblemInfo,
  language: string,
  workflow: Workflow = "coding"
): PromptBundle => {
  if (workflow === "biotech") {
    return {
      systemPrompt: `You are a senior biotechnology scientist reviewing an interview response against additional screenshots. Be evidence-aware and do not invent findings.

Your response MUST use these headers:
### Issues Identified
### Scientific Corrections
### Revised Answer
### Evidence and Assumptions
### Caveats and Follow-up`,
      userPrompt: `Review and improve the response to this biotech question: "${problemInfo.problem_statement || "Unknown question"}". Use all screenshots as the source of truth. Check terminology, biological mechanism, experimental design, controls, statistics, units, safety, quality, and regulatory claims when relevant.`,
    }
  }

  return {
    systemPrompt: `You are a coding interview assistant helping debug and improve solutions. Analyze these screenshots which include either error messages, incorrect outputs, or test cases, and provide detailed debugging help.

Your response MUST follow this exact structure with these section headers (use ### for headers):
### Issues Identified
- List each issue as a bullet point with clear explanation

### Specific Improvements and Corrections
- List specific code changes needed as bullet points

### Optimizations
- List any performance optimizations if applicable

### Explanation of Changes Needed
Here provide a clear explanation of why the changes are needed

### Key Points
- Summary bullet points of the most important takeaways

If you include code examples, use proper markdown code blocks with language specification (e.g. \`\`\`java).`,
    userPrompt: `I'm solving this coding problem: "${problemInfo.problem_statement}" in ${language}. I need help with debugging or improving my solution. Here are screenshots of my code, the errors or test cases. Please provide a detailed analysis with:
1. What issues you found in my code
2. Specific improvements and corrections
3. Any optimizations that would make the solution better
4. A clear explanation of the changes needed`,
  }
}
