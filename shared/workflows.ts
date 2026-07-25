export type Workflow = "coding" | "biotech"

export const DEFAULT_WORKFLOW: Workflow = "coding"

export const isWorkflow = (value: unknown): value is Workflow =>
  value === "coding" || value === "biotech"
