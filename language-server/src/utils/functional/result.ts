import E from 'fp-ts/Either'
import O from 'fp-ts/Option'
import { ErrorLike } from 'ono'

export type Result<T, E extends ErrorLike = ErrorLike> = E.Either<E, T>

const never = () => {
  throw new Error()
}

export const fromNullable =
  (err: ErrorLike) =>
  <T>(x: NonNullable<T> | null): Result<T> =>
    x !== null ? E.right(x) : E.left(err)

export const fromOption =
  (err: ErrorLike) =>
  <T extends O.Option<any>>(x: T): Result<T> =>
    O.isSome(x) ? E.right(O.getOrElse(never as () => T)(x)) : E.left(err)
