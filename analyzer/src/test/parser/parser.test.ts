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

  test('should parse <__proto__> (#387)', () => {
    const p = new Parser(null)

    // Should not throw
    p.write('<__proto__>')
  })
})
