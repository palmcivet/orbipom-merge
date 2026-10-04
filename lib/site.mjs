export const ORIGINAL_RELEASE = 'v1d5-synthesize-tuantuan-web@1.1.2';
const CONTENT_SECURITY_POLICY = "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'none'";

export function normalizeBase(basePath) {
  if (basePath == null) {
    return '';
  }
  const trimmed = String(basePath).trim();
  if (trimmed === '' || trimmed === '/') {
    return '';
  }
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withSlash.replace(/\/+$/, '');
}

export function viteBase(basePath) {
  const normalized = normalizeBase(basePath);
  return normalized ? `${normalized}/` : '/';
}

export function siteUrl(basePath, suffix) {
  const pathSuffix = suffix.startsWith('/') ? suffix : `/${suffix}`;
  return `${normalizeBase(basePath)}${pathSuffix}`;
}

export function cspMeta() {
  return `<meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}">`;
}
