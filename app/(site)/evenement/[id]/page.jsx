import Link from 'next/link';
import { notFound } from 'next/navigation';
import { events, getEvent } from '@/lib/data/events';
import { getPractitioner } from '@/lib/data/practitioners';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';

const ORB = {
  sky: ['#A8C8E8', '#5B7FB8'],
  violet: ['#C4B0E8', '#7B5FCF'],
  sage: ['#B8D4C2', '#6FA383'],
  gold: ['#E4C896', '#C49A4A'],
};

export function generateStaticParams() {
  return events.map((e) => ({ id: e.id }));
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const e = getEvent(id);
  if (!e) return { title: 'Événement — Aura' };
  return { title: `${e.title} — Aura`, description: e.description.split('\n')[0] };
}

export default async function EvenementPage({ params }) {
  const { id } = await params;
  const e = getEvent(id);
  if (!e) notFound();

  const [orb1, orb2] = ORB[e.tone] || ORB.violet;
  const hosts = (e.hostIds || []).map((hid) => getPractitioner(hid)).filter(Boolean);
  const paras = e.description.split('\n').filter((p) => p.trim());
  const shareUrl = `https://aura.fr/evenement/${e.id}`;

  return (
    <>
      {/* HERO */}
      <section
        className="aurora-dark grain"
        style={{ '--orb-x': '70%', '--orb-y': '18%', '--orb-1': orb1, '--orb-2': orb2, padding: '100px 0 110px' }}
      >
        <div className="container reveal">
          <div className="row gap-2 small" style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 22 }}>
            <Link href="/evenements" style={{ color: 'rgba(255,255,255,0.7)' }}>Agenda</Link>
            <Icon name="chevronRight" size={13} color="rgba(255,255,255,0.5)" />
            <span>{e.title}</span>
          </div>
          <span className="badge featured" style={{ marginBottom: 18 }}>{e.kind}</span>
          <h1 className="h-display" style={{ color: '#fff', margin: '0 0 20px', maxWidth: 720 }}>{e.title}</h1>
          <div className="row gap-6 wrap" style={{ color: 'rgba(255,255,255,0.82)' }}>
            <span className="row gap-2"><Icon name="calendar" size={16} color="rgba(255,255,255,0.7)" />{e.meta?.dates || e.when}</span>
            <span className="row gap-2"><Icon name="pin" size={16} color="rgba(255,255,255,0.7)" />{e.meta?.place || e.where}</span>
            <span className="row gap-2"><Icon name="ticket" size={16} color="rgba(255,255,255,0.7)" />{e.price}</span>
          </div>
        </div>
      </section>

      {/* BODY */}
      <section className="section">
        <div className="container">
          <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)', gap: 40, alignItems: 'flex-start' }}>
            {/* LEFT */}
            <div className="stack" style={{ gap: 40 }}>
              {/* Description */}
              <div>
                <span className="eyebrow">Présentation</span>
                {paras.map((p, i) => (
                  <p key={i} className={i === 0 ? 'lead' : 'body'} style={{ marginTop: i === 0 ? 14 : 16 }}>{p}</p>
                ))}
              </div>

              {/* Programme */}
              {e.program?.length > 0 && (
                <div>
                  <span className="eyebrow">Au programme</span>
                  <h2 className="h-3" style={{ margin: '8px 0 20px' }}>Le déroulé</h2>
                  <div className="stack" style={{ gap: 0 }}>
                    {e.program.map((step, i) => (
                      <div key={i} className="row gap-4" style={{ alignItems: 'flex-start', padding: '16px 0', borderTop: i ? '1px solid var(--line)' : 'none' }}>
                        <span className="serif italic accent" style={{ fontSize: 18, minWidth: 78, flexShrink: 0 }}>{step.time}</span>
                        <div className="flex-1">
                          <div style={{ fontWeight: 500 }}>{step.title}</div>
                          {step.detail && <div className="small muted" style={{ marginTop: 2 }}>{step.detail}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hosts */}
              {hosts.length > 0 && (
                <div>
                  <span className="eyebrow">Encadré par</span>
                  <h2 className="h-3" style={{ margin: '8px 0 20px' }}>{hosts.length > 1 ? 'Vos praticiens' : 'Votre praticien'}</h2>
                  <div className="grid grid-2">
                    {hosts.map((h) => (
                      <Link key={h.id} href={`/praticien/${h.id}`} className="card card-pad card-hover row gap-3" style={{ alignItems: 'center' }}>
                        <Avatar src={h.photo} name={h.name} tone={h.tone} size={52} online={h.online} />
                        <div className="flex-1">
                          <div className="row gap-1" style={{ fontWeight: 500 }}>
                            {h.name}
                            {h.verified && <Icon name="checkCircle" size={14} color="var(--violet-2)" />}
                          </div>
                          <div className="small">{h.specialties.join(' · ')}</div>
                        </div>
                        <Icon name="chevronRight" size={16} color="var(--muted)" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Location + share */}
              <div className="card card-pad">
                <div className="row between wrap gap-3">
                  <div className="row gap-3" style={{ alignItems: 'center' }}>
                    <span className="tile-icon tint-sky"><Icon name="pin" size={18} color="var(--sky-2, #5B7FB8)" /></span>
                    <div>
                      <div style={{ fontWeight: 500 }}>{e.meta?.place || e.where}</div>
                      <div className="small muted">Lieu communiqué après réservation</div>
                    </div>
                  </div>
                  <ModalButton modal="share" payload={{ label: e.title, url: shareUrl }} className="btn btn-soft" as="button">
                    <Icon name="share" size={15} color="var(--ink)" /> Partager
                  </ModalButton>
                </div>
              </div>
            </div>

            {/* RIGHT — booking card */}
            <aside style={{ position: 'sticky', top: 96 }}>
              <div className="card card-pad">
                <div className="row between" style={{ alignItems: 'baseline', marginBottom: 16 }}>
                  <span className="price" style={{ fontSize: 26 }}>{e.price}</span>
                  {e.seatsLeft <= 5 && <Badge variant="warning">{e.seatsLeft} places restantes</Badge>}
                </div>
                <dl className="dl" style={{ marginBottom: 18 }}>
                  <dt>Dates</dt><dd>{e.meta?.dates || e.when}</dd>
                  <dt>Lieu</dt><dd>{e.meta?.place || e.where}</dd>
                  <dt>Capacité</dt><dd>{e.seats} participants</dd>
                  <dt>Disponibilité</dt><dd>{e.seatsLeft} place{e.seatsLeft > 1 ? 's' : ''} libre{e.seatsLeft > 1 ? 's' : ''}</dd>
                </dl>
                <ModalButton
                  modal="form"
                  payload={{
                    title: `Réserver — ${e.title}`,
                    fields: [
                      { name: 'name', label: 'Votre nom', type: 'text', required: true },
                      { name: 'email', label: 'Email', type: 'email', required: true },
                      { name: 'places', label: 'Nombre de places', type: 'number', required: true },
                      { name: 'note', label: 'Un mot pour l’organisateur', type: 'textarea' },
                    ],
                    submitLabel: 'Confirmer ma réservation',
                    successToast: 'Réservation envoyée — vous recevrez une confirmation par email.',
                  }}
                  className="btn btn-primary btn-block btn-lg"
                >
                  Réserver
                </ModalButton>
                <ModalButton modal="contact" payload={{ name: hosts[0]?.name || e.title }} className="btn btn-ghost btn-block" style={{ marginTop: 10 }}>
                  Une question ?
                </ModalButton>
                <p className="tiny muted center" style={{ marginTop: 14 }}>
                  <Icon name="shield" size={12} color="var(--muted)" /> Paiement protégé · Annulation jusqu’à 7 jours avant
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
