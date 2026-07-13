import { PageHead } from '@/components/ui/PageHead';
import { StatCard } from '@/components/ui/StatCard';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { ToastButton } from '@/components/ui/ToastButton';
import { clients, getClient, bookings } from '@/lib/data/admin';
import { euro, dateFr, tone } from '@/lib/format';

export function generateStaticParams() {
  return clients.map((c) => ({ id: c.id }));
}

const NOTES = [
  { author: 'Émilie Fontaine', when: 'il y a 2 jours', text: "Cliente fidèle, très satisfaite. A demandé un récapitulatif de ses factures par email." },
  { author: 'Lucas Moreau', when: 'il y a 3 semaines', text: "Signalement résolu : malentendu sur un créneau, remboursement effectué à l'amiable." },
];

export default async function ClientDetailPage({ params }) {
  const { id } = await params;
  const c = getClient(id);

  if (!c) {
    return (
      <>
        <PageHead title="Client introuvable" crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Clients', href: '/admin/clients' }, { label: 'Introuvable' }]} />
        <div className="empty"><div className="glyph">❍</div>Aucun client ne correspond à cet identifiant.</div>
      </>
    );
  }

  const myBookings = bookings.filter((b) => b.clientName === c.name);
  const avg = c.bookings ? c.spent / c.bookings : 0;

  return (
    <>
      <PageHead
        title={c.name}
        subtitle={`Client depuis le ${dateFr(c.joined)} · ${c.city}`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Clients', href: '/admin/clients' }, { label: c.name }]}
        actions={<>
          <ToastButton message="Message envoyé au client" tone="success" className="btn btn-soft btn-sm"><Icon name="message" size={15} /> Envoyer un message</ToastButton>
          <ModalButton modal="addNote" payload={{ name: c.name }} successToast="Note ajoutée" className="btn btn-soft btn-sm"><Icon name="edit" size={15} /> Note</ModalButton>
          <ModalButton modal="suspendUser" payload={{ name: c.name }} className="btn btn-danger-soft btn-sm"><Icon name="shield" size={15} /> Suspendre</ModalButton>
        </>}
      />

      <div className="card card-pad" style={{ marginBottom: 22 }}>
        <div className="row gap-4 wrap">
          <Avatar name={c.name} tone={c.tone} size={64} />
          <div className="flex-1">
            <div className="row gap-2 wrap" style={{ marginBottom: 4 }}>
              <h2 className="h-3">{c.name}</h2>
              <Badge variant={tone(c.status)} dot>{c.status}</Badge>
            </div>
            <div className="small row gap-3 wrap">
              <span className="row gap-2"><Icon name="mail" size={14} color="var(--muted)" /> {c.email}</span>
              <span className="row gap-2"><Icon name="pin" size={14} color="var(--muted)" /> {c.city}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 22 }}>
        <StatCard label="Réservations" value={c.bookings} icon="calendar" />
        <StatCard label="Total dépensé" value={euro(c.spent)} icon="euro" />
        <StatCard label="Panier moyen" value={euro(Math.round(avg))} icon="card" />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.6fr 1fr', gap: 20 }}>
        <div className="stack gap-5">
          <div className="card card-pad">
            <h3 className="h-4" style={{ marginBottom: 14 }}>Informations</h3>
            <dl className="dl">
              <dt>Identifiant</dt><dd>{c.id}</dd>
              <dt>Email</dt><dd>{c.email}</dd>
              <dt>Ville</dt><dd>{c.city}</dd>
              <dt>Inscrit le</dt><dd>{dateFr(c.joined)}</dd>
              <dt>Statut</dt><dd><Badge variant={tone(c.status)}>{c.status}</Badge></dd>
            </dl>
          </div>

          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="between" style={{ padding: '18px 20px' }}>
              <h3 className="h-4">Réservations</h3>
              <Badge variant="neutral">{myBookings.length}</Badge>
            </div>
            <table className="table">
              <thead><tr><th>Réf.</th><th>Praticien</th><th>Date</th><th>Montant</th><th>Statut</th></tr></thead>
              <tbody>
                {myBookings.length === 0 ? (
                  <tr><td colSpan={5}><div className="empty"><div className="glyph">❍</div>Aucune réservation</div></td></tr>
                ) : myBookings.map((b) => (
                  <tr key={b.id}>
                    <td className="table-cell-main">{b.ref}</td>
                    <td><div className="row gap-2"><Avatar src={b.practitionerPhoto} name={b.practitionerName} size={28} />{b.practitionerName}</div></td>
                    <td className="small">{dateFr(b.date)} · {b.slot}</td>
                    <td>{euro(b.price)}</td>
                    <td><Badge variant={tone(b.status)}>{b.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="stack gap-5">
          <div className="card card-pad">
            <div className="between" style={{ marginBottom: 14 }}>
              <h3 className="h-4">Notes internes</h3>
              <ModalButton modal="addNote" payload={{ name: c.name }} successToast="Note ajoutée" className="btn btn-soft btn-sm btn-icon" as="button"><Icon name="plus" size={15} /></ModalButton>
            </div>
            <div className="stack gap-4">
              {NOTES.map((n, i) => (
                <div key={i}>
                  <p className="small">{n.text}</p>
                  <div className="tiny" style={{ marginTop: 4 }}>{n.author} · {n.when}</div>
                  {i < NOTES.length - 1 && <div className="divider" />}
                </div>
              ))}
            </div>
          </div>

          <div className="card card-pad">
            <h3 className="h-4" style={{ marginBottom: 14 }}>Actions rapides</h3>
            <div className="stack gap-2">
              <ToastButton message="Email de réinitialisation envoyé" tone="success" className="btn btn-soft btn-sm btn-block"><Icon name="mail" size={15} /> Réinitialiser le mot de passe</ToastButton>
              <ModalButton modal="exportData" className="btn btn-soft btn-sm btn-block"><Icon name="download" size={15} /> Exporter les données</ModalButton>
              <ModalButton modal="banUser" payload={{ name: c.name }} className="btn btn-danger-soft btn-sm btn-block"><Icon name="x" size={15} /> Bannir le compte</ModalButton>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
