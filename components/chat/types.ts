export const AUTH_STORAGE_KEY = "ermis-email-auth";

export type AuthSession = {
  token: string;
  refreshToken?: string;
  userId?: string;
  email: string;
};
