const JPEG_QUALITY = 0.85;

/**
 * Resize and compress image to fit max dimensions and target file size.
 * @param {File} file - PNG or JPEG file
 * @param {number} maxW
 * @param {number} maxH
 * @param {number} maxSizeBytes
 * @returns {Promise<File>}
 */
export function resizeAndCompressImage(file, maxW, maxH, maxSizeBytes) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const isJpeg = file.type === 'image/jpeg' || file.type === 'image/jpg';
      let w = img.width;
      let h = img.height;
      if (w > maxW || h > maxH) {
        const r = Math.min(maxW / w, maxH / h);
        w = Math.round(w * r);
        h = Math.round(h * r);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas not supported'));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);

      const tryBlob = (quality) => {
        return new Promise((res) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                res(null);
                return;
              }
              if (blob.size <= maxSizeBytes) {
                res(new File([blob], file.name.replace(/\.[^.]+$/, isJpeg ? '.jpg' : '.png'), {
                  type: blob.type,
                  lastModified: Date.now(),
                }));
              } else {
                res(null);
              }
            },
            isJpeg ? 'image/jpeg' : 'image/png',
            quality
          );
        });
      };

      const attempt = (quality) => {
        tryBlob(quality).then((result) => {
          if (result) {
            resolve(result);
            return;
          }
          if (isJpeg && quality > 0.3) {
            attempt(quality - 0.15);
          } else if (w > 100 && h > 100) {
            w = Math.max(100, Math.round(w * 0.8));
            h = Math.max(100, Math.round(h * 0.8));
            canvas.width = w;
            canvas.height = h;
            ctx.drawImage(img, 0, 0, w, h);
            tryBlob(isJpeg ? 0.7 : 1).then((r) => (r ? resolve(r) : attempt(0.5)));
          } else {
            tryBlob(0.5).then((r) => resolve(r || new File([file], file.name, { type: file.type, lastModified: file.lastModified })));
          }
        });
      };

      attempt(isJpeg ? JPEG_QUALITY : 1);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}
