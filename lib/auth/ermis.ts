import 'server-only';

import { ermisConfig } from '@/config/ermis';

type JwtClaims = Record<string, unknown> & {
  exp?: number;
};

type ErmisUser = {
  id?: unknown;
  user_id?: unknown;
  email?: unknown;
  identifier?: unknown;
  name?: unknown;
  display_name?: unknown;
};

type ErmisUserEnvelope = ErmisUser & {
  user?: unknown;
  data?: unknown;
};

export type ErmisVerificationErrorCode =
  | 'INVALID_TOKEN'
  | 'MISSING_USER_ID'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_REJECTED'
  | 'USER_MISMATCH'
  | 'INVALID_PROFILE'
  | 'MISSING_EMAIL'
  | 'ERMIS_UNAVAILABLE';

export class ErmisVerificationError extends Error {
  constructor(
    public readonly code: ErmisVerificationErrorCode,
    public readonly publicMessage: string,
  ) {
    super(publicMessage);
    this.name = 'ErmisVerificationError';
  }
}

export type VerifiedErmisIdentity = {
  userId: string;
  email: string;
  displayName: string | null;
  tokenExpiresAt: number | null;
};

export type ErmisIdentityHint = {
  userId?: string;
  email?: string;
};

function stripBearerPrefix(token: string) {
  return token.replace(/^Bearer\s+/i, '').trim();
}

function decodeJwtClaims(token: string): JwtClaims | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as JwtClaims;
  } catch {
    return null;
  }
}

function stringClaim(claims: JwtClaims, keys: string[]): string | null {
  for (const key of keys) {
    const value = claims[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeUser(raw: unknown): ErmisUser | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const envelope = raw as ErmisUserEnvelope;
  if (envelope.user && typeof envelope.user === 'object') {
    return normalizeUser(envelope.user);
  }
  if (envelope.data && typeof envelope.data === 'object') {
    return normalizeUser(envelope.data);
  }

  return envelope;
}

async function fetchErmisUser(
  path: string,
  token: string,
): Promise<{ response: Response; user: ErmisUser | null }> {
  const userServiceBase = `${ermisConfig.apiUrl.replace(/\/+$/, '')}/uss/v1`;
  const url = new URL(`${userServiceBase}${path}`);
  url.searchParams.set('project_id', ermisConfig.projectId);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        'stream-auth-type': 'jwt',
        'X-Stream-Client': 'fpl-vntrip-server/1.0',
      },
      cache: 'no-store',
    });
  } catch {
    throw new ErmisVerificationError(
      'ERMIS_UNAVAILABLE',
      'Không thể kết nối tới hệ thống Chat. Vui lòng thử lại.',
    );
  }

  if (!response.ok) return { response, user: null };

  try {
    return { response, user: normalizeUser(await response.json()) };
  } catch {
    return { response, user: null };
  }
}

export async function verifyErmisAccessToken(
  rawToken: string,
  hint: ErmisIdentityHint = {},
): Promise<VerifiedErmisIdentity> {
  const token = stripBearerPrefix(rawToken);
  if (!token || token.length > 16_384) {
    throw new ErmisVerificationError(
      'INVALID_TOKEN',
      'Phiên đăng nhập Chat không hợp lệ. Vui lòng đăng nhập lại.',
    );
  }

  const claims = decodeJwtClaims(token);
  const tokenUserId = claims
    ? stringClaim(claims, ['user_id', 'sub', 'id'])
    : null;
  const hintedUserId = optionalString(hint.userId);

  if (hintedUserId && hintedUserId.length > 256) {
    throw new ErmisVerificationError(
      'MISSING_USER_ID',
      'Mã người dùng Chat không hợp lệ. Vui lòng đăng nhập lại.',
    );
  }

  if (tokenUserId && hintedUserId && tokenUserId !== hintedUserId) {
    throw new ErmisVerificationError(
      'USER_MISMATCH',
      'Thông tin người dùng không khớp với phiên Chat.',
    );
  }

  const userId = tokenUserId || hintedUserId;
  if (!userId) {
    throw new ErmisVerificationError(
      'MISSING_USER_ID',
      'Phiên Chat thiếu mã người dùng. Vui lòng đăng xuất và đăng nhập lại.',
    );
  }

  const tokenExpiresAt =
    typeof claims?.exp === 'number' && Number.isFinite(claims.exp)
      ? claims.exp
      : null;

  if (tokenExpiresAt !== null && tokenExpiresAt <= Math.floor(Date.now() / 1000)) {
    throw new ErmisVerificationError(
      'TOKEN_EXPIRED',
      'Phiên Chat đã hết hạn. Vui lòng đăng nhập lại.',
    );
  }

  // Prefer the current-user endpoint because it binds the returned profile to
  // the bearer token. Some legacy Ermis deployments only expose /users/:id,
  // so that endpoint is kept as a compatibility fallback.
  const currentUserResult = await fetchErmisUser('/users/me', token);
  let user = currentUserResult.user;

  if (!currentUserResult.response.ok) {
    const profileResult = await fetchErmisUser(
      `/users/${encodeURIComponent(userId)}`,
      token,
    );
    if (!profileResult.response.ok) {
      throw new ErmisVerificationError(
        profileResult.response.status >= 500
          ? 'ERMIS_UNAVAILABLE'
          : 'TOKEN_REJECTED',
        profileResult.response.status >= 500
          ? 'Hệ thống Chat đang tạm thời không phản hồi. Vui lòng thử lại.'
          : 'Phiên Chat không còn hợp lệ. Vui lòng đăng nhập lại.',
      );
    }
    user = profileResult.user;
  }

  if (!user) {
    throw new ErmisVerificationError(
      'INVALID_PROFILE',
      'Không đọc được thông tin người dùng từ hệ thống Chat.',
    );
  }

  const returnedUserId = optionalString(user.id) || optionalString(user.user_id);
  if (!returnedUserId) {
    throw new ErmisVerificationError(
      'INVALID_PROFILE',
      'Hồ sơ người dùng Chat không có mã định danh.',
    );
  }
  if (returnedUserId !== userId) {
    throw new ErmisVerificationError(
      'USER_MISMATCH',
      'Thông tin người dùng không khớp với phiên Chat.',
    );
  }

  const hintedEmail = optionalString(hint.email)?.toLowerCase() || null;
  const email =
    optionalString(user.email)?.toLowerCase() ||
    optionalString(user.identifier)?.toLowerCase() ||
    (claims
      ? stringClaim(claims, ['email', 'identifier'])?.toLowerCase() || null
      : null) ||
    hintedEmail;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ErmisVerificationError(
      'MISSING_EMAIL',
      'Không đọc được email từ phiên Chat. Vui lòng đăng nhập lại bằng email.',
    );
  }

  const displayName =
    optionalString(user.display_name) || optionalString(user.name) || null;

  return { userId, email, displayName, tokenExpiresAt };
}
