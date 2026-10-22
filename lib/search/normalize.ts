/** Lower-case, strip accents and punctuation, expand "&", collapse whitespace. */
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9.%+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const STOP = new Set(['and', 'the', 'of', 'in', 'for', 'a', 'to'])

export function tokenize(input: string): string[] {
  const tokens = normalize(input).split(' ').filter(Boolean)
  const meaningful = tokens.filter((t) => !STOP.has(t))
  return meaningful.length ? meaningful : tokens
}

/** Naive singular form so "tyres" finds "tyre" and "panels" finds "panel". */
export function stem(token: string): string {
  if (token.length > 4 && token.endsWith('ies')) return `${token.slice(0, -3)}y`
  if (token.length > 4 && token.endsWith('es') && /(ss|x|ch|sh)es$/.test(token)) return token.slice(0, -2)
  if (token.length > 3 && token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1)
  return token
}
