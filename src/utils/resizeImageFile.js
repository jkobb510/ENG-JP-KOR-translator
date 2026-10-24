const MAX_IMAGE_DIMENSION = 1000;
const JPEG_QUALITY = 0.8;

export default function resizeImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read image file'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('Unable to decode image file'));
      image.onload = () => {
        const scale = Math.min(
          1,
          MAX_IMAGE_DIMENSION / image.width,
          MAX_IMAGE_DIMENSION / image.height
        );
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);

        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Unable to process image file'));
          return;
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}