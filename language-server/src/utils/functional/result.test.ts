import { add, always } from 'ramda'
import { Error, pipeWithError, Result, Value } from './result'

describe('pipeWithError test', () => {
  test('result should be Result<T, E>', () => {
    const add20 = pipeWithError([
      add(10), //
      add(5),
      add(5),
    ])

    const res = add20(10) // Result<T, E> ??

    // if (res.ok()) {
    //   res.value // value
    // } else {
    //   res.value // unknown (possibly error)
    // }

    expect(res).toBeInstanceOf(Value)
    expect(res.value).toBe(30)
  })

  test('it should return error', () => {
    const add20 = pipeWithError([
      add(10), //
      always(Result.err('')),
      add(20),
    ])

    const res = add20(10)

    expect(res).toBeInstanceOf(Error)
  })
})
