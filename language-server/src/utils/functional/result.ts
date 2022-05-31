import { isNil } from 'lodash'
import ono, { ErrorLike } from 'ono'
import { AnyFunction } from 'ramda'

export type Result<T, E extends ErrorLike> = Value<T> | Error<E>

interface IResult<T, E> {
  ok(): this is Value<T>
  err(): this is Error<E>
}

export namespace Result {
  export function ok<T = unknown, E = ErrorLike>(value: T): Result<T, E> {
    return new Value(value)
  }

  export function err<T = unknown, E = ErrorLike>(error: E): Result<T, E> {
    return new Error(error)
  }

  export function is(value: unknown): value is Result<unknown, ErrorLike> {
    return value instanceof Value || value instanceof Error
  }

  /**
   * unwrap Result recursively and return value.
   * return Error<E> if error exists while in recurse.
   */
  export function unwrap<T>(arg: T): unknown {
    if (Result.is(arg) && arg.ok()) {
      return unwrap(arg.value)
    }

    return arg
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

/**
 * @deprecated
 */
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

type Head<T extends any[]> = T extends [infer H, ...infer _] ? H : never
type Last<T extends any[]> = T extends [infer _] ? never : T extends [...infer _, infer L] ? L : never
type Return<T extends Fn[]> = Last<T> extends Fn ? ReturnType<Last<T>> : never
type FirstParameterOf<T extends Fn[]> = Head<T> extends Fn ? Head<Parameters<Head<T>>> : never

// export const pipeWithError: <TArgs extends unknown[], TResult extends Result.Not<unknown>>(
//   fns: AtLeastOneFunctionsFlow<TArgs, Result<Result.Not<TResult>, ErrorLike>>
// ) => (...args: TArgs) => Result<TResult, ErrorLike> = curryRight(reduce(transformer))

type Fn = (arg: any) => any

type Allowed<T extends Fn[], Cache extends Fn[] = []> = T extends []
  ? Cache //
  : T extends [infer Lst]
  ? Lst extends Fn
    ? Allowed<[], [...Cache, Lst]>
    : never
  : T extends [infer Fst, ...infer Lst]
  ? Fst extends Fn
    ? Lst extends Fn[]
      ? Head<Lst> extends Fn
        ? ReturnType<Fst> extends Head<Parameters<Head<Lst>>>
          ? Allowed<Lst, [...Cache, Fst]>
          : ReturnType<Fst> extends Result<infer R, ErrorLike>
          ? R extends Head<Parameters<Head<Lst>>>
            ? Allowed<Lst, [...Cache, Fst]>
            : never
          : never
        : never
      : never
    : never
  : never

export function pipeWithResult<
  T extends Fn,
  Fns extends T[],
  Allow extends {
    0: [never]
    1: [FirstParameterOf<Fns>]
  }[Allowed<Fns> extends never ? 0 : 1]
>(...args: [...Fns]): (...data: Allow) => Result<Return<Fns>, ErrorLike>
export function pipeWithResult<T extends Fn, Fns extends T[], Allow extends unknown[]>(...args: [...Fns]) {
  return (...data: Allow) =>
    args.reduce((acc, fn) => {
      const res = Result.unwrap(acc)
      if (Result.is(res)) {
        return res
      }

      return Result.ok(fn(acc)) as any
    }, data)
}

// type test codes
// const retErr = (arg: string) => Result.err('')
// const retOk = (arg: number) => Result.ok('')
// const retOk2 = (arg: string) => Result.ok('')
// const strToStr = (arg: string) => 'str'
// const numToNum = (arg: number) => 30
// const strToNum = (arg: string) => 50
// const numToStr = (arg: number) => 'foo'

// const check1 = pipeWithError(retOk, retOk2)(10)
// const check2 = pipeWithError(retOk, retOk2, numToNum)(10) // type err
// const check3 = pipeWithError(strToNum, retOk, strToStr)('10')
// const check4 = pipeWithError(numToStr, retErr, numToNum)(30) // type error
// const check5 = pipeWithError(numToStr, retErr)(10) // no type err but always err