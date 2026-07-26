import { beforeEach, describe, expect, it, vi } from "vitest"

const electronMocks = vi.hoisted(() => ({
  handlers: new Map<string, () => unknown>(),
  quit: vi.fn(),
  on: vi.fn(),
  unregisterAll: vi.fn()
}))

vi.mock("electron", () => ({
  app: {
    quit: electronMocks.quit,
    on: electronMocks.on
  },
  globalShortcut: {
    register: vi.fn((accelerator: string, handler: () => unknown) => {
      electronMocks.handlers.set(accelerator, handler)
      return true
    }),
    unregisterAll: electronMocks.unregisterAll
  }
}))

vi.mock("../../electron/ConfigHelper", () => ({
  configHelper: {
    loadConfig: vi.fn(() => ({ opacity: 1 })),
    saveConfig: vi.fn(),
    setZoomFactor: vi.fn((factor: number) => factor)
  }
}))

import { ShortcutsHelper } from "../../electron/shortcuts"

describe("ShortcutsHelper", () => {
  beforeEach(() => {
    electronMocks.handlers.clear()
    electronMocks.quit.mockClear()
    electronMocks.on.mockClear()
    electronMocks.unregisterAll.mockClear()
  })

  it("quits only when the explicit Ctrl/Cmd+Q shortcut is invoked", () => {
    const helper = new ShortcutsHelper({
      getMainWindow: () => null,
      takeScreenshot: vi.fn(),
      getImagePreview: vi.fn(),
      processingHelper: null,
      clearQueues: vi.fn(),
      setView: vi.fn(),
      isVisible: () => true,
      toggleMainWindow: vi.fn(),
      moveWindowLeft: vi.fn(),
      moveWindowRight: vi.fn(),
      moveWindowUp: vi.fn(),
      moveWindowDown: vi.fn()
    })

    helper.registerGlobalShortcuts()

    expect(electronMocks.quit).not.toHaveBeenCalled()
    expect(electronMocks.handlers.has("CommandOrControl+Q")).toBe(true)

    electronMocks.handlers.get("CommandOrControl+Q")?.()

    expect(electronMocks.quit).toHaveBeenCalledOnce()
  })
})
