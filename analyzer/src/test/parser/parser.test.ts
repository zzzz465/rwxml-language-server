// source code: https://github.com/fb55/htmlparser2
// all rights goes to original author.
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Parser, Tokenizer } from '../../parser/htmlparser2'
import type { Handler } from '../../parser/htmlparser2'

describe('API', () => {
  test('should work without callbacks', () => {
    const cbs: Partial<Handler> = { onerror: jest.fn() }
    const p = new Parser(cbs)

    p.end('<a foo><bar></a><!-- --><![CDATA[]]]><?foo?><!bar><boo/>boohay')
    p.write('foo')

    // Check for an error
    p.end()
    p.write('foo')
    expect(cbs.onerror).toHaveBeenLastCalledWith(new Error('.write() after done!'))
    p.end()
    expect(cbs.onerror).toHaveBeenLastCalledWith(new Error('.end() after done!'))

    // Should ignore the error if there is no callback
    delete cbs.onerror
    p.write('foo')

    p.reset()

    // Remove method
    cbs.onopentag = jest.fn()
    p.write('<a foo')
    delete cbs.onopentag
    p.write('>')

    // Pause/resume
    const onText = jest.fn()
    cbs.ontext = onText
    p.pause()
    p.write('foo')
    expect(onText).not.toHaveBeenCalled()
    p.resume()
    expect(onText).toHaveBeenLastCalledWith('foo')
    p.pause()
    expect(onText).toHaveBeenCalledTimes(1)
    p.resume()
    expect(onText).toHaveBeenCalledTimes(1)
    p.pause()
    p.end('foo')
    expect(onText).toHaveBeenCalledTimes(1)
    p.resume()
    expect(onText).toHaveBeenCalledTimes(2)
    expect(onText).toHaveBeenLastCalledWith('foo')
  })

  test('should back out of numeric entities (#125)', () => {
    const onend = jest.fn()
    let text = ''
    const p = new Parser({
      ontext(data) {
        text += data
      },
      onend,
    })

    p.end('id=770&#anchor')

    expect(onend).toHaveBeenCalledTimes(1)
    expect(text).toBe('id=770&#anchor')

    p.reset()
    text = ''

    p.end('0&#xn')

    expect(onend).toHaveBeenCalledTimes(2)
    expect(text).toBe('0&#xn')
  })

  test('should update the position', () => {
    const p = new Parser()

    p.write('foo')

    expect(p.startIndex).toBe(0)
    expect(p.endIndex).toBe(2)

    p.write('<select>')

    expect(p.startIndex).toBe(3)
    expect(p.endIndex).toBe(10)

    p.write('<select>')

    expect(p.startIndex).toBe(11)
    expect(p.endIndex).toBe(18)

    p.parseChunk('</select>')

    expect(p.startIndex).toBe(19)
    expect(p.endIndex).toBe(27)
  })

  test('should update the position when a single tag is spread across multiple chunks', () => {
    const p = new Parser()

    p.write('<div ')
    p.write('foo=bar>')

    expect(p.startIndex).toBe(0)
    expect(p.endIndex).toBe(12)
  })

  test('should have the correct position for implied opening tags', () => {
    const p = new Parser()

    p.write('</p>')

    expect(p.startIndex).toBe(0)
    expect(p.endIndex).toBe(3)
  })

  test('should parse <__proto__> (#387)', () => {
    const p = new Parser(null)

    // Should not throw
    p.write('<__proto__>')
  })
})
