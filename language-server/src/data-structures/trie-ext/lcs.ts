export function longestCommonSequence(heystack: string, needle: string, caseSensitive = false): number {
  if (!caseSensitive) {
    heystack = heystack.toLowerCase()
    needle = needle.toLowerCase()
  }

  const table = Array.from(Array(needle.length + 1), () => Array.from(Array(heystack.length + 1), () => 0))

  for (let i = 1; i <= heystack.length; i++) {
    for (let j = 1; j <= needle.length; j++) {
      const heystackChar = heystack[i - 1]
      const needleChar = needle[j - 1]

      if (heystackChar === needleChar) {
        table[j][i] = table[j - 1][i - 1] + 1
      } else {
        table[j][i] = Math.max(table[j - 1][i], table[j][i - 1])
      }
    }
  }

  return table[needle.length][heystack.length]
}

export function getMatchingText(heystacks: string[], needle: string): string[] {
  return heystacks.filter((heystack) => longestCommonSequence(heystack, needle) === needle.length)
}
