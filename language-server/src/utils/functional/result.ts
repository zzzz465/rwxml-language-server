import { curryRight, isNil } from 'lodash'
import ono, { ErrorLike } from 'ono'
import { AnyFunction, AtLeastOneFunctionsFlow, reduce } from 'ramda'

export type Result<T, E extends ErrorLike> = Value<T> | Error<E>

interface IResult<T, E> {
  ok(): this is Value<T>
  err(): this is Error<E>
}

export namespace Result {
  export function ok<T = unknown, E = ErrorLike>(value: T): Result<T, E> {
    return new Value(value)
  }

  export function err<T = unknown, E = unknown>(error: E): Result<T, E> {
    return new Error(error)
  }

  export function is(value: unknown): value is Result<unknown, ErrorLike> {
    return value instanceof Value || value instanceof Error
  }

  // name from: https://stackoverflow.com/a/57312083
  export function checkNil<T>(arg: T): Result<Result.Not<T>, ErrorLike> {
    if (Result.is(arg)) {
      if (arg.ok()) {
        return Result.checkNil(arg) as Result<Result.Not<T>, ErrorLike>
      } else {
        return arg
      }
    } else {
      if (isNil(arg)) {
        return Result.err(ono('argument is nil'))
      } else {
        return Result.ok(arg as NonNullable<T> & Result.Not<T>)
      }
    }
  }

  export type Not<T> = T extends Result<T, ErrorLike> ? never : T
  export type UnWrap<T> = T extends Result<infer R, ErrorLike> ? UnWrap<R> : T
}

export class Value<T> implements IResult<T, null> {
  constructor(public readonly value: T) {}

  ok(): this is Value<T> {
    return true
  }

  err(): this is Error<null> {
    return false
  }
}

export class Error<E> implements IResult<null, E> {
  constructor(public readonly value: E) {}

  ok(): this is Value<null> {
    return false
  }

  err(): this is Error<E> {
    return true
  }
}

export const transformer = (res: unknown, f: AnyFunction): Result<unknown, ErrorLike> => {
  if (!Result.is(res)) {
    return Result.ok(f(res))
  }

  if (res.ok()) {
    res = f(res.value)
    if (Result.is(res)) {
      return res as Value<unknown>
    } else {
      return Result.ok(res)
    }
  } else {
    return res as Result<unknown, ErrorLike>
  }
}

// // array types
// type Length<T extends any[]> = T['length']
// type Head<T extends any[]> = T extends [] ? never : T[0]
// type Last<T extends any[]> = Length<T> extends 1 ? T[0] : Last<Tail<T>>
// type Tail<T extends any[]> = T extends [head: any, ...tail: infer Tail_] ? Tail_ : never
// //
// // type _4 = Tail<[1, 2, 3, 4]>
// // TS: 4.0^

// type Transformer = <R>(
//   res: unknown,
//   f: (...args: unknown[]) => R
// ) => R extends Result<infer Return, ErrorLike>
//   ? Result<Return, ErrorLike> //
//   : Result<R, ErrorLike>

export const pipeWithError: <TArgs extends unknown[], TResult extends Result.Not<unknown>>(
  fns: AtLeastOneFunctionsFlow<TArgs, Result<Result.Not<TResult>, ErrorLike>>
) => (...args: TArgs) => Result<TResult, ErrorLike> = curryRight(reduce(transformer))
