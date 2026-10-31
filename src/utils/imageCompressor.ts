/**
 * Utility for client-side image compression before upload.
 * Reduces 10MB-25MB camera photos down to ~300KB-600KB while maintaining
 * sharp 1800px resolution for high-accuracy Gemini AI OCR text extraction.
 */

export interface PreparedUpload {
  base64: string;
  mimeType: string;
  fileName: string;
  originalSize: number;
  compressedSize: number;
}

export async function prepareFileForUpload(file: File): Promise<PreparedUpload> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  
  if (isPdf) {
    const base64 = await readFileAsDataURL(file);
    return {
      base64,
      mimeType: 'application/pdf',
      fileName: file.name,
      originalSize: file.size,
      compressedSize: file.size
    };
  }

  // If it's an image (JPEG, PNG, HEIC, WEBP, etc.), compress via HTML5 canvas
  try {
    const compressed = await compressImageFile(file, 1800, 1800, 0.82);
    return compressed;
  } catch (err) {
    console.warn('Client-side compression fallback to raw data URL:', err);
    const base64 = await readFileAsDataURL(file);
    return {
      base64,
      mimeType: file.type || 'image/jpeg',
      fileName: file.name,
      originalSize: file.size,
      compressedSize: file.size
    };
  }
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file from device storage'));
    reader.readAsDataURL(file);
  });
}

function compressImageFile(
  file: File,
  maxWidth = 1800,
  maxHeight = 1800,
  quality = 0.82
): Promise<PreparedUpload> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width <= 0 || height <= 0) {
        width = 1600;
        height = 1200;
      }

      // Calculate aspect ratio preserving dimensions
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Canvas 2D context is not supported'));
      }

      // Fill white background (ensures transparent PNG or dark backgrounds don't turn black)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      // Draw resized image
      ctx.drawImage(img, 0, 0, width, height);

      // Export as optimized JPEG
      const base64 = canvas.toDataURL('image/jpeg', quality);

      // Estimate compressed size in bytes (approx 0.75 * base64 length minus header)
      const commaIdx = base64.indexOf(',');
      const rawB64Length = commaIdx >= 0 ? base64.length - commaIdx - 1 : base64.length;
      const compressedSize = Math.round((rawB64Length * 3) / 4);

      const safeName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';

      resolve({
        base64,
        mimeType: 'image/jpeg',
        fileName: safeName,
        originalSize: file.size,
        compressedSize
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image in browser for compression'));
    };

    img.src = objectUrl;
  });
}

