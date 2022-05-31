import { isNil } from 'lodash'
import ono, { ErrorLike } from 'ono'
import { AnyFunction, filter, map, pipe } from 'ramda'
import { Head, Last } from 'ts-toolbelt/out/List/_api'
import { Nullish } from '../../types'

export type Result<T = unknown, E extends ErrorLike = ErrorLike> = Value<T> | Error<E>
export type Unary<T, R> = (arg: T) => Result<R, ErrorLike>

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
  export function checkNil<T>(arg: Nullish<T>): Result<NonNullable<T>, ErrorLike> {
    if (isNil(arg)) {
      return Result.err(ono('argument is nil'))
    } else {
      return Result.ok(arg) as Result<NonNullable<T>, ErrorLike>
    }
  }

  export type Not<T> = T extends Result<T, ErrorLike> ? never : T
  export type UnWrap<T> = T extends Result<infer R, ErrorLike> ? UnWrap<R> : T
}

export class Value<T = unknown> implements IResult<T, null> {
  constructor(public readonly value: T) {}

  ok(): this is Value<T> {
    return true
  }

  err(): this is Error<null> {
    return false
  }
}

export class Error<E = ErrorLike> implements IResult<null, E> {
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

export type PipeReturn<T extends Fn[]> = Last<T> extends Fn
  ? ReturnType<Last<T>> extends Result<infer R, ErrorLike>
    ? Result<Result.UnWrap<R>, ErrorLike>
    : ReturnType<Last<T>>
  : never
export type FirstParameterOf<T extends Fn[]> = Head<T> extends Fn ? Parameters<Head<T>> : never

type Fn = (...args: any[]) => any

export type Allowed<T extends Fn[], Cache extends Fn[] = []> = T extends []
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
    0: never
    1: FirstParameterOf<Fns>
  }[Allowed<Fns> extends never ? 0 : 1]
>(
  ...args: [...Fns]
): (...data: Allow) => PipeReturn<Fns> extends Result<unknown, ErrorLike>
  ? PipeReturn<Fns> //
  : Result<PipeReturn<Fns>, ErrorLike>
export function pipeWithResult<T extends Fn, Fns extends T[], Allow extends unknown[]>(...args: [...Fns]) {
  return (...data: Allow) =>
    args.reduce((acc, fn) => {
      const res = Result.unwrap(acc)
      if (Result.is(res)) {
        return res
      }

      return Result.ok(fn(res)) as any
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

// const check1 = pipeWithResult(retOk, retOk2)(10)
// const check2 = pipeWithResult(retOk, retOk2, numToNum)(10) // type err
// const check3 = pipeWithResult(strToNum, retOk, strToStr)('10')
// const check4 = pipeWithResult(numToStr, retErr, numToNum)(30) // type error
// const check5 = pipeWithResult(numToStr, retErr)(10) // no type err but always err

// const x = (any: NodeWithChildren) => [] as Element[]
// const y = (any: any) => find<Element>(any)
// const z = (el: Element) => Result.checkNil(el)

// type allowed = Allowed<[typeof x, typeof y, typeof y]>
// end of test

type UnWrapArray<T extends Result<any, ErrorLike>[], Cache extends any[] = []> = T extends []
  ? Cache //
  : T extends [infer H]
  ? H extends Value<infer R>
    ? [...Cache, R]
    : never
  : T extends [infer H, ...infer Lst]
  ? H extends Value<infer R>
    ? Lst extends Result<any, ErrorLike>[]
      ? UnWrapArray<Lst, [...Cache, R]>
      : never
    : never
  : never

// test
// it should return type [string, number]
// type Test = UnWrapArray<[Result<string, ErrorLike>, Result<number, ErrorLike>]>
// it should return type [Document, Element]
// type Test2 = UnWrapArray<[Result<Element, ErrorLike>]>
// end of test

export const castErr = pipe(
  filter((arg: Result) => arg.err()),
  map((arg: Error) => arg.value)
)

export const mergeErrs = (errors: ErrorLike[]) => ono(errors)

export const mergeResult = <TArgs extends Result<unknown, ErrorLike>[]>(
  ...args: TArgs
): Result<UnWrapArray<TArgs>, ErrorLike> => {
  const [res, errs] = args.reduce(
    (prev, val) => {
      if (val.ok()) {
        prev[0].push(val.value)
      } else {
        prev[1].push(val.value)
      }

      return prev
    },
    [[], []] as [unknown[], ErrorLike[]]
  )

  if (errs.length > 0) {
    return Result.err(mergeErrs(errs))
  } else {
    return Result.ok(res) as Result<UnWrapArray<TArgs>, ErrorLike>
  }
}
