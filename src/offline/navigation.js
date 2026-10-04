export function sitePath(pathname) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const suffix = pathname === '/' ? '/' : (pathname.startsWith('/') ? pathname : `/${pathname}`);
  return `${base}${suffix}`;
}

export function goHome() {
  window.location.assign(sitePath('/'));
}

export function restartPlay() {
  window.location.assign(sitePath('/play/'));
}
