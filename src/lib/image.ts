const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.75;

// Receipts are photos straight from a phone camera (often 3000px+, several
// MB each). Reps submit a lot of these against a free Supabase Storage
// tier, so every upload is downscaled and re-encoded as JPEG before it
// leaves the device. A receipt only needs to stay legible, not print-res.
export async function compressReceiptImage(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
    );
    if (!blob || blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg' });
  } catch {
    // Unsupported format or decode failure — upload the original rather
    // than block the submission.
    return file;
  }
}
