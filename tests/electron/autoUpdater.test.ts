import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAutoUpdater = {
  autoDownload: false,
  autoInstallOnAppQuit: false,
  allowDowngrade: false,
  allowPrerelease: false,
  logger: undefined as unknown,
  on: vi.fn(),
  checkForUpdates: vi.fn().mockResolvedValue({}),
  downloadUpdate: vi.fn().mockResolvedValue(undefined),
  quitAndInstall: vi.fn(),
};

const mockApp = {
  isPackaged: false,
};

const mockIpcMain = {
  handle: vi.fn(),
};

const mockBrowserWindow = {
  getAllWindows: vi.fn(() => []),
};

vi.mock("electron-updater", () => ({
  autoUpdater: mockAutoUpdater,
}));

vi.mock("electron", () => ({
  app: mockApp,
  ipcMain: mockIpcMain,
  BrowserWindow: mockBrowserWindow,
}));

vi.mock("electron-log", () => ({
  default: {
    transports: {
      file: {
        level: "info",
      },
    },
  },
}));

describe("initAutoUpdater", () => {
  const originalToken = process.env.GH_TOKEN;

  beforeEach(() => {
    vi.resetModules();
    mockAutoUpdater.allowDowngrade = true;
    vi.clearAllMocks();
    mockAutoUpdater.checkForUpdates.mockResolvedValue({});
    mockApp.isPackaged = false;
    process.env.GH_TOKEN = originalToken;
  });

  it("skips update checks in development", async () => {
    mockApp.isPackaged = false;

    const { initAutoUpdater } = await import("../../electron/autoUpdater");
    initAutoUpdater();

    expect(mockAutoUpdater.checkForUpdates).not.toHaveBeenCalled();
  });

  it("checks for updates in packaged app even without GH_TOKEN", async () => {
    mockApp.isPackaged = true;
    delete process.env.GH_TOKEN;
    const setIntervalSpy = vi
      .spyOn(global, "setInterval")
      .mockImplementation(() => 0 as unknown as ReturnType<typeof setInterval>);

    const { initAutoUpdater } = await import("../../electron/autoUpdater");
    initAutoUpdater();

    expect(mockAutoUpdater.checkForUpdates).toHaveBeenCalledTimes(1);
    expect(mockAutoUpdater.allowDowngrade).toBe(false);

    setIntervalSpy.mockRestore();
  });
});
