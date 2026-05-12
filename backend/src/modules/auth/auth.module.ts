import { UserRepository } from '../user/user.repository';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const authService = new AuthService(new UserRepository());

export const authController = new AuthController(authService);
