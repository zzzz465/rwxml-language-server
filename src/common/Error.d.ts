declare global {
	class NotImplementedError extends Error {
		constructor(message?: string) {
			super(message)
		}
	}
}