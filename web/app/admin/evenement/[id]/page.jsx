'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { StatCard } from '@/components/ui/StatCard';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { api } from '@/lib/api';
import { useUI } from '@/lib/store';
import { euro, dateFr } from '@/lib/format';

const STATUS_TONE = { brouillon: 'neutral', publié: 'success', archivé: 'neutral' };

export default function AdminEventDetail() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useUI((s) => s.toast);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'events', id],
    queryFn: () => api.get(`/events/${id}`),
  });
  const e = data?.data;

  const updateMutation = useMutation({
    mutationFn: (values) => api.put(`/events/${id}`, {
      ...values,
      prix: values.prix !== undefined ? Number(values.prix) : undefined,
      nombre_places: values.nombre_places !== undefined ? Number(values.nombre_places) : undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'events', id] });
      toast('Événement mis à jour', 'success');
    },
  });
  const deleteMutation = useMutation({
    mutationFn: () => api.del(`/events/${id}`),
    onSuccess: () => { toast('Événement supprimé', 'success'); router.push('/admin/evenements'); },
  });

  if (isLoading) return <div className="empty"><div className="glyph">❍</div>Chargement…</div>;
  if (isError || !e) {
    return (
      <>
        <PageHead title="Événement introuvable" crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Événements', href: '/admin/evenements' }, { label: 'Introuvable' }]} />
        <div className="empty"><div className="glyph">❍</div>Cet événement n'existe pas.<div className="mt-3"><Link href="/admin/evenements" className="btn btn-soft btn-sm">Retour aux événements</Link></div></div>
      </>
    );
  }

  const hosts = e.animateurs ?? [];

  return (
    <>
      <PageHead
        title={e.titre}
        subtitle={`${e.type} · ${e.lieu}`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Événements', href: '/admin/evenements' }, { label: e.titre }]}
        actions={<>
          <ModalButton modal="editField" payload={{
            title: "Modifier l'événement",
            fields: [
              { name: 'titre', label: 'Titre', type: 'text', value: e.titre },
              { name: 'lieu', label: 'Lieu', type: 'text', value: e.lieu },
              { name: 'prix', label: 'Prix (€)', type: 'number', value: e.prix },
              { name: 'nombre_places', label: 'Places', type: 'number', value: e.nombre_places },
              { name: 'description', label: 'Description', type: 'textarea', value: e.description },
            ],
            submitLabel: 'Enregistrer', successToast: null,
            onSubmit: (values) => updateMutation.mutateAsync(values),
          }} className="btn btn-soft btn-sm"><Icon name="edit" size={15} /> Modifier</ModalButton>
          <ModalButton modal="confirm" payload={{
            title: "Supprimer l'événement",
            message: `« ${e.titre} » sera définitivement supprimé.`,
            confirmLabel: 'Supprimer', danger: true, successToast: null,
            onConfirm: () => deleteMutation.mutateAsync(),
          }} className="btn btn-danger-soft btn-sm"><Icon name="trash" size={15} /> Supprimer</ModalButton>
        </>}
      />

      {/* Hero summary */}
      <section className="aurora-dark grain" style={{ '--orb-x': '70%', '--orb-y': '20%', '--orb-1': '#C4B0E8', '--orb-2': '#7B5FCF', padding: '32px 32px', borderRadius: 20, marginBottom: 22 }}>
        <div className="row gap-2" style={{ marginBottom: 10 }}>
          <Badge variant="featured">{e.type}</Badge>
          <Badge variant={STATUS_TONE[e.status] || 'neutral'} dot>{e.status}</Badge>
        </div>
        <h2 className="h-1 serif" style={{ color: 'white', marginBottom: 10 }}>{e.titre}</h2>
        <div className="row gap-4 wrap small" style={{ color: 'rgba(255,255,255,.85)' }}>
          <span className="row gap-1"><Icon name="calendar" size={15} color="rgba(255,255,255,.7)" />{(e.dates || []).map(dateFr).join(' · ')}</span>
          <span className="row gap-1"><Icon name="pin" size={15} color="rgba(255,255,255,.7)" />{e.lieu}</span>
          <span className="row gap-1"><Icon name="users" size={15} color="rgba(255,255,255,.7)" />{e.nombre_places} places</span>
          <span className="row gap-1"><Icon name="euro" size={15} color="rgba(255,255,255,.7)" />{euro(e.prix)}</span>
        </div>
      </section>

      <div className="grid" style={{ gridTemplateColumns: '1.6fr 1fr', gap: 20 }}>
        <div className="stack gap-5">
          {/* Description */}
          <div className="card card-pad">
            <h3 className="h-3" style={{ marginBottom: 12 }}>Présentation</h3>
            {(e.description || '').split('\n\n').map((p, i) => <p key={i} className="body" style={{ marginBottom: 10 }}>{p}</p>)}
          </div>
        </div>

        {/* Side */}
        <div className="stack gap-5">
          <StatCard label="Capacité" value={`${e.nombre_places} places`} icon="users" />

          <div className="card card-pad">
            <h3 className="h-3" style={{ marginBottom: 16 }}>Détails</h3>
            <dl className="dl">
              <dt>Type</dt><dd>{e.type}</dd>
              <dt>Dates</dt><dd>{(e.dates || []).map(dateFr).join(', ')}</dd>
              <dt>Lieu</dt><dd>{e.lieu}</dd>
              <dt>Prix</dt><dd><strong>{euro(e.prix)}</strong></dd>
              <dt>Capacité</dt><dd>{e.nombre_places} places</dd>
              <dt>Statut</dt><dd><Badge variant={STATUS_TONE[e.status] || 'neutral'}>{e.status}</Badge></dd>
            </dl>
          </div>

          <div className="card card-pad">
            <h3 className="h-3" style={{ marginBottom: 16 }}>Animé par</h3>
            {hosts.length === 0 && <p className="small">Aucun animateur assigné.</p>}
            <div className="stack gap-3">
              {hosts.map((h) => (
                <Link key={h.id} href={`/admin/praticien/${h.id}`} className="row gap-3">
                  <Avatar name={`${h.firstname} ${h.lastname}`} size={44} />
                  <div className="flex-1">
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{h.firstname} {h.lastname}</div>
                    <div className="tiny">{h.specialite} · {h.ville} {h.pivot?.role ? `· ${h.pivot.role}` : ''}</div>
                  </div>
                  <Icon name="chevronRight" size={16} color="var(--muted)" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
