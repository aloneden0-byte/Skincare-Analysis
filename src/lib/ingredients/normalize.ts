/**
 * Normalizes a single ingredient token for matching: lowercase, strip common
 * OCR noise/punctuation, unify dash variants, collapse whitespace.
 */
export function normalizeIngredientName(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/[–—]/g, '-')
    .replace(/[.*]+$/g, '') // trailing markers like "Niacinamide*"
    .replace(/\d+(\.\d+)?%/g, '') // trailing concentration percentages
    .replace(/[^a-z0-9\-\s()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
