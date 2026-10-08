import { getSupabaseUrl } from './env'
import { getSupabaseClient } from './supabase'

const BUCKET = 'progress-photos'
const MAX_EDGE = 1080
const JPEG_QUALITY = 0.8

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read that image.'))
    }
    img.src = url
  })
}

export async function compressProgressPhoto(file: File): Promise<Blob> {
  const img = await loadImageFromFile(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))
  const width = Math.max(1, Math.round(img.width * scale))
  const height = Math.max(1, Math.round(img.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Could not prepare image for upload.')
  }
  ctx.drawImage(img, 0, 0, width, height)

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result)
        else reject(new Error('Could not compress image.'))
      },
      'image/jpeg',
      JPEG_QUALITY,
    )
  })

  return blob
}

export async function uploadProgressPhoto(childId: string, file: File): Promise<string> {
  const compressed = await compressProgressPhoto(file)
  const objectPath = `${childId}/${crypto.randomUUID()}.jpg`
  const supabase = getSupabaseClient()

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(objectPath, compressed, {
      contentType: 'image/jpeg',
      upsert: false,
    })

  if (uploadError) {
    throw uploadError
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(objectPath)
  const publicUrl = data.publicUrl
  if (!publicUrl) {
    return `${getSupabaseUrl()}/storage/v1/object/public/${BUCKET}/${objectPath}`
  }
  return publicUrl
}
