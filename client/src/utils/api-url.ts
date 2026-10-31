/**
 * Prefix a relative or absolute API URL with the correct base path
 * if the app is mounted under a subpath like `/fun/`.
 */
export function apiUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const prefix = window.location.pathname.startsWith("/fun") ? "/fun" : "";
  return `${prefix}${cleanPath}`;
}

