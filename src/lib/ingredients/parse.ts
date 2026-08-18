/**
 * Splits a raw INCI ingredient-list string into individual ingredient tokens.
 * Commas inside parentheses (e.g. "Water (Aqua)") do not split the token.
 */
export function parseIngredientList(raw: string): string[] {
  const tokens: string[] = []
  let current = ''
  let depth = 0

  for (const char of raw) {
    if (char === '(') depth++
    if (char === ')') depth = Math.max(0, depth - 1)

    if (char === ',' && depth === 0) {
      tokens.push(current)
      current = ''
      continue
    }

    if (char === '\n' && depth === 0) {
      tokens.push(current)
      current = ''
      continue
    }

    current += char
  }
  if (current.trim()) tokens.push(current)

  return tokens
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 60) // sanity bound against garbage OCR output
}
