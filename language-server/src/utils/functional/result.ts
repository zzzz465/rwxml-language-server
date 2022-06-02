import E from 'fp-ts/Either'
import { flow } from 'fp-ts/lib/function'
import { toNullable } from 'fp-ts/Option'
import { ErrorLike } from 'ono'

export namespace R {
  export type Result<T, E extends ErrorLike = ErrorLike> = E.Either<E, T>

  export const fromNullable =
    (err: ErrorLike) =>
    <T>(x: T | null | undefined): Result<T> =>
      x !== null ? E.right(x as T) : E.left(err)

  export const fromOption = (err: ErrorLike) => flow(toNullable, fromNullable(err))
}
