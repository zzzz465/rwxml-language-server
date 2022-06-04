import { either } from 'fp-ts'
import { flow } from 'fp-ts/lib/function'
import O, { toNullable } from 'fp-ts/Option'
import { ErrorLike } from 'ono'

export type Result<T = any, E extends ErrorLike = ErrorLike> = either.Either<E, T>

export namespace Result {
  export const fromNullable =
    (err: ErrorLike) =>
    <T>(x: T | null | undefined): Result<T> =>
      x !== null && x !== undefined ? either.right(x as T) : either.left(err)

  export const fromOption = (err: ErrorLike): (<A>(ma: O.Option<A>) => Result<A>) => flow(toNullable, fromNullable(err))
}
