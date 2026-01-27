import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// 업로드 디렉토리 생성
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer 스토리지 설정
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  },
});

// 파일 필터 (이미지, PDF, 문서 등 허용)
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('지원하지 않는 파일 형식입니다.'));
  }
};

// Multer 인스턴스
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB 제한
  },
});

// 한글 파일명 디코딩 (Latin1 -> UTF-8)
const decodeFilename = (filename: string): string => {
  try {
    return Buffer.from(filename, 'latin1').toString('utf8');
  } catch {
    return filename;
  }
};

export class UploadController {
  // 단일 파일 업로드
  uploadFile = async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: '파일이 없습니다.',
        });
      }

      const file = req.file;
      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 4000}`;
      const fileUrl = `${baseUrl}/uploads/${file.filename}`;

      return res.json({
        success: true,
        data: {
          name: decodeFilename(file.originalname),
          url: fileUrl,
          type: file.mimetype,
          size: file.size,
        },
      });
    } catch (error) {
      console.error('File upload error:', error);
      return res.status(500).json({
        success: false,
        message: '파일 업로드에 실패했습니다.',
      });
    }
  };

  // 다중 파일 업로드
  uploadFiles = async (req: Request, res: Response) => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: '파일이 없습니다.',
        });
      }

      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 4000}`;
      const files = req.files.map((file) => ({
        name: decodeFilename(file.originalname),
        url: `${baseUrl}/uploads/${file.filename}`,
        type: file.mimetype,
        size: file.size,
      }));

      return res.json({
        success: true,
        data: files,
      });
    } catch (error) {
      console.error('Files upload error:', error);
      return res.status(500).json({
        success: false,
        message: '파일 업로드에 실패했습니다.',
      });
    }
  };

  // 파일 삭제
  deleteFile = async (req: Request, res: Response) => {
    try {
      const { filename } = req.params;
      const filePath = path.join(uploadDir, filename);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return res.json({
        success: true,
        message: '파일이 삭제되었습니다.',
      });
    } catch (error) {
      console.error('File delete error:', error);
      return res.status(500).json({
        success: false,
        message: '파일 삭제에 실패했습니다.',
      });
    }
  };
}
