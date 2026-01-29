/**
 * 파일 업로드 관련 유틸리티
 */

// 지원하는 이미지 MIME 타입
export const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;

export type ImageMimeType = typeof IMAGE_MIME_TYPES[number];

// 파일 크기 상수
export const FILE_SIZE = {
  KB: 1024,
  MB: 1024 * 1024,
  GB: 1024 * 1024 * 1024,
} as const;

// 기본 제한
export const DEFAULT_LIMITS = {
  IMAGE_MAX_SIZE: 5 * FILE_SIZE.MB, // 5MB
  DOCUMENT_MAX_SIZE: 10 * FILE_SIZE.MB, // 10MB
} as const;

/**
 * 파일 크기를 읽기 쉬운 형태로 변환
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * 파일 확장자 추출
 */
export const getFileExtension = (filename: string): string => {
  const ext = filename.split('.').pop();
  return ext ? ext.toLowerCase() : '';
};

/**
 * 파일이 이미지인지 확인
 */
export const isImageFile = (file: File): boolean => {
  return IMAGE_MIME_TYPES.includes(file.type as ImageMimeType);
};

/**
 * 파일 크기 검증
 */
export const validateFileSize = (file: File, maxSize: number): boolean => {
  return file.size <= maxSize;
};

/**
 * 파일 MIME 타입 검증
 */
export const validateMimeType = (file: File, allowedTypes: readonly string[]): boolean => {
  return allowedTypes.includes(file.type);
};

/**
 * 이미지 파일 검증 (크기 + 타입)
 */
export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

export const validateImageFile = (
  file: File,
  maxSize: number = DEFAULT_LIMITS.IMAGE_MAX_SIZE
): ImageValidationResult => {
  if (!isImageFile(file)) {
    return {
      valid: false,
      error: '이미지 파일만 업로드할 수 있습니다. (jpg, png, gif, webp)',
    };
  }

  if (!validateFileSize(file, maxSize)) {
    return {
      valid: false,
      error: `파일 크기는 ${formatFileSize(maxSize)} 이하여야 합니다.`,
    };
  }

  return { valid: true };
};

/**
 * 파일을 Base64로 변환
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * 이미지 압축 (canvas 사용)
 */
export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1
}

export const compressImage = (
  file: File,
  options: CompressOptions = {}
): Promise<Blob> => {
  const { maxWidth = 1200, maxHeight = 1200, quality = 0.8 } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      // 비율 유지하면서 크기 조정
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

/**
 * 파일 다운로드 트리거
 */
export const downloadFile = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * 드래그 앤 드롭 이벤트에서 파일 추출
 */
export const getFilesFromDragEvent = (event: DragEvent): File[] => {
  const files: File[] = [];

  if (event.dataTransfer?.items) {
    for (let i = 0; i < event.dataTransfer.items.length; i++) {
      const item = event.dataTransfer.items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
  } else if (event.dataTransfer?.files) {
    for (let i = 0; i < event.dataTransfer.files.length; i++) {
      files.push(event.dataTransfer.files[i]);
    }
  }

  return files;
};
