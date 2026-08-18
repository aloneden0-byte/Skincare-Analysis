import { supabase } from '@/lib/supabase'
import type { Ingredient, ParsedIngredientMatch } from '@/types'
import { matchIngredient, type MatchCandidate } from './match'

function titleCase(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .map((word) => (word.length > 0 ? word[0].toUpperCase() + word.slice(1).toLowerCase() : word))
    .join(' ')
}

async function fetchIngredientCorpus(): Promise<Ingredient[]> {
  const { data, error } = await supabase.from('ingredients').select('*')
  if (error) throw new Error(`Failed to load ingredient database: ${error.message}`)
  return data ?? []
}

async function insertPlaceholderIngredient(rawToken: string): Promise<Ingredient> {
  const canonicalName = titleCase(rawToken)
  const { data, error } = await supabase
    .from('ingredients')
    .insert({
      canonical_name: canonicalName,
      aliases: [],
      category: 'other',
      is_rated: false,
      source: 'auto-placeholder',
    })
    .select('*')
    .single()

  if (!error && data) return data

  // Most likely cause of failure: a concurrent insert already created this
  // canonical name. Fall back to fetching the existing row instead of
  // failing the whole scan.
  const { data: existing, error: fetchError } = await supabase
    .from('ingredients')
    .select('*')
    .eq('canonical_name', canonicalName)
    .maybeSingle()

  if (existing) return existing
  throw new Error(`Failed to resolve ingredient "${rawToken}": ${fetchError?.message ?? error?.message}`)
}

/**
 * Resolves an ordered list of raw OCR ingredient tokens against the shared
 * ingredient database: exact/alias/fuzzy match first, auto-creating a
 * neutral "unrated" placeholder row for anything genuinely new. This is
 * both what makes scans fast for previously-seen ingredients (the cache)
 * and what lets the database grow over time.
 */
export async function resolveIngredientTokens(rawTokens: string[]): Promise<ParsedIngredientMatch[]> {
  const corpus = await fetchIngredientCorpus()
  const corpusById = new Map(corpus.map((i) => [i.id, i]))
  const candidates: MatchCandidate[] = corpus.map((i) => ({
    id: i.id,
    canonical_name: i.canonical_name,
    aliases: i.aliases,
  }))

  const results: ParsedIngredientMatch[] = []

  for (let position = 0; position < rawTokens.length; position++) {
    const rawToken = rawTokens[position]
    const { candidate, score } = matchIngredient(rawToken, candidates)

    let ingredient: Ingredient
    if (candidate) {
      ingredient = corpusById.get(candidate.id)!
    } else {
      ingredient = await insertPlaceholderIngredient(rawToken)
      corpusById.set(ingredient.id, ingredient)
      candidates.push({ id: ingredient.id, canonical_name: ingredient.canonical_name, aliases: ingredient.aliases })
    }

    results.push({ rawToken, ingredient, matchScore: score, position })
  }

  return results
}
