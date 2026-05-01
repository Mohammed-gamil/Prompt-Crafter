/**
 * Accepts only http(s) URLs. Non-HTTPS is permitted only for localhost/127.0.0.1
 * (developer convenience). Returns a normalised URL string, or throws on violation.
 */
export function validateBaseUrl(raw: string): string {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    throw new Error('Base URL is not a valid URL');
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(`Base URL scheme "${parsed.protocol}" is not allowed — use https://`);
  }

  const isLocalhost =
    parsed.hostname === 'localhost' ||
    parsed.hostname === '127.0.0.1' ||
    parsed.hostname === '::1';

  if (parsed.protocol === 'http:' && !isLocalhost) {
    throw new Error(
      'Base URL must use HTTPS for non-localhost endpoints (API key would be sent in plaintext over HTTP)',
    );
  }

  return parsed.origin + parsed.pathname.replace(/\/+$/, '');
}
