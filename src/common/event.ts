
export interface Event<T> {
	(listener: T): void
}