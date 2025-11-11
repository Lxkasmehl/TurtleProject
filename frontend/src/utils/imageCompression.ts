/**
 * Compress Base64 image by reducing quality/size
 * For mock purposes, we'll store a smaller preview
 * @param base64 - Base64 encoded image string
 * @param maxSize - Maximum dimension in pixels (default: 200)
 * @returns Promise with compressed Base64 string
 */
export function compressPreview(base64: string, maxSize: number = 200): Promise<string> {
  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions to fit within maxSize
      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        // Use lower quality JPEG to reduce size
        const compressed = canvas.toDataURL('image/jpeg', 0.7);
        resolve(compressed);
      } else {
        resolve(base64);
      }
    };
    img.onerror = () => resolve(base64);
    img.src = base64;
  });
}

