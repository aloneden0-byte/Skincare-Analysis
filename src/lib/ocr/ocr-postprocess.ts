/**
 * Cleans up common Tesseract misreads on small drugstore-label print before
 * the user sees the text for manual correction.
 */
export function postprocessOcrText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    // A comma often gets read as a period between ingredient names.
    .replace(/(\w)\.\s+(?=[A-Z])/g, '$1, ')
    .trim()
}
