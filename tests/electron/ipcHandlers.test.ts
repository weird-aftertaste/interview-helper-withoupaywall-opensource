import { beforeEach, describe, expect, it, vi } from "vitest"
import type { IIpcHandlerDeps } from "../../electron/main"
import { initializeIpcHandlers } from "../../electron/ipcHandlers"
import { createIpcHarness } from "./helpers/ipcHarness"

type RegisteredHandler = (
  event: unknown,
  ...args: unknown[]
) => unknown | Promise<unknown>

const mocks = vi.hoisted(() => {
  const registeredHandlers = new Map<string, RegisteredHandler>()

  return {
    registeredHandlers,
    shellOpenExternal: vi.fn(),
    configHelper: {
      loadConfig: vi.fn(),
      updateConfig: vi.fn(),
      hasApiKey: vi.fn(),
      isValidApiKeyFormat: vi.fn(),
      testApiKey: vi.fn(),
    },
  }
})

vi.mock("electron", () => ({
  ipcMain: {
    handle: (channel: string, handler: RegisteredHandler) => {
      mocks.registeredHandlers.set(channel, handler)
    },
  },
  shell: {
    openExternal: mocks.shellOpenExternal,
  },
}))

vi.mock("../../electron/ConfigHelper", () => ({
  configHelper: mocks.configHelper,
}))

const PROCESSING_EVENTS = {
  UNAUTHORIZED: "processing-unauthorized",
  NO_SCREENSHOTS: "processing-no-screenshots",
  OUT_OF_CREDITS: "out-of-credits",
  API_KEY_INVALID: "api-key-invalid",
  INITIAL_START: "initial-start",
  PROBLEM_EXTRACTED: "problem-extracted",
  SOLUTION_SUCCESS: "solution-success",
  INITIAL_SOLUTION_ERROR: "solution-error",
  DEBUG_START: "debug-start",
  DEBUG_SUCCESS: "debug-success",
  DEBUG_ERROR: "debug-error",
} as const

type AppView = "queue" | "solutions" | "debug"

const createFixture = (overrides: Partial<IIpcHandlerDeps> = {}) => {
  const mainWindow = {
    isDestroyed: vi.fn(() => false),
    webContents: {
      send: vi.fn(),
      executeJavaScript: vi.fn(async () => 100),
    },
  }

  const processingHelper = {
    processScreenshots: vi.fn(async () => undefined),
    cancelOngoingRequests: vi.fn(),
  }

  const transcriptionHelper = {
    transcribeAudio: vi.fn(async () => ({ text: "transcribed" })),
  }

  const conversationManager = {
    addMessage: vi.fn((text: string, speaker?: "interviewer" | "interviewee") => ({
      id: "msg-1",
      text,
      speaker: speaker ?? "interviewee",
      timestamp: Date.now(),
    })),
    toggleSpeaker: vi.fn(() => "interviewer"),
    getMessages: vi.fn(() => []),
    clearConversation: vi.fn(),
    updateMessage: vi.fn(() => true),
    on: vi.fn(),
  }

  const answerAssistant = {
    generateAnswerSuggestions: vi.fn(async () => ({
      suggestions: ["example"],
      reasoning: "reason",
    })),
  }

  const deps: IIpcHandlerDeps = {
    getMainWindow: vi.fn(() => mainWindow as unknown as Electron.BrowserWindow),
    setWindowDimensions: vi.fn(),
    getScreenshotQueue: vi.fn(() => ["queue-1.png"]),
    getExtraScreenshotQueue: vi.fn(() => ["extra-1.png"]),
    deleteScreenshot: vi.fn(async () => ({ success: true })),
    getImagePreview: vi.fn(async (path: string) => `preview-${path}`),
    processingHelper: processingHelper as unknown as IIpcHandlerDeps["processingHelper"],
    PROCESSING_EVENTS,
    takeScreenshot: vi.fn(async () => "shot.png"),
    getView: vi.fn<() => AppView>(() => "queue"),
    toggleMainWindow: vi.fn(),
    clearQueues: vi.fn(),
    setView: vi.fn(),
    moveWindowLeft: vi.fn(),
    moveWindowRight: vi.fn(),
    moveWindowUp: vi.fn(),
    moveWindowDown: vi.fn(),
    transcriptionHelper: transcriptionHelper as unknown as IIpcHandlerDeps["transcriptionHelper"],
    conversationManager: conversationManager as unknown as IIpcHandlerDeps["conversationManager"],
    answerAssistant: answerAssistant as unknown as IIpcHandlerDeps["answerAssistant"],
    ...overrides,
  }

  return {
    deps,
    mainWindow,
    processingHelper,
    transcriptionHelper,
    conversationManager,
    answerAssistant,
  }
}

const configureConfigHelperDefaults = () => {
  mocks.configHelper.loadConfig.mockReturnValue({
    apiProvider: "openai",
    openaiBaseUrl: "",
  })
  mocks.configHelper.updateConfig.mockReturnValue(true)
  mocks.configHelper.hasApiKey.mockReturnValue(true)
  mocks.configHelper.isValidApiKeyFormat.mockReturnValue(true)
  mocks.configHelper.testApiKey.mockResolvedValue({ valid: true })
}

