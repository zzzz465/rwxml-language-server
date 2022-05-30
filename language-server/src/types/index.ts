export type UrlEncodedString = string
export type Writable<T> = { -readonly [P in keyof T]: T[P] }
export type Nullish<T> = T | null | undefined
