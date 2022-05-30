export type Result<T, E> = [T, null] | [null, E]
export const $IsError = <T, E>(r: Result<T, E>) => r[1] !== null
