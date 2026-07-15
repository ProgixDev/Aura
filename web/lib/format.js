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

export const relativeFr = (iso) => {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH}h`;
  const diffD = Math.round(diffH / 24);
  if (diffD === 1) return 'hier';
  return `il y a ${diffD} jours`;
};

// Triggers a client-side download of a { filename, csv } payload as returned by
// every admin CSV-export endpoint (paiements/export/csv, admin/audit-logs/export, …).
export function downloadCsv({ filename, csv }) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
