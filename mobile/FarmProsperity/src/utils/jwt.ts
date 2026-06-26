/**
 * JWT payload decoder.
 *
 * Decodes the base64url-encoded payload from a JWT access token without
 * verifying the signature (signature verification is the server's job).
 * Used by the auth store to extract the `perms`, `role_id`, `state`, and
 * `districts` claims that the backend embeds at login time (Phase 2).
 *
 * Uses a pure-JS base64 decode so it works without `dom` lib types and
 * without depending on Node's `Buffer`.
 */

export interface JWTPayload {
  user_id: number;
  username: string;
  email: string;
  role: string;
  role_id: string;
  is_staff: boolean;
  is_superuser: boolean;
  full_name: string;
  state: string;
  districts: string[];
  perms: string[];
  exp: number;
  iat: number;
}

// ─── Base64url decoder (pure JS — no dom / Buffer required) ──────────────────

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64urlToString(b64url: string): string {
  // Convert base64url → standard base64 and strip padding
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/').replace(/[^A-Za-z0-9+/]/g, '');
  let output = '';
  for (let i = 0; i < b64.length; i += 4) {
    const e1 = B64_CHARS.indexOf(b64[i]     ?? '=');
    const e2 = B64_CHARS.indexOf(b64[i + 1] ?? '=');
    const e3 = B64_CHARS.indexOf(b64[i + 2] ?? '=');
    const e4 = B64_CHARS.indexOf(b64[i + 3] ?? '=');
    output += String.fromCharCode((e1 << 2) | (e2 >> 4));
    if (b64[i + 2] && b64[i + 2] !== '=') output += String.fromCharCode(((e2 & 0x0f) << 4) | (e3 >> 2));
    if (b64[i + 3] && b64[i + 3] !== '=') output += String.fromCharCode(((e3 & 0x03) << 6) | e4);
  }
  return output;
}

/**
 * Decode a JWT access token and return its payload.
 * Returns null if the token is missing, malformed, or cannot be parsed.
 */
export function decodeJWTPayload(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // Decode bytes → raw string → handle UTF-8 multibyte characters
    const raw = base64urlToString(parts[1]);

    // Convert each byte to a proper percent-encoded URI component, then decode
    const json = decodeURIComponent(
      raw.split('').map((c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''),
    );

    return JSON.parse(json) as JWTPayload;
  } catch {
    return null;
  }
}
