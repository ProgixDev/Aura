'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Toggle } from './Toggle';

// Labels/descriptions and defaults match the page's original static NOTIFS
// array exactly — the migration's column defaults (Task 1) were chosen to
// mirror this same copy, so the empty/loading state looks identical to the
// old hardcoded version.
const FIELDS = [
  { key: 'rappels_seance', label: 'Rappels de séance', desc: 'Un rappel 24h et 1h avant chaque rendez-vous.' },
  { key: 'nouveaux_messages', label: 'Nouveaux messages', desc: "Soyez averti dès qu'un praticien vous répond." },
  { key: 'reponses_avis', label: 'Réponses à mes avis', desc: 'Quand un praticien réagit à votre retour.' },
  { key: 'newsletter', label: 'Newsletter GUÉRIENERGIES', desc: 'Inspirations, événements et nouveautés, une fois par mois.' },
];

const DEFAULTS = {
  rappels_seance: true, nouveaux_messages: true, reponses_avis: false, newsletter: true,
};

export function NotificationsSection() {
  const queryClient = useQueryClient();
  const { data: res } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => api.get('/client/notification-preferences'),
  });
  const prefs = res?.data ?? DEFAULTS;

  const toggle = async (key, value) => {
    // Optimistic update so the switch flips instantly; reconciled with the
    // server's response either way once the PUT settles.
    queryClient.setQueryData(['notification-preferences'], {
      ...res, data: { ...prefs, [key]: value },
    });
    try {
      await api.put('/client/notification-preferences', { [key]: value });
    } finally {
      await queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    }
  };

  return (
    <div className="stack">
      {FIELDS.map((f, i) => (
        <div key={f.key}>
          {i > 0 && <div className="divider" />}
          <div className="row between gap-3" style={{ padding: '12px 0' }}>
            <div>
              <div className="small" style={{ fontWeight: 500, color: 'var(--ink)' }}>{f.label}</div>
              <div className="tiny muted">{f.desc}</div>
            </div>
            <Toggle checked={!!prefs[f.key]} onChange={(v) => toggle(f.key, v)} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default NotificationsSection;
