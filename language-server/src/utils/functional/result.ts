import E from 'fp-ts/Either'
import { flow } from 'fp-ts/lib/function'
import O, { toNullable } from 'fp-ts/Option'
import { ErrorLike } from 'ono'

export type Result<T = any, E extends ErrorLike = ErrorLike> = E.Either<E, T>

export namespace Result {
  export const fromNullable =
    (err: ErrorLike) =>
    <T>(x: T | null | undefined): Result<T> =>
      x !== null ? E.right(x as T) : E.left(err)

  export const fromOption = (err: ErrorLike): (<A>(ma: O.Option<A>) => Result<A>) => flow(toNullable, fromNullable(err))
}
