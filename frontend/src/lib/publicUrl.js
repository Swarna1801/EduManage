export function getPublicAppUrl() {
  const envUrl = (process.env.REACT_APP_PUBLIC_APP_URL || "").trim();
  if (envUrl) return envUrl.replace(/\/+$/, "");
  return window.location.origin;
}

export function buildShareableUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${getPublicAppUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export function isLocalPublicUrl() {
  const url = getPublicAppUrl();
  return /localhost|127\.0\.0\.1/i.test(url);
}
