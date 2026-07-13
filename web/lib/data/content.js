// Marketing content — blog, FAQ, testimonials, jobs, press, help, values, plans.

export const blogPosts = [
  { slug: 'choisir-praticien-confiance', title: 'Comment choisir un praticien en confiance', category: 'Guide', readTime: '6 min', date: '2026-05-20', tone: 'violet', excerpt: "Vérifications, premiers échanges, signaux à écouter : notre méthode pour trouver la bonne personne.", author: 'L\'équipe Aura',
    body: "Trouver un praticien du bien-être énergétique peut sembler intimidant. Voici comment aborder cette recherche avec sérénité.\n\nLa première chose à regarder, c'est la vérification. Sur Aura, chaque badge « Vérifiée » signifie que nous avons contrôlé les diplômes, l'assurance et l'identité. Mais au-delà du badge, fiez-vous à votre ressenti lors du premier échange.\n\nPosez vos questions. Un bon praticien ne promet jamais de miracle, ne dramatise pas, et respecte votre rythme. Si une conversation vous met mal à l'aise, écoutez ce signal." },
  { slug: 'magnetisme-mythes-realites', title: 'Le magnétisme : mythes et réalités', category: 'Discipline', readTime: '8 min', date: '2026-05-12', tone: 'sky', excerpt: "Ce que le magnétisme peut et ne peut pas faire, expliqué simplement.", author: 'Élodie Marceau',
    body: "Le magnétisme intrigue autant qu'il divise. Démêlons le vrai du faux.\n\nLe magnétisme ne soigne pas les maladies : il accompagne la personne. C'est une nuance essentielle. Un magnétiseur sérieux vous orientera toujours vers un médecin si nécessaire.\n\nCe que beaucoup rapportent : un apaisement, un meilleur sommeil, une détente profonde. Ces effets sont réels et précieux, même s'ils ne remplacent pas un suivi médical." },
  { slug: 'preparer-premiere-seance', title: 'Préparer sa première séance', category: 'Conseils', readTime: '4 min', date: '2026-04-30', tone: 'sage', excerpt: 'Quelques gestes simples pour aborder votre séance dans les meilleures conditions.', author: 'L\'équipe Aura',
    body: "Une première séance, ça se prépare un peu. Pas trop, juste ce qu'il faut.\n\nVenez sans attente précise. Le lâcher-prise fait une grande partie du travail. Habillez-vous confortablement, mangez léger, et arrivez quelques minutes en avance pour vous poser.\n\nAprès la séance, ménagez-vous un temps calme. Buvez de l'eau. Et notez vos ressentis : ils sont précieux pour la suite." },
  { slug: 'troc-de-soins', title: 'Le troc de soins, une économie du don', category: 'Communauté', readTime: '5 min', date: '2026-04-18', tone: 'gold', excerpt: 'Comment les praticiens échangent leurs savoir-faire sur Aura.', author: 'L\'équipe Aura',
    body: "Sur Aura, les praticiens peuvent échanger leurs services sans argent. Un soin contre un soin, une formation contre un coup de main.\n\nCette économie du don tisse une communauté solidaire. Elle permet aussi aux praticiens débutants de se former auprès des plus expérimentés." },
  { slug: 'retraites-pourquoi', title: 'Pourquoi partir en retraite', category: 'Bien-être', readTime: '7 min', date: '2026-04-02', tone: 'violet', excerpt: 'Le pouvoir réparateur de quelques jours hors du quotidien.', author: 'Mathieu Vernet',
    body: "Trois jours hors du temps valent parfois trois mois de bonnes résolutions.\n\nUne retraite, c'est sortir du flux. Couper les notifications, ralentir, se reconnecter au corps et à la nature. Le système nerveux, enfin, peut souffler." },
  { slug: 'reconnaitre-bon-praticien', title: 'Reconnaître un praticien sérieux', category: 'Guide', readTime: '6 min', date: '2026-03-15', tone: 'sky', excerpt: 'Les signaux qui distinguent un accompagnement éthique.', author: 'L\'équipe Aura',
    body: "Un praticien sérieux respecte trois principes : il ne promet pas l'impossible, il connaît ses limites, et il vous oriente vers un médecin quand c'est nécessaire.\n\nMéfiez-vous des discours qui culpabilisent, qui créent de la dépendance, ou qui découragent un suivi médical." },
];

