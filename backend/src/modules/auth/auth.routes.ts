import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '@/shared/middleware/validate.middleware';
import { loginSchema, registerSchema } from './auth.schema';
import { protect } from '@/shared/middleware/auth.middleware';

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', protect, authController.logout);

export default router;
