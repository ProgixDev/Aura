import Link from 'next/link';
import { PageHead } from '@/components/ui/PageHead';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { events, getEvent } from '@/lib/data/events';
import { getPractitioner } from '@/lib/data/practitioners';
import { clients } from '@/lib/data/admin';

export function generateStaticParams() {
  return events.map((e) => ({ id: e.id }));
}

export default async function AdminEventDetail({ params }) {
  const { id } = await params;
  const e = getEvent(id);

  if (!e) {
    return (
      <>
        <PageHead title="Événement introuvable" crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Événements', href: '/admin/evenements' }, { label: 'Introuvable' }]} />
        <div className="empty"><div className="glyph">❍</div>Cet événement n'existe pas.<div className="mt-3"><Link href="/admin/evenements" className="btn btn-soft btn-sm">Retour aux événements</Link></div></div>
      </>
    );
  }

  const hosts = (e.hostIds || []).map(getPractitioner).filter(Boolean);
  const filled = e.seats - e.seatsLeft;
  const pct = Math.round((filled / e.seats) * 100);
  const attendees = clients.slice(0, filled);

  return (
    <>
      <PageHead
        title={e.title}
        subtitle={`${e.kind} · ${e.when} · ${e.where}`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Événements', href: '/admin/evenements' }, { label: e.title }]}
        actions={<>
          <ModalButton modal="approveEvent" payload={{ title: e.title }} className="btn btn-primary btn-sm"><Icon name="check" size={15} /> Publier</ModalButton>
          <ModalButton modal="editField" payload={{ title: 'Modifier l\'événement', fields: [
            { name: 'title', label: 'Titre', type: 'text' },
            { name: 'price', label: 'Prix', type: 'text' },
            { name: 'seats', label: 'Places', type: 'number' },
          ] }} className="btn btn-soft btn-sm"><Icon name="edit" size={15} /> Modifier</ModalButton>
          <ModalButton modal="confirm" payload={{ title: 'Annuler l\'événement', message: `Voulez-vous vraiment annuler « ${e.title} » ? Les participants seront remboursés.`, confirmLabel: 'Annuler l\'événement', danger: true, successToast: 'Événement annulé' }} className="btn btn-danger-soft btn-sm"><Icon name="x" size={15} /> Annuler</ModalButton>
        </>}
      />

      {/* Hero summary */}
      <section className="aurora-dark grain" style={{ '--orb-x': '70%', '--orb-y': '20%', '--orb-1': '#C4B0E8', '--orb-2': '#7B5FCF', padding: '32px 32px', borderRadius: 20, marginBottom: 22 }}>
        <div className="row gap-2" style={{ marginBottom: 10 }}>
          <Badge variant="featured">{e.kind.split(' · ')[0]}</Badge>
          <Badge variant="online" dot>Publié</Badge>
        </div>
        <h2 className="h-1 serif" style={{ color: 'white', marginBottom: 10 }}>{e.title}</h2>
        <div className="row gap-4 wrap small" style={{ color: 'rgba(255,255,255,.85)' }}>
          <span className="row gap-1"><Icon name="calendar" size={15} color="rgba(255,255,255,.7)" />{e.meta.dates}</span>
          <span className="row gap-1"><Icon name="pin" size={15} color="rgba(255,255,255,.7)" />{e.meta.place}</span>
          <span className="row gap-1"><Icon name="users" size={15} color="rgba(255,255,255,.7)" />{e.seats} places</span>
          <span className="row gap-1"><Icon name="euro" size={15} color="rgba(255,255,255,.7)" />{e.price}</span>
        </div>
      </section>

      <div className="grid" style={{ gridTemplateColumns: '1.6fr 1fr', gap: 20 }}>
        <div className="stack gap-5">
          {/* Description */}
          <div className="card card-pad">
            <h3 className="h-3" style={{ marginBottom: 12 }}>Présentation</h3>
            {e.description.split('\n\n').map((p, i) => <p key={i} className="body" style={{ marginBottom: 10 }}>{p}</p>)}
          </div>

          {/* Program */}
          <div className="card card-pad">
            <h3 className="h-3" style={{ marginBottom: 16 }}>Programme</h3>
            <div className="stack gap-3">
              {e.program.map((s, i) => (
                <div key={i} className="row gap-3" style={{ alignItems: 'flex-start' }}>
                  <span className="chip" style={{ minWidth: 64, justifyContent: 'center' }}>{s.time}</span>
                  <div className="flex-1">
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{s.title}</div>
                    {s.detail && <div className="tiny">{s.detail}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Attendees */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="between" style={{ padding: '18px 20px' }}>
              <h3 className="h-3">Participants ({filled})</h3>
              <ModalButton modal="exportData" className="btn btn-soft btn-sm"><Icon name="download" size={14} /> Liste</ModalButton>
            </div>
            <table className="table">
              <thead><tr><th>Participant</th><th>Ville</th><th>Statut</th></tr></thead>
              <tbody>
                {attendees.map((c) => (
                  <tr key={c.id}>
                    <td><div className="row gap-2"><Avatar name={c.name} tone={c.tone} size={28} />{c.name}</div></td>
                    <td className="small">{c.city}</td>
                    <td><Badge variant="success" dot>inscrit</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Side */}
        <div className="stack gap-5">
          <div className="card card-pad">
            <h3 className="h-3" style={{ marginBottom: 16 }}>Remplissage</h3>
            <div className="between" style={{ marginBottom: 8 }}>
              <span className="small">{filled} / {e.seats} places</span>
              <strong>{pct}%</strong>
            </div>
            <div style={{ height: 10, borderRadius: 999, background: 'var(--line)', overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: `var(--${e.tone}-2)` }} />
            </div>
            <div className="tiny" style={{ marginTop: 8 }}>{e.seatsLeft} place{e.seatsLeft > 1 ? 's' : ''} restante{e.seatsLeft > 1 ? 's' : ''}</div>
          </div>

          <div className="card card-pad">
            <h3 className="h-3" style={{ marginBottom: 16 }}>Détails</h3>
            <dl className="dl">
              <dt>Type</dt><dd>{e.kind}</dd>
              <dt>Dates</dt><dd>{e.meta.dates}</dd>
              <dt>Lieu</dt><dd>{e.meta.place}</dd>
              <dt>Prix</dt><dd><strong>{e.price}</strong></dd>
              <dt>Capacité</dt><dd>{e.seats} places</dd>
            </dl>
          </div>

          <div className="card card-pad">
            <h3 className="h-3" style={{ marginBottom: 16 }}>Animé par</h3>
            <div className="stack gap-3">
              {hosts.map((h) => (
                <Link key={h.id} href={`/admin/praticien/${h.id}`} className="row gap-3">
                  <Avatar src={h.photo} name={h.name} tone={h.tone} size={44} online={h.online} />
                  <div className="flex-1">
                    <div className="row gap-2" style={{ fontWeight: 500, fontSize: 14 }}>{h.name}{h.verified && <Icon name="checkCircle" size={13} color="var(--violet-2)" />}</div>
                    <div className="tiny">{h.specialties[0]} · {h.city}</div>
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
