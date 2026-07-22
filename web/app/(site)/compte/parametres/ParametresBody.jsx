'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { ToastButton } from '@/components/ui/ToastButton';
import { Toggle } from './Toggle';
import { NotificationsSection } from './NotificationsSection';
import { api, errorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useUI } from '@/lib/store';

function Row({ label, desc, on }) {
  return (
    <div className="row between gap-3" style={{ padding: '12px 0' }}>
      <div>
        <div className="small" style={{ fontWeight: 500, color: 'var(--ink)' }}>{label}</div>
        <div className="tiny muted">{desc}</div>
      </div>
      <Toggle defaultOn={on} />
    </div>
  );
}

const EMPTY_FORM = { firstname: '', lastname: '', email: '', phone: '', city: '' };

export default function ParametresBody() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useUI((s) => s.toast);
  const signOut = useAuthStore((s) => s.signOut);

  const { data: profileRes } = useQuery({
    queryKey: ['client-profile'],
    queryFn: () => api.get('/client/profile'),
  });
  const client = profileRes?.data?.client;

  // Controlled form, hydrated from the server once it loads (same GET-then-useEffect
  // pattern as admin/parametres/facturation/page.jsx) rather than defaultValue, so
  // "Enregistrer" always sends what's actually on screen.
  const [form, setForm] = useState(EMPTY_FORM);
  useEffect(() => {
    if (client) {
      setForm({
        firstname: client.firstname || '',
        lastname: client.lastname || '',
        email: client.email || '',
        phone: client.phone || '',
        city: client.city || '',
      });
    }
  }, [client]);
  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const profileMutation = useMutation({
    mutationFn: (body) => api.put('/client/profile', body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['client-profile'] });
      toast('Profil enregistré', 'success');
    },
    onError: (err) => toast(errorMessage(err), 'danger'),
  });

  return (
    <div className="stack gap-6">
      <header className="reveal r-1">
        <h1 className="h-1">Paramètres</h1>
        <p className="lead" style={{ marginTop: 4 }}>Gérez votre compte et vos <span className="serif italic accent">préférences</span>.</p>
      </header>

      {/* Profil */}
      <section className="card card-pad">
        <h2 className="h-3 mb-3">Profil</h2>
        <div className="grid grid-2">
          <div className="field"><label>Prénom</label><input className="input" value={form.firstname} onChange={(e) => setField('firstname', e.target.value)} /></div>
          <div className="field"><label>Nom</label><input className="input" value={form.lastname} onChange={(e) => setField('lastname', e.target.value)} /></div>
          <div className="field"><label>Email</label><input className="input" type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} /></div>
          <div className="field"><label>Téléphone</label><input className="input" type="tel" value={form.phone} onChange={(e) => setField('phone', e.target.value)} /></div>
          <div className="field" style={{ gridColumn: '1 / -1' }}><label>Ville</label><input className="input" value={form.city} onChange={(e) => setField('city', e.target.value)} /></div>
        </div>
        {profileMutation.isError && (
          <p className="tiny" style={{ color: 'var(--danger, #b5524f)', marginTop: 8 }}>{errorMessage(profileMutation.error)}</p>
        )}
        <div className="row gap-2 mt-3">
          <button
            type="button"
            className="btn btn-primary"
            disabled={profileMutation.isPending}
            onClick={() => profileMutation.mutate({ ...form })}
          >
            {profileMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </section>

      {/* Notifications */}
      <section className="card card-pad">
        <h2 className="h-3 mb-2">Notifications</h2>
        <NotificationsSection />
      </section>

      {/* Confidentialité — no backend endpoint exists yet for these preferences
          (visibility toggle, usage-data sharing, export, history deletion). Left
          visual-only (Toggle keeps its own uncontrolled on/off state) rather than
          wired to an invented endpoint. */}
      <section className="card card-pad">
        <h2 className="h-3 mb-2">Confidentialité</h2>
        <div className="stack">
          <Row label="Profil visible des praticiens" desc="Autoriser les praticiens à voir votre prénom et votre ville." on />
          <div className="divider" />
          <Row label="Partage des données d'usage" desc="Aider à améliorer GUÉRIENERGIES de façon anonyme." on={false} />
        </div>
        <div className="divider" />
        <div className="row gap-2 wrap mt-2">
          <ModalButton modal="exportData" payload={{ title: 'Exporter mes données' }} className="btn btn-soft btn-sm"><Icon name="download" size={14} /> Exporter mes données</ModalButton>
          <ToastButton message="Demande envoyée" className="btn btn-ghost btn-sm">Demander la suppression de l'historique</ToastButton>
        </div>
      </section>

      {/* Langue — same as Confidentialité above: no backend endpoint for locale /
          timezone preferences yet, so this stays decorative rather than invented. */}
      <section className="card card-pad">
        <h2 className="h-3 mb-3">Langue & région</h2>
        <div className="grid grid-2">
          <div className="field"><label>Langue</label><select className="input" defaultValue="fr"><option value="fr">Français</option><option value="en">English</option></select></div>
          <div className="field"><label>Fuseau horaire</label><select className="input" defaultValue="paris"><option value="paris">Europe / Paris (GMT+1)</option><option value="brussels">Europe / Bruxelles</option><option value="geneva">Europe / Genève</option></select></div>
        </div>
        <div className="row gap-2 mt-3"><ToastButton message="Préférences enregistrées" className="btn btn-primary">Enregistrer</ToastButton></div>
      </section>

      {/* Sécurité */}
      <section className="card card-pad">
        <h2 className="h-3 mb-3">Sécurité</h2>
        <div className="row gap-2 wrap">
          <ModalButton
            modal="form"
            payload={{
              title: 'Changer le mot de passe',
              fields: [
                { name: 'current', label: 'Mot de passe actuel', type: 'password', required: true },
                { name: 'next', label: 'Nouveau mot de passe', type: 'password', required: true },
                { name: 'confirm', label: 'Confirmer', type: 'password', required: true },
              ],
              submitLabel: 'Mettre à jour',
              successToast: 'Mot de passe mis à jour',
              onSubmit: async (values) => {
                if (values.next !== values.confirm) {
                  throw new Error('Les mots de passe ne correspondent pas.');
                }
                await api.post('/client/change-password', {
                  current_password: values.current,
                  new_password: values.next,
                  new_password_confirmation: values.confirm,
                });
              },
            }}
            className="btn btn-soft btn-sm"
          ><Icon name="shield" size={14} /> Changer le mot de passe</ModalButton>
          {/* "Déconnecter tous les appareils" has no backend endpoint — the API issues
              stateless JWTs with no per-device session registry to revoke. Left decorative. */}
          <ToastButton message="Déconnecté de tous les appareils" tone="danger" className="btn btn-ghost btn-sm"><Icon name="logout" size={14} /> Déconnecter tous les appareils</ToastButton>
        </div>
      </section>

      {/* Danger zone */}
      <section className="card card-pad" style={{ borderColor: 'var(--danger, #d98b8b)' }}>
        <h2 className="h-3 mb-1" style={{ color: 'var(--danger, #b5524f)' }}>Zone sensible</h2>
        <p className="small mb-3">La suppression de votre compte est définitive. Vos réservations, messages et avis seront effacés.</p>
        <ModalButton
          modal="deleteItem"
          payload={{
            title: 'Supprimer mon compte',
            message: 'Cette action est irréversible. Toutes vos données seront définitivement supprimées. Confirmez-vous ?',
            confirmLabel: 'Supprimer mon compte',
            danger: true,
            successToast: 'Compte supprimé',
            onConfirm: async () => {
              await api.del('/client/account');
              signOut();
              router.replace('/connexion');
            },
          }}
          className="btn btn-danger"
        ><Icon name="trash" size={15} /> Supprimer mon compte</ModalButton>
      </section>
    </div>
  );
}
