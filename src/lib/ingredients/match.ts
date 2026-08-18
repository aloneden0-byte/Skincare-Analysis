import { distance } from 'fastest-levenshtein'
import { normalizeIngredientName } from './normalize'

export interface MatchCandidate {
  id: string
  canonical_name: string
  aliases: string[]
}

export interface MatchResult {
  candidate: MatchCandidate | null
  score: number | null // 1 = exact, null = no match found
}

const FUZZY_THRESHOLD = 0.82

function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  return 1 - distance(a, b) / maxLen
}

/**
 * Matches a raw OCR ingredient token against a corpus of known ingredients:
 * exact/alias match first, then fuzzy match above FUZZY_THRESHOLD.
 */
export function matchIngredient(rawToken: string, corpus: MatchCandidate[]): MatchResult {
  const normalizedToken = normalizeIngredientName(rawToken)
  if (!normalizedToken) return { candidate: null, score: null }

  for (const candidate of corpus) {
    const names = [candidate.canonical_name, ...candidate.aliases].map(normalizeIngredientName)
    if (names.includes(normalizedToken)) {
      return { candidate, score: 1 }
    }
  }

  let best: MatchCandidate | null = null
  let bestScore = 0
  for (const candidate of corpus) {
    const names = [candidate.canonical_name, ...candidate.aliases].map(normalizeIngredientName)
    for (const name of names) {
      const score = similarity(normalizedToken, name)
      if (score > bestScore) {
        bestScore = score
        best = candidate
      }
    }
  }

  if (best && bestScore >= FUZZY_THRESHOLD) {
    return { candidate: best, score: bestScore }
  }

  return { candidate: null, score: null }
}
