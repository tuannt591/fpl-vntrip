export const AUTH_STORAGE_KEY = "ermis-email-auth";

export type AuthSessionProfile = {
  email: string;
  displayName: string | null;
};

export type AuthSessionManager = {
  managerAvatar: string | null;
};

export type AuthSession = {
  token: string;
  refreshToken?: string;
  userId?: string;
  email: string;
  /**
   * Display-only data returned when the app session is created. It is never
   * used to authorize a request; the HTTP-only app-session cookie does that.
   */
  profile?: AuthSessionProfile;
  manager?: AuthSessionManager | null;
};
