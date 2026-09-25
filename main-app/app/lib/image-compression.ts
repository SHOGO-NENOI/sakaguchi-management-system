const MAX_EDGE = 1920;
const JPEG_QUALITY = 0.82;

export async function compressPhoto(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/i.test(file.type) || typeof createImageBitmap !== "function") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return file;
    }
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const outputType = file.type === "image/png" && file.size < 700_000 ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, outputType, JPEG_QUALITY));
    if (!blob || blob.size >= file.size) return file;
    const base = file.name.replace(/\.[^.]+$/, "");
    return new File([blob], outputType === "image/jpeg" ? `${base}.jpg` : file.name, {
      type: outputType,
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  }
}
