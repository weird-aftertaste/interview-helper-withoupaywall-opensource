import { describe, expect, it } from "vitest"
import { ConversationManager } from "../../electron/ConversationManager"

describe("ConversationManager", () => {
  it("trims and stores a message for current speaker", () => {
    const manager = new ConversationManager()

    const message = manager.addMessage("  hello world  ")

    expect(message.text).toBe("hello world")
    expect(message.speaker).toBe("interviewee")
    expect(manager.getMessages()).toHaveLength(1)
  })

  it("throws when adding an empty message", () => {
    const manager = new ConversationManager()

    expect(() => manager.addMessage("   ")).toThrow("Message text cannot be empty")
  })

  it("toggles speaker from interviewee to interviewer", () => {
    const manager = new ConversationManager()

    const nextSpeaker = manager.toggleSpeaker()

    expect(nextSpeaker).toBe("interviewer")
    expect(manager.getCurrentSpeaker()).toBe("interviewer")
  })

  it("updates an existing message and marks it edited", () => {
    const manager = new ConversationManager()
    const message = manager.addMessage("original")

    const result = manager.updateMessage(message.id, " updated text ")

    expect(result).toBe(true)
    expect(manager.getMessages()[0]?.text).toBe("updated text")
    expect(manager.getMessages()[0]?.edited).toBe(true)
  })

  it("resets speaker to interviewee and emits speaker-changed on clear", () => {
    const manager = new ConversationManager()
    const speakerEvents: string[] = []

    manager.on("speaker-changed", (speaker) => {
      speakerEvents.push(speaker)
    })

    manager.setSpeaker("interviewer")
    manager.clearConversation()

    expect(manager.getCurrentSpeaker()).toBe("interviewee")
    expect(speakerEvents).toContain("interviewee")
  })
})
