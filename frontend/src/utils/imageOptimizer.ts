/**
 * imageOptimizer.ts — High-performance, memory-safe client-side image downscaling.
 *
 * Prevents Android Low Memory Killer (LMK) crashes on high-megapixel (12MP-50MP) photos
 * by downsampling images to optimal OCR resolution before loading into React state or DOM.
 */

export interface OptimizeOptions {
  maxDimension?: number;
  quality?: number;
  mimeType?: string;
}

export interface OptimizedResult {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  originalSize: number;
  optimizedSize: number;
}

/**
 * Optimizes an image source (File, Blob, or Data URL) down to maxDimension
 * using hardware-accelerated createImageBitmap where available, with fallback to HTMLImageElement.
 */
export async function optimizeImage(
  source: File | Blob | string,
  options: OptimizeOptions = {}
): Promise<OptimizedResult> {
  const maxDimension = options.maxDimension || 1920;
  const quality = options.quality ?? 0.90;
  const mimeType = options.mimeType || "image/jpeg";

  let originalBlob: Blob;
  if (typeof source === "string") {
    const res = await fetch(source);
    originalBlob = await res.blob();
  } else {
    originalBlob = source;
  }
  const originalSize = originalBlob.size;

  // Method 1: Modern createImageBitmap with hardware downsampling (Chrome, Firefox, Safari 15+)
  if (typeof window !== "undefined" && "createImageBitmap" in window) {
    try {
      // First get original dimensions cheaply
      const tempBmp = await createImageBitmap(originalBlob);
      const origW = tempBmp.width;
      const origH = tempBmp.height;
      tempBmp.close();

      let targetW = origW;
      let targetH = origH;
      if (Math.max(origW, origH) > maxDimension) {
        const scale = maxDimension / Math.max(origW, origH);
        targetW = Math.round(origW * scale);
        targetH = Math.round(origH * scale);
      }

      // Downscale directly using GPU/Skia via resize options
      const scaledBmp = await createImageBitmap(originalBlob, {
        resizeWidth: targetW,
        resizeHeight: targetH,
        resizeQuality: "high",
      });

      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        scaledBmp.close();
        throw new Error("Could not create 2D canvas context");
      }

      ctx.drawImage(scaledBmp, 0, 0, targetW, targetH);
      scaledBmp.close();

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (b) resolve(b);
            else reject(new Error("Canvas toBlob failed"));
          },
          mimeType,
          quality
        );
      });

      const dataUrl = canvas.toDataURL(mimeType, quality);
      canvas.width = 0;
      canvas.height = 0;

      return {
        blob,
        dataUrl,
        width: targetW,
        height: targetH,
        originalSize,
        optimizedSize: blob.size,
      };
    } catch (err) {
      console.warn("createImageBitmap optimization failed, falling back to Image tag:", err);
    }
  }

  // Method 2: Fallback via HTMLImageElement
  return new Promise<OptimizedResult>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(originalBlob);
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const origW = img.naturalWidth || img.width;
      const origH = img.naturalHeight || img.height;

      let targetW = origW;
      let targetH = origH;
      if (Math.max(origW, origH) > maxDimension) {
        const scale = maxDimension / Math.max(origW, origH);
        targetW = Math.round(origW * scale);
        targetH = Math.round(origH * scale);
      }

      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas 2D context unavailable"));
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, targetW, targetH);

      canvas.toBlob(
        (b) => {
          if (!b) {
            reject(new Error("Failed to export canvas blob"));
            return;
          }
          const dataUrl = canvas.toDataURL(mimeType, quality);
          canvas.width = 0;
          canvas.height = 0;
          resolve({
            blob: b,
            dataUrl,
            width: targetW,
            height: targetH,
            originalSize,
            optimizedSize: b.size,
          });
        },
        mimeType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image for optimization"));
    };

    img.src = objectUrl;
  });
}