export const faq = [
  { cat: 'Réservation', items: [
    { q: 'Comment réserver une séance ?', a: "Choisissez un praticien, sélectionnez un créneau disponible, puis réglez en ligne. Vous recevez une confirmation immédiate par email." },
    { q: 'Puis-je annuler ?', a: "Oui, gratuitement jusqu'à 24h avant la séance. Au-delà, des frais peuvent s'appliquer selon le praticien." },
    { q: 'Présentiel ou visio ?', a: "Cela dépend du praticien. Le filtre « modalité » vous permet de ne voir que les praticiens correspondant à votre préférence." },
  ]},
  { cat: 'Paiement', items: [
    { q: 'Le paiement est-il sécurisé ?', a: "Oui. Les paiements passent par un prestataire certifié. L'argent n'est versé au praticien qu'après la séance." },
    { q: 'Pourquoi ne jamais payer en privé ?', a: "Les paiements hors plateforme ne sont pas protégés. En cas de litige, nous ne pouvons intervenir que si la transaction est passée par Aura." },
    { q: 'Puis-je obtenir une facture ?', a: 'Oui, chaque paiement génère une facture téléchargeable depuis votre espace compte.' },
  ]},
  { cat: 'Praticiens', items: [
    { q: 'Que signifie le badge « Vérifiée » ?', a: 'Nous avons contrôlé les diplômes, l\'assurance professionnelle et l\'identité du praticien.' },
    { q: 'Comment devenir praticien sur Aura ?', a: 'Créez un profil praticien, soumettez vos documents, et notre équipe les vérifie sous 48h.' },
  ]},
  { cat: 'Confiance & sécurité', items: [
    { q: 'Comment signaler un problème ?', a: 'Chaque profil, message et avis dispose d\'un bouton de signalement. Notre équipe de modération intervient rapidement.' },
    { q: 'Mes données sont-elles protégées ?', a: 'Oui, conformément au RGPD. Consultez notre politique de confidentialité pour le détail.' },
  ]},
];

export const testimonials = [
  { name: 'Marie B.', city: 'Annecy', tone: 'sky', rating: 5, text: "J'arrivais nouée, je suis sortie posée. Aura m'a permis de trouver quelqu'un de confiance sans fouiller des heures." },
  { name: 'Thomas R.', city: 'Lyon', tone: 'violet', rating: 5, text: 'Sceptique au départ, je ressors apaisé. Pas de discours mystique, du concret. Merci.' },
  { name: 'Léa M.', city: 'Paris', tone: 'sage', rating: 5, text: 'Trois séances et mon sommeil est transformé. La praticienne ne promet rien, et c\'est exactement ce qu\'il faut.' },
  { name: 'Sophie D.', city: 'Bordeaux', tone: 'gold', rating: 5, text: "Camille m'a aidée à dénouer quelque chose de très ancien. Bouleversant et libérateur." },
  { name: 'Julien P.', city: 'Marseille', tone: 'sky', rating: 5, text: "Le bain sonore est une expérience à part. On en ressort lavé de l'intérieur." },
  { name: 'Nadia K.', city: 'Toulouse', tone: 'violet', rating: 5, text: 'Le coach pose les bonnes questions, celles qui dérangent un peu. J\'avance enfin.' },
];

