import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function compressImage(base64Str: string, maxWidth = 800, maxHeight = 800, quality = 0.4): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!base64Str.startsWith('data:')) {
      img.setAttribute('crossOrigin', 'anonymous');
    }
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Str);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = (e) => reject(e);
  });
}

export function getYoutubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  
  // Handle YouTube Shorts
  const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/);
  if (shortsMatch && shortsMatch[1]) {
    return `https://www.youtube.com/embed/${shortsMatch[1]}?autoplay=1&mute=1&loop=1&playlist=${shortsMatch[1]}&controls=0&modestbranding=1&rel=0`;
  }
  
  // Handle standard YouTube
  const standardMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (standardMatch && standardMatch[1]) {
    return `https://www.youtube.com/embed/${standardMatch[1]}?autoplay=1&mute=1&loop=1&playlist=${standardMatch[1]}&controls=0&modestbranding=1&rel=0`;
  }
  
  return null;
}

export async function getCroppedImg(imageSrc: string, pixelCrop: { x: number, y: number, width: number, height: number }): Promise<string> {
  const image = new Image();
  if (!imageSrc.startsWith('data:')) {
    image.setAttribute('crossOrigin', 'anonymous');
  }
  
  const imageLoaded = new Promise((resolve, reject) => {
    image.onload = () => resolve(image);
    image.onerror = (error) => reject(new Error('Failed to load image for cropping'));
  });

  image.src = imageSrc;
  await imageLoaded;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return canvas.toDataURL('image/jpeg', 0.9);
}
