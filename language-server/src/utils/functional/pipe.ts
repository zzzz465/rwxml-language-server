// original source: https://stackoverflow.com/a/68513136

// import { Fn } from 'ramda'
type Fn = (...a: any[]) => any

type Head<T extends any[]> = T extends [infer H, ...infer _] ? H : never
type Last<T extends any[]> = T extends [infer _] ? never : T extends [...infer _, infer L] ? L : never
type Return<T extends Fn[]> = Last<T> extends Fn ? ReturnType<Last<T>> : never
type FirstParameterOf<T extends Fn[]> = Head<T> extends Fn ? Head<Parameters<Head<T>>> : never

/**
 * Allowed<T extends Fn[], Cache> check T is piped correctly with type.
 */
type Allowed<T extends Fn[], Cache extends Fn[] = []> = T extends []
  ? Cache
  : T extends [infer Lst] // if T is [Fn]
  ? Lst extends Fn // and if Lst is Fn
    ? Allowed<[], [...Cache, Lst]> // then rest of 'em
    : never
  : T extends [infer Fst, ...infer Lst] // else if [Fst, ...Lst]
  ? Fst extends Fn // and if Fst is Fn
    ? Lst extends Fn[] // and if Lst is Fn[]
      ? Head<Lst> extends Fn // and if Lst = [Head<Lst>, ...others], Head<Lst> is Fn
        ? ReturnType<Fst> extends Head<Parameters<Head<Lst>>> // and if Return<Fst> is Parameters<Head<Lst>>
          ? Allowed<Lst, [...Cache, Fst]> // add Head to Cache, go to next
          : never
        : never
      : never
    : never
  : never

export function pipe<
  T extends Fn,
  Fns extends T[],
  Allow extends {
    0: [never]
    1: [FirstParameterOf<Fns>]
  }[Allowed<Fns> extends never ? 0 : 1]
>(...args: [...Fns]): (...data: Allow) => Return<Fns>

export function pipe<T extends Fn, Fns extends T[], Allow extends unknown[]>(...args: [...Fns]) {
  return (...data: Allow) => args.reduce((acc, elem) => elem(acc), data)
}

// type test code
// const foo = (arg: string) => [1, 2, 3]
// const baz = (arg: number[]) => 42

// const bar = (arg: number) => ['str']
// const foo2 = (arg: string[]) => 43

// const check5 = pipe(foo)('foo')
// const data = check5 + 30

// const check = pipe(foo, baz, bar)('hello') // string[]
// const check2 = pipe(baz, bar)([2]) // string[]
// const check3 = pipe(baz, bar)('hello') // (typeerr) expected error
// const check4 = pipe(baz, baz, bar)('hello') // (never) expected error
