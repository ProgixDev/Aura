// Marketing content — FAQ, testimonials, jobs, press, help, values, plans.

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
