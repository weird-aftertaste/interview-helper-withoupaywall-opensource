import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react"
import { ArrowUp, MessageCircle } from "lucide-react"
import type { FollowUpMessage } from "../../types/electron"

interface FollowUpChatProps {
  problemStatement?: string
  currentAnswer: string
  workflow: "coding" | "biotech"
}

export const FollowUpChat = ({
  problemStatement,
  currentAnswer,
  workflow,
}: FollowUpChatProps) => {
  const [messages, setMessages] = useState<FollowUpMessage[]>([])
  const [draft, setDraft] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setMessages([])
    setDraft("")
    setError(null)
  }, [problemStatement, currentAnswer, workflow])

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [messages, isSending])

  const sendMessage = async () => {
    const question = draft.trim()
    if (!question || isSending) return

    const userMessage: FollowUpMessage = { role: "user", content: question }
    const history = messages
    setMessages((current) => [...current, userMessage])
    setDraft("")
    setError(null)
    setIsSending(true)

    try {
      const response = await window.electronAPI.askFollowUp({
        question,
        history,
        problemStatement,
        currentAnswer,
        workflow,
      })

      if (!response.success || !response.answer) {
        throw new Error(response.error || "No answer was returned.")
      }

      setMessages((current) => [
        ...current,
        { role: "assistant", content: response.answer as string },
      ])
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not answer that follow-up."
      )
    } finally {
      setIsSending(false)
      textareaRef.current?.focus()
    }
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    void sendMessage()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      void sendMessage()
    }
  }

  return (
    <section className="border-t border-white/10 pt-4" aria-label="Follow-up chat">
      <div className="mb-3 flex items-center gap-2">
        <MessageCircle className="h-3.5 w-3.5 text-blue-300" />
        <h2 className="text-[13px] font-medium tracking-wide text-white">
          Ask a follow-up
        </h2>
      </div>

      <div
        ref={scrollRef}
        className="mb-3 max-h-72 space-y-3 overflow-y-auto pr-1"
        aria-live="polite"
      >
        {messages.length === 0 && (
          <p className="py-2 text-xs leading-relaxed text-white/45">
            Ask about the reasoning, edge cases, implementation, evidence, or
            anything else in this answer.
          </p>
        )}

        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={
              message.role === "user"
                ? "ml-auto max-w-[85%] rounded-lg bg-blue-500/15 px-3 py-2 text-[13px] leading-relaxed text-blue-50"
                : "max-w-[92%] border-l border-white/15 pl-3 text-[13px] leading-relaxed text-gray-100"
            }
          >
            <div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-white/35">
              {message.role === "user" ? "You" : "Assistant"}
            </div>
            <div className="whitespace-pre-wrap break-words">{message.content}</div>
          </div>
        ))}

        {isSending && (
          <div className="border-l border-white/15 pl-3 text-xs text-white/45">
            Thinking…
          </div>
        )}
      </div>

      {error && (
        <p className="mb-2 text-xs text-red-300" role="alert">
          {error}
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-2 rounded-lg border border-white/10 bg-white/[0.04] p-2 focus-within:border-blue-400/40"
      >
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a follow-up…"
          rows={1}
          maxLength={4000}
          disabled={isSending}
          className="max-h-28 min-h-8 flex-1 resize-none bg-transparent px-1 py-1.5 text-[13px] leading-relaxed text-white outline-none placeholder:text-white/30 disabled:opacity-50"
          aria-label="Follow-up question"
        />
        <button
          type="submit"
          disabled={!draft.trim() || isSending}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-500 text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/25"
          aria-label="Send follow-up"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </form>
      <p className="mt-1.5 text-[10px] text-white/25">
        Enter to send · Shift + Enter for a new line
      </p>
    </section>
  )
}
