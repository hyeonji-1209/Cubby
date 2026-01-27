import { Router } from 'express';
import { LocationController } from '../controllers/location.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const locationController = new LocationController();

// 모든 라우트에 인증 필요
router.use(authMiddleware);

// 그룹의 자주 쓰는 장소 목록
router.get('/groups/:groupId/locations', locationController.getByGroup);

// 자주 쓰는 장소 추가 (관리자)
router.post('/groups/:groupId/locations', locationController.create);

// 자주 쓰는 장소 수정 (관리자)
router.patch('/groups/:groupId/locations/:locationId', locationController.update);

// 자주 쓰는 장소 삭제 (관리자)
router.delete('/groups/:groupId/locations/:locationId', locationController.delete);

export default router;