export const jobs = [
  { id: 'j1', title: 'Responsable confiance & sécurité', team: 'Opérations', location: 'Paris / Remote', type: 'CDI' },
  { id: 'j2', title: 'Ingénieur·e produit (Full-stack)', team: 'Tech', location: 'Remote (France)', type: 'CDI' },
  { id: 'j3', title: 'Chargé·e de modération', team: 'Communauté', location: 'Lyon', type: 'CDI' },
  { id: 'j4', title: 'Designer produit', team: 'Design', location: 'Paris / Remote', type: 'CDI' },
  { id: 'j5', title: 'Chargé·e de partenariats praticiens', team: 'Croissance', location: 'Remote', type: 'CDI' },
];

export const pressItems = [
  { id: 'pi1', outlet: 'Le Monde', title: 'Le bien-être énergétique se structure en ligne', date: 'mai 2026', tone: 'violet' },
  { id: 'pi2', outlet: 'Madame Figaro', title: 'Aura, le « Doctolib » des médecines douces', date: 'avr. 2026', tone: 'sky' },
  { id: 'pi3', outlet: 'France Inter', title: 'Confiance et soins alternatifs : enquête', date: 'mars 2026', tone: 'sage' },
  { id: 'pi4', outlet: 'Les Échos', title: 'La start-up qui vérifie les guérisseurs', date: 'févr. 2026', tone: 'gold' },
];

export const helpArticles = [
  { slug: 'reserver-seance', cat: 'Premiers pas', title: 'Réserver votre première séance' },
  { slug: 'annuler-reporter', cat: 'Réservation', title: 'Annuler ou reporter une séance' },
  { slug: 'paiement-securise', cat: 'Paiement', title: 'Comprendre le paiement sécurisé' },
  { slug: 'badge-verifie', cat: 'Confiance', title: 'Le badge Vérifiée, comment ça marche' },
  { slug: 'signaler-probleme', cat: 'Confiance', title: 'Signaler un problème' },
  { slug: 'devenir-praticien', cat: 'Praticiens', title: 'Créer un profil praticien' },
  { slug: 'gerer-disponibilites', cat: 'Praticiens', title: 'Gérer ses disponibilités' },
  { slug: 'donnees-personnelles', cat: 'Compte', title: 'Gérer vos données personnelles' },
];

export const values = [
  { i: 'shield', t: 'La confiance avant tout', d: 'Chaque praticien est vérifié, chaque paiement protégé. La sécurité n\'est pas une option.' },
  { i: 'heart', t: 'Le respect du chemin de chacun', d: 'Pas de jugement, pas de promesse miracle. Juste un espace pour celles et ceux qui cherchent.' },
  { i: 'users', t: 'Une communauté qui prend soin', d: 'Praticiens et clients tissent ensemble un réseau d\'entraide et de bienveillance.' },
  { i: 'sparkle', t: 'L\'exigence dans la douceur', d: 'Nous sommes rigoureux sur les faits, doux dans la forme. Les deux comptent.' },
];

export const plans = [
  { id: 'essentiel', name: 'Essentiel', price: 0, period: 'gratuit', tagline: 'Pour démarrer', features: ['Profil public vérifié', 'Jusqu\'à 5 séances / mois', 'Messagerie sécurisée', 'Paiement protégé'], cta: 'Commencer gratuitement', highlight: false },
  { id: 'pro', name: 'Pro', price: 29, period: '/ mois', tagline: 'Le choix des praticiens établis', features: ['Tout Essentiel', 'Séances illimitées', 'Mise en avant dans la recherche', 'Statistiques détaillées', 'Gestion d\'événements', 'Troc de soins'], cta: 'Choisir Pro', highlight: true },
  { id: 'premium', name: 'Premium', price: 59, period: '/ mois', tagline: 'Pour rayonner', features: ['Tout Pro', 'Badge « À la une »', 'Page praticien personnalisée', 'Support prioritaire', 'Accompagnement dédié', 'Outils retraites & cercles'], cta: 'Choisir Premium', highlight: false },
];

export const getBlogPost = (slug) => blogPosts.find((p) => p.slug === slug);
