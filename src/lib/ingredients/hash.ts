/**
 * Deterministic dedup key for a product: sha256 of its ordered canonical
 * ingredient IDs. Two scans that resolve to the same ingredient sequence
 * collapse to the same product row instead of being scored twice.
 */
export async function hashIngredientSequence(orderedIngredientIds: string[]): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(orderedIngredientIds.join('|'))
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
