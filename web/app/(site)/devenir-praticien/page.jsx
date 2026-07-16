'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Icon } from '@/components/ui/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { Rating } from '@/components/ui/Rating';
import { Badge } from '@/components/ui/Badge';
import { plans } from '@/lib/data/content';
import { api } from '@/lib/api';
import { mapPraticien } from '@/lib/data/praticien-adapter';
import { euro } from '@/lib/format';

const BENEFITS = [
  { i: 'users', t: 'Une clientèle qualifiée', d: 'Des personnes qui vous cherchent vraiment, par discipline, ville et modalité. Fini les annuaires sans vie.' },
  { i: 'shield', t: 'Le badge qui rassure', d: 'Une fois vérifiée, votre crédibilité parle pour vous. Les clients réservent plus sereinement.' },
  { i: 'card', t: 'Paiement garanti', d: 'Vous êtes payé après chaque séance, sans relance ni impayé. Nous gérons la sécurité des transactions.' },
  { i: 'calendar', t: 'Un agenda qui travaille pour vous', d: 'Disponibilités, rappels, confirmations automatiques. Moins d’administratif, plus de présence.' },
  { i: 'chart', t: 'Des statistiques claires', d: 'Suivez vos revenus, vos séances, votre visibilité. Pilotez votre activité en confiance.' },
  { i: 'layers', t: 'Troc & communauté', d: 'Échangez vos soins avec d’autres praticiens, organisez cercles et retraites. Vous n’êtes plus seul·e.' },
];

const JOIN = [
  { n: '01', t: 'Créez votre profil', d: 'Disciplines, approche, parcours, tarifs. Racontez qui vous êtes.' },
  { n: '02', t: 'Soumettez vos documents', d: 'Diplômes, assurance professionnelle, pièce d’identité. Tout reste confidentiel.' },
  { n: '03', t: 'Vérification sous 48h', d: 'Notre équipe contrôle chaque pièce, à la main. On vous écrit dès que c’est bon.' },
  { n: '04', t: 'Recevez vos réservations', d: 'Votre profil est en ligne. Ouvrez votre agenda et accueillez vos premiers clients.' },
];

const VERIFY = [
  { i: 'book', t: 'Diplômes & formations', d: 'Nous vérifions vos certifications et la cohérence de votre parcours.' },
  { i: 'shield', t: 'Assurance professionnelle', d: 'Une RC pro valide est exigée pour protéger vos clients comme vous.' },
  { i: 'user', t: 'Identité', d: 'Une pièce officielle confirme que vous êtes bien la personne du profil.' },
];

