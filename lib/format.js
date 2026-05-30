// Shared formatting helpers — no backend, pure presentation.

export const euro = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n ?? 0);

export const euroCents = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n ?? 0);

export const num = (n) => new Intl.NumberFormat('fr-FR').format(n ?? 0);

export const dateFr = (iso) => {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
  } catch {
    return iso;
  }
};

export const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

// Status → badge tone mapping used across admin tables.
export const statusTone = {
  active: 'success', confirmed: 'success', paid: 'success', published: 'success', resolved: 'success', open: 'info',
  pending: 'warning', 'en attente': 'warning', flagged: 'warning', review: 'warning', processing: 'info',
  cancelled: 'danger', refunded: 'danger', suspended: 'danger', rejected: 'danger', banned: 'danger', failed: 'danger',
  completed: 'neutral', closed: 'neutral', draft: 'neutral', archived: 'neutral',
};

export const tone = (status) => statusTone[String(status).toLowerCase()] || 'neutral';
