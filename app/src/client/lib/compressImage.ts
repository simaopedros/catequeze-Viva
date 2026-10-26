/** Downscale an image file to a small JPEG data URL (fits a DB text column). */
export function compressImageToDataUrl(
  file: File,
  maxSize = 200,
  quality = 0.6,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("invalid image"));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width;
        let h = img.height;
        if (w > h && w > maxSize) {
          h *= maxSize / w;
          w = maxSize;
        } else if (h > maxSize) {
          w *= maxSize / h;
          h = maxSize;
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
