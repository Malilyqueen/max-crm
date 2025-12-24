export function getTenant() {
  const qs = new URLSearchParams(location.search);
  const t = qs.get('tenant') || localStorage.getItem('tenant') || 'damath';
  localStorage.setItem('tenant', t);
  return t;
}

export function getRole() {
  const qs = new URLSearchParams(location.search);
  return qs.get('role') || 'admin';
}

export function getPreviewDefault() {
  return import.meta.env.VITE_FLAG_PREVIEW_DEFAULT === 'true';
}