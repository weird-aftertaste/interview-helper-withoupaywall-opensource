export type RegisteredIpcHandler = (
  event: unknown,
  ...args: unknown[]
) => unknown | Promise<unknown>

export const createIpcHarness = (
  handlersMap?: Map<string, RegisteredIpcHandler>
) => {
  const handlers = handlersMap ?? new Map<string, RegisteredIpcHandler>()

  return {
    handlers,
    register: (channel: string, handler: RegisteredIpcHandler) => {
      handlers.set(channel, handler)
    },
    invoke: async (channel: string, ...args: unknown[]) => {
      const handler = handlers.get(channel)
      if (!handler) {
        throw new Error(`IPC handler not registered for channel: ${channel}`)
      }
      return handler({}, ...args)
    },
  }
}
