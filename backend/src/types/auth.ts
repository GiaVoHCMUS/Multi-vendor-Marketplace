import { UserRole } from "@prisma/client";

export interface AppJwtPayload {
  id: string;
  role?: UserRole;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
  };
  accessToken: string;
  refreshToken: string;
}

