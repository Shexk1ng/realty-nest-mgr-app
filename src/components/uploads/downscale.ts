// Zmniejsza obraz w przeglądarce do formatu JPEG przed wysyłką, aby ograniczyć transfer
export function downscaleImage(
  file: File,
  { maxEdge = 1600, square = false, quality = 0.85 }: { maxEdge?: number; square?: boolean; quality?: number } = {},
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file isn't a valid image."));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(file);

        if (square) {
          canvas.width = maxEdge;
          canvas.height = maxEdge;
          const edge = Math.min(img.width, img.height);
          const sx = (img.width - edge) / 2;
          const sy = (img.height - edge) / 2;
          ctx.drawImage(img, sx, sy, edge, edge, 0, 0, maxEdge, maxEdge);
        } else {
          const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }

        canvas.toBlob((blob) => resolve(blob ?? file), "image/jpeg", quality);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