const setup = (overrides: Partial<IIpcHandlerDeps> = {}) => {
  mocks.registeredHandlers.clear()
  mocks.shellOpenExternal.mockReset()
  mocks.configHelper.loadConfig.mockReset()
  mocks.configHelper.updateConfig.mockReset()
  mocks.configHelper.hasApiKey.mockReset()
  mocks.configHelper.isValidApiKeyFormat.mockReset()
  mocks.configHelper.testApiKey.mockReset()
  configureConfigHelperDefaults()

  const fixture = createFixture(overrides)
  initializeIpcHandlers(fixture.deps)

  return {
    ...fixture,
    harness: createIpcHarness(mocks.registeredHandlers),
  }
}

describe("initializeIpcHandlers", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("registers critical IPC channels", () => {
    const { harness } = setup()

    expect(harness.handlers.has("get-screenshots")).toBe(true)
    expect(harness.handlers.has("trigger-process-screenshots")).toBe(true)
    expect(harness.handlers.has("add-conversation-message")).toBe(true)
    expect(harness.handlers.has("open-external-url")).toBe(true)
    expect(harness.handlers.has("openLink")).toBe(true)
    expect(harness.handlers.has("openExternal")).toBe(true)
  })

  it("returns queue previews from get-screenshots in queue view", async () => {
    const { harness, deps } = setup()

    const result = await harness.invoke("get-screenshots")

    expect(result).toEqual([{ path: "queue-1.png", preview: "preview-queue-1.png" }])
    expect(deps.getScreenshotQueue).toHaveBeenCalledTimes(1)
    expect(deps.getImagePreview).toHaveBeenCalledWith("queue-1.png")
  })

  it("returns extra queue previews in non-queue view", async () => {
    const { harness, deps } = setup({
      getView: vi.fn<() => AppView>(() => "solutions"),
    })

    const result = await harness.invoke("get-screenshots")

    expect(result).toEqual([{ path: "extra-1.png", preview: "preview-extra-1.png" }])
    expect(deps.getExtraScreenshotQueue).toHaveBeenCalledTimes(1)
    expect(deps.getImagePreview).toHaveBeenCalledWith("extra-1.png")
  })

  it("returns no-screenshot error for delete-last-screenshot when queue is empty", async () => {
    const { harness } = setup({
      getScreenshotQueue: vi.fn(() => []),
      getView: vi.fn<() => AppView>(() => "queue"),
    })

    const result = await harness.invoke("delete-last-screenshot")

    expect(result).toEqual({ success: false, error: "No screenshots to delete" })
  })

  it("returns API key required and emits invalid event when processing is triggered without key", async () => {
    const { harness, mainWindow, processingHelper } = setup()
    mocks.configHelper.hasApiKey.mockReturnValue(false)

    const result = await harness.invoke("trigger-process-screenshots")

    expect(result).toEqual({ success: false, error: "API key required" })
    expect(mainWindow.webContents.send).toHaveBeenCalledWith(
      PROCESSING_EVENTS.API_KEY_INVALID
    )
    expect(processingHelper.processScreenshots).not.toHaveBeenCalled()
  })

  it("normalizes unknown speaker in add-conversation-message", async () => {
    const { harness, conversationManager } = setup()

    const result = await harness.invoke(
      "add-conversation-message",
      "hello",
      "invalid-speaker"
    )

    expect(conversationManager.addMessage).toHaveBeenCalledWith("hello", undefined)
    expect(result).toMatchObject({ success: true })
  })

  it("returns graceful response when conversation manager is missing", async () => {
    const { harness } = setup({
      conversationManager: undefined,
    })

    const result = await harness.invoke("get-conversation")

    expect(result).toEqual({
      success: false,
      error: "Conversation manager not initialized",
      messages: [],
    })
  })

  it("returns fallback transcription error for unknown thrown value", async () => {
    const { harness, transcriptionHelper } = setup()
    transcriptionHelper.transcribeAudio.mockRejectedValue("boom")

    const result = await harness.invoke(
      "transcribe-audio",
      new ArrayBuffer(4),
      "audio/webm"
    )

    expect(result).toEqual({ success: false, error: "Transcription failed" })
  })

  it("opens external links through all alias channels", async () => {
    const { harness } = setup()
    const url = "https://example.com"

    await harness.invoke("open-external-url", url)
    await harness.invoke("openLink", url)
    await harness.invoke("openExternal", url)

    expect(mocks.shellOpenExternal).toHaveBeenCalledTimes(3)
    expect(mocks.shellOpenExternal).toHaveBeenCalledWith(url)
  })

  it("returns move command error payload when movement throws", async () => {
    const { harness } = setup({
      moveWindowLeft: vi.fn(() => {
        throw new Error("cannot move")
      }),
    })

    const result = await harness.invoke("trigger-move-left")

    expect(result).toEqual({ error: "Failed to move window left" })
  })
})
