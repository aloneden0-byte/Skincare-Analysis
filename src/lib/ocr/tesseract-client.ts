import { postprocessOcrText } from './ocr-postprocess'

export interface OcrProgressEvent {
  status: string
  progress: number // 0-1
}

/**
 * Runs OCR on an image entirely in the browser (Web Worker, no server call)
 * and returns cleaned-up text. `onProgress` reflects Tesseract's own
 * status/progress stream for a UI progress bar.
 */
export async function recognizeIngredientLabel(
  image: File | Blob | string,
  onProgress?: (event: OcrProgressEvent) => void,
): Promise<string> {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      onProgress?.({ status: m.status, progress: m.progress })
    },
  })

  try {
    const {
      data: { text },
    } = await worker.recognize(image)
    return postprocessOcrText(text)
  } finally {
    await worker.terminate()
  }
}
