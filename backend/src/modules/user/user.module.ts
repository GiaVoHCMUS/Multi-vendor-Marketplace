import { AddressRepository } from './address.repository';
import { UserController } from './user.controller';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';

const userService = new UserService(new UserRepository(), new AddressRepository());

export const userController = new UserController(userService);
