import Link from 'next/link';
import { testimonials } from '@/lib/data/content';
import { Avatar } from '@/components/ui/Avatar';
import { Rating } from '@/components/ui/Rating';
import { ModalButton } from '@/components/ui/ModalButton';

export const metadata = { title: 'Témoignages — Aura' };

export default function TemoignagesPage() {
  const featured = testimonials[3];
  const rest = testimonials.filter((t) => t !== featured);

  return (
    <>
      <section className="aurora-dark grain" style={{ '--orb-x': '72%', '--orb-y': '18%', '--orb-1': '#C4B0E8', '--orb-2': '#7B5FCF', padding: '92px 0 96px' }}>
        <div className="container-narrow reveal center">
          <span className="eyebrow" style={{ color: 'rgba(255,255,255,0.7)' }}>Ce qu’on nous raconte</span>
          <h1 className="h-display" style={{ color: '#fff', margin: '18px 0 18px' }}>
            Des chemins qui se <span className="italic" style={{ color: 'var(--violet)' }}>dénouent</span>.
          </h1>
          <p className="lead" style={{ color: 'rgba(255,255,255,0.82)', maxWidth: 520, margin: '0 auto' }}>
            Plus de 48 000 séances réservées, 4,9 / 5 de satisfaction. Mais ce sont les mots qui parlent le mieux.
          </p>
        </div>
      </section>

      {/* FEATURED QUOTE */}
      <section className="section">
        <div className="container-narrow center">
          <Rating value={featured.rating} showCount={false} size={20} />
          <p className="serif" style={{ fontSize: 'clamp(24px,3.4vw,38px)', lineHeight: 1.3, margin: '20px 0 28px', fontWeight: 400 }}>
            « {featured.text} »
          </p>
          <div className="row gap-3" style={{ justifyContent: 'center' }}>
            <Avatar name={featured.name} size={48} tone={featured.tone} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 500 }}>{featured.name}</div>
              <div className="small">{featured.city}</div>
            </div>
          </div>
        </div>
      </section>

      {/* GRID */}
      <section className="section-sm">
        <div className="container">
          <div className="grid grid-3" style={{ alignItems: 'start' }}>
            {rest.map((t) => (
              <div key={t.name} className={`card card-pad tint-${t.tone} stack`} style={{ gap: 16 }}>
                <Rating value={t.rating} showCount={false} size={15} />
                <p className="serif" style={{ fontSize: 19, lineHeight: 1.5, fontWeight: 400 }}>« {t.text} »</p>
                <div className="row gap-2" style={{ marginTop: 'auto' }}>
                  <Avatar name={t.name} size={36} tone={t.tone} />
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{t.name}</div>
                    <div className="tiny muted">{t.city}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container">
          <div className="aurora-dark grain card" style={{ '--orb-x': '78%', '--orb-y': '30%', padding: 'clamp(40px,6vw,72px)', textAlign: 'center', borderRadius: 'var(--r-sheet)' }}>
            <h2 className="h-1" style={{ color: '#fff', marginBottom: 14 }}>Votre histoire compte aussi</h2>
            <p className="lead" style={{ color: 'rgba(255,255,255,0.82)', maxWidth: 520, margin: '0 auto 28px' }}>
              Une séance vous a marqué·e ? Partagez votre expérience et inspirez celles et ceux qui hésitent encore.
            </p>
            <div className="row gap-3" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
              <ModalButton
                modal="form"
                payload={{ title: 'Partager mon témoignage', fields: [
                  { name: 'name', label: 'Votre prénom', type: 'text', required: true },
                  { name: 'city', label: 'Votre ville', type: 'text' },
                  { name: 'note', label: 'Votre note (sur 5)', type: 'select', options: ['5', '4', '3', '2', '1'], required: true },
                  { name: 'text', label: 'Votre témoignage', type: 'textarea', required: true },
                ], submitLabel: 'Envoyer mon témoignage', successToast: 'Merci pour votre témoignage !' }}
                className="btn btn-aurora btn-lg"
              >
                Laisser un témoignage
              </ModalButton>
              <Link href="/praticiens" className="btn btn-soft btn-lg" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}>
                Trouver un praticien
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