export default function DevenirPraticienPage() {
  const { data } = useQuery({
    queryKey: ['praticiens', 'devenir-praticien-featured'],
    queryFn: () => api.get('/praticiens?per_page=10'),
  });
  // Pick the practitioner with the most published reviews as the testimonial exemplar
  // (mirrors the old mock's `practitioners.find(p => p.verified) || practitioners[0]`
  // intent of surfacing a credible, established profile rather than an arbitrary row).
  const candidates = (data?.data ?? []).map(mapPraticien);
  const featured = candidates.reduce((best, p) => (!best || p.reviews > best.reviews ? p : best), null);

  return (
    <>
      {/* HERO */}
      <section className="aurora-dark grain" style={{ '--orb-x': '70%', '--orb-y': '20%', '--orb-1': '#C4B0E8', '--orb-2': '#7B5FCF', padding: '110px 0 120px' }}>
        <div className="container reveal">
          <div style={{ maxWidth: 620 }}>
            <span className="eyebrow" style={{ color: 'rgba(255,255,255,0.7)' }}>Rejoindre Aura</span>
            <h1 className="h-display" style={{ color: '#fff', margin: '20px 0 22px' }}>
              Vivez de votre <span className="italic" style={{ color: 'var(--violet)' }}>vocation</span>, en confiance.
            </h1>
            <p className="lead" style={{ color: 'rgba(255,255,255,0.82)', maxWidth: 560, marginBottom: 32 }}>
              Aura met en lumière les praticiens du bien-être énergétique sérieux. Vous exercez, nous nous occupons de la visibilité, des paiements et de la confiance.
            </p>
            <div className="row gap-3" style={{ flexWrap: 'wrap' }}>
              {/* This used to open the client signup modal (ModalButton modal="signup"),
                  which unconditionally POSTs /client/register — silently creating a CLIENT
                  account for someone trying to become a PRACTITIONER. There is no
                  practitioner registration form in the web app yet (the real endpoint,
                  POST /v1/praticien/register, is multipart with fields — niveau,
                  specialite, tarif, bio, verification documents — this page can't collect);
                  building it is a separate piece of work. Routing to /contact is the
                  honest option until that form exists: a human takes it from there instead
                  of the visitor ending up with the wrong account type. Same fix applies to
                  the two other "signup" CTAs below. */}
              <Link href="/contact" className="btn btn-aurora btn-lg">Nous contacter</Link>
              <Link href="/tarifs" className="btn btn-soft btn-lg" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}>Voir les tarifs</Link>
            </div>
            <div className="row gap-6" style={{ marginTop: 44, color: 'rgba(255,255,255,0.75)', flexWrap: 'wrap' }}>
              {[['2 400+', 'praticiens actifs'], ['48h', 'pour être vérifié'], ['0 €', 'pour démarrer']].map(([v, l]) => (
                <div key={l}><div className="serif" style={{ fontSize: 30, color: '#fff' }}>{v}</div><div className="tiny" style={{ color: 'rgba(255,255,255,0.6)' }}>{l}</div></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="section">
        <div className="container">
          <div className="center" style={{ marginBottom: 48 }}>
            <span className="eyebrow">Pourquoi Aura</span>
            <h2 className="h-1" style={{ marginTop: 10 }}>Tout ce dont vous avez besoin pour exercer</h2>
          </div>
          <div className="grid grid-3">
            {BENEFITS.map((b) => (
              <div key={b.t} className="card card-pad card-hover">
                <span className="tile-icon tint-violet" style={{ marginBottom: 14 }}><Icon name={b.i} size={20} color="var(--violet-2)" /></span>
                <h3 className="h-3" style={{ marginBottom: 6 }}>{b.t}</h3>
                <p className="body">{b.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW TO JOIN */}
      <section className="section" style={{ background: 'var(--mist)' }}>
        <div className="container">
          <div className="center" style={{ marginBottom: 48 }}>
            <span className="eyebrow">Comment rejoindre</span>
            <h2 className="h-1" style={{ marginTop: 10 }}>De l’inscription à la première séance</h2>
          </div>
          <div className="grid grid-4">
            {JOIN.map((s) => (
              <div key={s.n} className="stack">
                <span className="serif italic accent" style={{ fontSize: 40 }}>{s.n}</span>
                <h3 className="h-4" style={{ margin: '8px 0 6px' }}>{s.t}</h3>
                <p className="body">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VERIFICATION */}
      <section className="section">
        <div className="container-narrow">
          <div className="center" style={{ marginBottom: 40 }}>
            <span className="eyebrow">La vérification</span>
            <h2 className="h-2" style={{ marginTop: 10 }}>Un badge qui se mérite</h2>
            <p className="lead muted" style={{ maxWidth: 560, margin: '14px auto 0' }}>
              Si nous sommes exigeants, c’est pour vous. Un badge contrôlé inspire confiance et vous distingue des annuaires sans filtre.
            </p>
          </div>
          <div className="grid grid-3">
            {VERIFY.map((v) => (
              <div key={v.t} className="card card-pad center">
                <span className="tile-icon tint-sage" style={{ margin: '0 auto 14px' }}><Icon name={v.i} size={20} color="var(--violet-2)" /></span>
                <h3 className="h-4" style={{ marginBottom: 6 }}>{v.t}</h3>
                <p className="body">{v.d}</p>
              </div>
            ))}
          </div>
          <div className="note center" style={{ marginTop: 24 }}>
            <Badge variant="verified" dot>Vérifiée</Badge>
            <span className="small" style={{ marginLeft: 10 }}>Vos documents restent strictement confidentiels et ne sont jamais publiés.</span>
          </div>
        </div>
      </section>

      {/* PLANS TEASER */}
      <section className="section" style={{ background: 'var(--mist)' }}>
        <div className="container">
          <div className="center" style={{ marginBottom: 40 }}>
            <span className="eyebrow">Des formules pour chaque étape</span>
            <h2 className="h-1" style={{ marginTop: 10 }}>Commencez gratuitement</h2>
          </div>
          <div className="grid grid-3">
            {plans.map((p) => (
              <div key={p.id} className="card card-pad" style={p.highlight ? { borderColor: 'var(--violet)', boxShadow: '0 12px 40px rgba(124,95,207,0.15)' } : undefined}>
                <div className="between">
                  <h3 className="h-3">{p.name}</h3>
                  {p.highlight && <Badge variant="featured">Populaire</Badge>}
                </div>
                <p className="small muted" style={{ marginBottom: 14 }}>{p.tagline}</p>
                <div className="price" style={{ marginBottom: 16 }}>
                  {p.price === 0 ? 'Gratuit' : euro(p.price)}<small>{p.price === 0 ? '' : p.period}</small>
                </div>
                {/* See the hero CTA comment above — routes to /contact instead of
                    silently creating a client account for a practitioner signup. */}
                <Link href="/contact" className={p.highlight ? 'btn btn-primary btn-block' : 'btn btn-soft btn-block'}>{p.cta}</Link>
              </div>
            ))}
          </div>
          <div className="center" style={{ marginTop: 28 }}>
            <Link href="/tarifs" className="more">Comparer les formules en détail →</Link>
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      {featured && (
        <section className="section">
          <div className="container-narrow center">
            <Rating value={featured.rating} count={featured.reviews} size={18} showCount />
            <p className="serif" style={{ fontSize: 'clamp(22px,3.2vw,34px)', lineHeight: 1.32, margin: '20px 0 28px', fontWeight: 400 }}>
              « Aura m’a permis de remplir mon agenda sans démarchage. Les clients arrivent déjà en confiance, et je suis payée sans stress. »
            </p>
            <div className="row gap-3" style={{ justifyContent: 'center' }}>
              <Avatar src={featured.photo} name={featured.name} tone={featured.tone} size={48} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 500 }}>{featured.name}</div>
                <div className="small">{featured.specialties[0]} · {featured.city}</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="section">
        <div className="container">
          <div className="aurora-dark grain card" style={{ '--orb-x': '80%', '--orb-y': '20%', padding: 'clamp(40px,6vw,72px)', textAlign: 'center', borderRadius: 'var(--r-sheet)' }}>
            <h2 className="h-1" style={{ color: '#fff', marginBottom: 14 }}>Votre vocation mérite d’être vue.</h2>
            <p className="lead" style={{ color: 'rgba(255,255,255,0.82)', maxWidth: 520, margin: '0 auto 28px' }}>Créez votre profil aujourd’hui. La vérification est offerte, et le premier mois aussi.</p>
            <div className="row gap-3" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
              {/* See the hero CTA comment above. */}
              <Link href="/contact" className="btn btn-aurora btn-lg">Nous contacter</Link>
              <Link href="/comment-ca-marche" className="btn btn-soft btn-lg" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}>Comment ça marche</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
