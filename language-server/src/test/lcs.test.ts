import { getMatchingText } from '../data-structures/trie-ext/lcs'

describe('LCS testing', () => {
  test('LCS search with some letter skip', () => {
    const strings = ['foo', 'bar', 'defName', 'foo1', 'foo2', 'foo3', 'foo12', 'foo123', 'foo23', 'foo13']

    const foo = getMatchingText(strings, 'foo')
    const f = getMatchingText(strings, 'f')
    const fo = getMatchingText(strings, 'Fo')
    const fo1 = getMatchingText(strings, 'fo1')
    const fo23 = getMatchingText(strings, 'fo23')
    const f13 = getMatchingText(strings, 'F13')
    const everything = getMatchingText(strings, '')

    expect(foo.length).toEqual(8)
    expect(f.length).toEqual(9)
    expect(fo.length).toEqual(8)
    expect(fo1.length).toEqual(4)
    expect(fo23.length).toEqual(2)
    expect(f13.length).toEqual(2)
    expect(everything.length).toEqual(strings.length)

    return
  })
})
