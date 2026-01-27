import { Router } from 'express';
import { UploadController, upload } from '../controllers/upload.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const uploadController = new UploadController();

// 모든 업로드는 인증 필요
router.use(authMiddleware);

// 단일 파일 업로드
router.post('/single', upload.single('file'), uploadController.uploadFile);

// 다중 파일 업로드 (최대 5개)
router.post('/multiple', upload.array('files', 5), uploadController.uploadFiles);

// 파일 삭제
router.delete('/:filename', uploadController.deleteFile);

export default router;
