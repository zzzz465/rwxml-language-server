import _, { curryRight } from 'lodash'
import { ErrorLike } from 'ono'
import { AnyFunction, AtLeastOneFunctionsFlow, reduce } from 'ramda'

export type Result<T, E extends ErrorLike> = Value<T> | Error<E>

interface IResult<T, E> {
  ok(): this is Value<T>
  err(): this is Error<E>
}

export namespace Result {
  export function ok<T = unknown, E = unknown>(value: T): Result<T, E> {
    return new Value(value)
  }

  /**
   * return Value.
   * return null if value is null of undefined.
   */
  export function nilOk<T, E>(value: T | null | undefined): Result<T, E> | null {
    if (_.isNil(value)) {
      return null
    }

    return new Value(value)
  }

  export function err<T = unknown, E = unknown>(error: E): Result<T, E> {
    return new Error(error)
  }

  export function is<T, E>(value: unknown): value is Result<T, E> {
    return value instanceof Value || value instanceof Error
  }
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

// name from: https://stackoverflow.com/a/57312083
export const checkNil = <T>(value: T) => Result.nilOk(value) ?? Result.err('argument is null or undefined.')

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

// array types
// type Length<T extends any[]> = T['length']
// type Head<T extends any[]> = T extends [] ? never : T[0]
// type Tail<T extends any[]> = Length<T> extends 1 ? T[0] : Tail<_Tail<T>>
// type _Tail<T extends any[]> = T extends [head: any, ...tail: infer Tail_] ? Tail_ : never
//
// type _4 = Tail<[1, 2, 3, 4]>
// TS: 4.0^

export const pipeWithError: <TArgs extends unknown[], TResult>(
  fns: AtLeastOneFunctionsFlow<TArgs, TResult>
) => (...args: TArgs) => Result<TResult, ErrorLike> = curryRight(reduce(transformer))
