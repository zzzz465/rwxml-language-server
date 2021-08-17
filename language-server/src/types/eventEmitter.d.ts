import 'events'

declare module 'events' {
  interface EventMap {
    [event: string]: any
  }

  interface DefaultEvents extends EventMap {
    [event: string]: (...args: any) => void
  }

  interface EventEmitter<T extends EventMap = DefaultEvents> {
    on<K extends keyof T>(event: K, listener: T[K]): void
    emit<K extends keyof T>(this: this, event: K, ...args: Parameters<T[K]>): void
  }
}
