export const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(
  /\/$/,
  ""
);

export function apiUrl(path) {
  if (!path.startsWith("/")) path = `/${path}`;
  if (!API_BASE) return `/api${path}`;
  return `${API_BASE}${path}`;
}
