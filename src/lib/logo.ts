// Shrinking a logo in the browser before it's sent (plan: images are re-encoded on upload, which
// strips hidden details such as a photo's location). PNG keeps a see-through background; a big
// photo that stays too heavy as PNG goes as JPEG on white instead.
import { fitLogo, LOGO_UPLOAD_MAX_BYTES, logoProblem } from "@brillianda/core/branding";

const toBlob = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

export async function shrinkLogo(file: File): Promise<{ ok: true; file: File } | { ok: false; message: string }> {
  const problem = logoProblem(file);
  if (problem) return { ok: false, message: problem };
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return { ok: false, message: "We couldn’t open this image. Try saving it again as PNG or JPG." };
  }
  const { width, height } = fitLogo(bitmap.width, bitmap.height);
  const canvas = Object.assign(document.createElement("canvas"), { width, height });
  const context = canvas.getContext("2d")!;
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let blob = await toBlob(canvas, "image/png");
  let type = "image/png";
  if (!blob || blob.size > LOGO_UPLOAD_MAX_BYTES) {
    context.globalCompositeOperation = "destination-over";
    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, width, height);
    blob = await toBlob(canvas, "image/jpeg", 0.88);
    type = "image/jpeg";
  }
  if (!blob || blob.size > LOGO_UPLOAD_MAX_BYTES) return { ok: false, message: "This image is too detailed to use as a logo. Try a simpler version." };
  return { ok: true, file: new File([blob], type === "image/png" ? "logo.png" : "logo.jpg", { type }) };
}
