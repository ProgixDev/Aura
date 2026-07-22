import Link from 'next/link';
import { ModalButton } from '@/components/ui/ModalButton';
import { Lotus } from '@/components/ui/Lotus';

export default function ManifestePage() {
  return (
    <>
      {/* HERO */}
      <section className="aurora-dark grain" style={{ '--orb-x': '50%', '--orb-y': '22%', '--orb-1': '#C4B0E8', '--orb-2': '#7B5FCF', padding: '120px 0 130px', textAlign: 'center' }}>
        <div className="container-narrow reveal">
          <Lotus size={30} color="rgba(255,255,255,0.9)" />
          <span className="eyebrow" style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginTop: 18 }}>Notre manifeste</span>
          <h1 className="h-display" style={{ color: '#fff', margin: '18px 0 8px' }}>
            Le soin mérite mieux que <span className="italic" style={{ color: 'var(--violet)' }}>la chance</span>.
          </h1>
        </div>
      </section>

      {/* PROSE */}
      <section className="section">
        <div className="container-narrow">
          <article className="stack" style={{ gap: 28 }}>
            <p className="lead">
              Il y a, chez chacun de nous, des moments où le corps demande qu’on l’écoute. Une fatigue qui ne passe pas, un nœud ancien, un sommeil qui fuit. On cherche alors quelqu’un. Une présence, une paire de mains, une oreille. Et trop souvent, on cherche dans le noir.
            </p>

            <p className="body">
              Le bien-être énergétique est peuplé de praticiens remarquables. Des personnes qui ont étudié, pratiqué, douté, recommencé. Des gens sérieux, prudents, honnêtes. Mais ils partagent leur ciel avec d’autres voix : celles qui promettent l’impossible, qui dramatisent, qui découragent un médecin. Et pour qui cherche, rien ne distingue les unes des autres.
            </p>

            <blockquote className="pull serif italic" style={{ fontSize: 'clamp(24px,3.4vw,34px)', lineHeight: 1.32, color: 'var(--violet-2)', borderLeft: '3px solid var(--violet)', paddingLeft: 24, margin: '8px 0' }}>
              « Nous refusons que trouver la bonne personne relève du hasard. »
            </blockquote>

            <p className="body">
              GuériEnergies existe pour cela. Pour qu’un badge veuille dire quelque chose. Pour que « vérifiée » ne soit pas un mot vide mais une promesse tenue : des diplômes contrôlés, un numéro de SIRET vérifié, une identité confirmée. À la main. Un par un. Parce que la confiance ne s’automatise pas.
            </p>

            <h2 className="h-2 serif" style={{ marginTop: 12 }}>Ce en quoi nous croyons</h2>

            <p className="body">
              Nous croyons que <span className="serif-accent">la rigueur et la douceur</span> ne s’opposent pas. On peut être intraitable sur les faits et infiniment respectueux dans la forme. Exigeants sur les preuves, accueillants dans le ton. C’est même la seule manière, croyons-nous, de prendre soin pour de bon.
            </p>

            <p className="body">
              Nous croyons qu’un bon praticien ne promet jamais de miracle. Qu’il connaît ses limites, qu’il oriente vers un médecin quand il le faut, qu’il respecte le rythme de chacun. Nous croyons que ces praticiens-là méritent d’être vus — et que ceux qui culpabilisent, qui créent de la dépendance, n’ont pas leur place ici.
            </p>

            <blockquote className="pull serif italic" style={{ fontSize: 'clamp(24px,3.4vw,34px)', lineHeight: 1.32, color: 'var(--violet-2)', borderLeft: '3px solid var(--violet)', paddingLeft: 24, margin: '8px 0' }}>
              « Un espace doux, mais jamais naïf. »
            </blockquote>

            <p className="body">
              Nous croyons que l’argent ne doit jamais circuler dans l’ombre. Que le paiement protégé n’est pas un détail technique mais une question de dignité : on ne verse au praticien qu’après la séance, et si un litige survient, nous sommes là pour trancher. Côte à côte avec la personne, jamais contre elle.
            </p>

            <p className="body">
              Nous croyons, enfin, qu’une plateforme peut tisser une <span className="serif-accent">communauté</span> plutôt qu’un simple marché. Des praticiens qui s’échangent leurs soins, se forment, organisent des cercles et des retraites. Des clients qui repartent posés, et reviennent. Un réseau d’entraide, pas une vitrine.
            </p>

            <h2 className="h-2 serif" style={{ marginTop: 12 }}>Notre promesse</h2>

            <p className="body">
              Nous ne vous dirons jamais ce que vous devez ressentir. Nous ne vous vendrons pas de certitudes. Nous vous offrirons un cadre clair, vérifié, sûr — et la liberté d’y trouver, à votre rythme, la personne qu’il vous faut.
            </p>

            <p className="lead serif italic accent center" style={{ marginTop: 16 }}>
              Le soin mérite mieux que la chance. Il mérite de la confiance.
            </p>

            <div className="center" style={{ marginTop: 8 }}>
              <Lotus size={20} color="var(--violet-2)" />
              <p className="small muted" style={{ marginTop: 10 }}>— L’équipe GuériEnergies</p>
            </div>
          </article>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container-narrow center">
          <div className="divider" style={{ marginBottom: 40 }} />
          <h2 className="h-2" style={{ marginBottom: 14 }}>Partagez ce chemin avec nous</h2>
          <p className="lead muted" style={{ maxWidth: 480, margin: '0 auto 28px' }}>
            Que vous cherchiez un praticien ou que vous en soyez un, votre place est ici.
          </p>
          <div className="row gap-3" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
            <ModalButton modal="signup" className="btn btn-primary btn-lg">Rejoindre GuériEnergies</ModalButton>
            <Link href="/a-propos" className="btn btn-ghost btn-lg">À propos de nous</Link>
          </div>
        </div>
      </section>
    </>
  );
}
