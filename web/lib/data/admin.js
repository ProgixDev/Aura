// Admin datasets — clients, bookings, transactions, moderation, finance, system.
// Deterministic (no Math.random) so SSR and client render match.
import { practitioners } from './practitioners';

const PRAT = practitioners.map((p) => ({ id: p.id, name: p.name, tone: p.tone, photo: p.photo }));
const pick = (arr, i) => arr[i % arr.length];

export const clients = [
  { id: 'c1', name: 'Sarah Lemoine', email: 'sarah.lemoine@example.com', city: 'Annecy', joined: '2024-02-11', status: 'active', bookings: 7, spent: 525, tone: 'sky' },
  { id: 'c2', name: 'Julien Mercier', email: 'julien.mercier@example.com', city: 'Lyon', joined: '2024-05-03', status: 'active', bookings: 3, spent: 255, tone: 'violet' },
  { id: 'c3', name: 'Nadia Cherif', email: 'nadia.cherif@example.com', city: 'Paris', joined: '2023-11-20', status: 'active', bookings: 12, spent: 980, tone: 'sage' },
  { id: 'c4', name: 'Thomas Roux', email: 'thomas.roux@example.com', city: 'Bordeaux', joined: '2024-08-14', status: 'active', bookings: 2, spent: 160, tone: 'gold' },
  { id: 'c5', name: 'Léa Marchand', email: 'lea.marchand@example.com', city: 'Marseille', joined: '2024-01-07', status: 'suspended', bookings: 5, spent: 410, tone: 'violet' },
  { id: 'c6', name: 'Hugo Bonnet', email: 'hugo.bonnet@example.com', city: 'Toulouse', joined: '2025-01-22', status: 'active', bookings: 1, spent: 95, tone: 'sky' },
  { id: 'c7', name: 'Claire Dubois', email: 'claire.dubois@example.com', city: 'Strasbourg', joined: '2023-09-30', status: 'active', bookings: 9, spent: 720, tone: 'sage' },
  { id: 'c8', name: 'Antoine Faure', email: 'antoine.faure@example.com', city: 'Lille', joined: '2024-06-18', status: 'active', bookings: 4, spent: 340, tone: 'gold' },
  { id: 'c9', name: 'Inès Garnier', email: 'ines.garnier@example.com', city: 'Nantes', joined: '2024-03-26', status: 'active', bookings: 6, spent: 480, tone: 'violet' },
  { id: 'c10', name: 'Marie Blanc', email: 'marie.blanc@example.com', city: 'Annecy', joined: '2024-12-02', status: 'active', bookings: 8, spent: 600, tone: 'sky' },
  { id: 'c11', name: 'Karim Aziz', email: 'karim.aziz@example.com', city: 'Lyon', joined: '2025-02-15', status: 'pending', bookings: 0, spent: 0, tone: 'sage' },
  { id: 'c12', name: 'Sophie Petit', email: 'sophie.petit@example.com', city: 'Nice', joined: '2023-07-11', status: 'active', bookings: 14, spent: 1180, tone: 'gold' },
];

const STATUSES = ['confirmed', 'completed', 'completed', 'pending', 'cancelled', 'completed'];
const DATES = ['2026-05-28', '2026-05-26', '2026-05-24', '2026-05-22', '2026-05-20', '2026-05-18', '2026-05-15', '2026-05-12', '2026-05-10', '2026-05-08', '2026-05-05', '2026-05-02', '2026-04-29', '2026-04-26', '2026-04-22', '2026-04-18', '2026-04-14', '2026-04-10'];
const SLOTS = ['10h00', '11h30', '14h00', '15h30', '17h00', '18h30'];

export const bookings = DATES.map((date, i) => {
  const prat = pick(PRAT, i + 1);
  const client = pick(clients, i + 2);
  const p = practitioners.find((x) => x.id === prat.id);
  return {
    id: `b${i + 1}`, ref: `AUR-${2600 + i}`, date, slot: pick(SLOTS, i),
    practitionerId: prat.id, practitionerName: prat.name, practitionerPhoto: prat.photo,
    clientId: client.id, clientName: client.name,
    discipline: p.specialties[0], mode: i % 3 === 0 ? 'visio' : 'présentiel',
    price: p.price, status: pick(STATUSES, i),
  };
});

export const transactions = bookings.map((b, i) => ({
  id: `t${i + 1}`, ref: `TX-${48200 + i}`, date: b.date, bookingId: b.id,
  clientName: b.clientName, practitionerName: b.practitionerName,
  gross: b.price, fee: Math.round(b.price * 0.15), net: b.price - Math.round(b.price * 0.15),
  method: i % 4 === 0 ? 'Apple Pay' : i % 3 === 0 ? 'PayPal' : 'Carte',
  status: b.status === 'cancelled' ? 'refunded' : b.status === 'pending' ? 'processing' : 'paid',
}));

export const refunds = transactions.filter((t) => t.status === 'refunded').map((t, i) => ({
  id: `rf${i + 1}`, date: t.date, transactionRef: t.ref, clientName: t.clientName,
  amount: t.gross, reason: pick(['Annulation client', 'Praticien indisponible', 'Litige résolu'], i), status: i === 0 ? 'pending' : 'completed',
}));

export const disputes = [
  { id: 'd1', ref: 'LIT-204', date: '2026-05-21', clientName: 'Léa Marchand', practitionerName: 'Pierre Cazeneuve', amount: 95, reason: 'Séance écourtée', status: 'open', priority: 'haute' },
  { id: 'd2', ref: 'LIT-203', date: '2026-05-17', clientName: 'Antoine Faure', practitionerName: 'Mathieu Vernet', amount: 90, reason: 'Praticien absent', status: 'open', priority: 'haute' },
  { id: 'd3', ref: 'LIT-201', date: '2026-05-09', clientName: 'Hugo Bonnet', practitionerName: 'Sylvain Boukhari', amount: 60, reason: 'Insatisfaction', status: 'resolved', priority: 'normale' },
];

export const reports = [
  { id: 'rp1', date: '2026-05-29', type: 'Avis', target: 'Avis de « Anonyme » sur Pierre Cazeneuve', reporter: 'Pierre Cazeneuve', reason: 'Avis diffamatoire', status: 'pending', priority: 'haute' },
  { id: 'rp2', date: '2026-05-28', type: 'Profil', target: 'Profil non vérifié — « Marc T. »', reporter: 'Système', reason: 'Tentative de paiement hors plateforme', status: 'pending', priority: 'haute' },
  { id: 'rp3', date: '2026-05-27', type: 'Message', target: 'Conversation #4821', reporter: 'Sarah Lemoine', reason: 'Comportement déplacé', status: 'pending', priority: 'normale' },
  { id: 'rp4', date: '2026-05-24', type: 'Événement', target: 'Bain sonore de pleine lune', reporter: 'Inès Garnier', reason: 'Information trompeuse', status: 'resolved', priority: 'basse' },
  { id: 'rp5', date: '2026-05-20', type: 'Profil', target: 'Camille Rossi', reporter: 'Anonyme', reason: 'Fausse certification', status: 'rejected', priority: 'normale' },
];

export const tickets = [
  { id: 'tk1', ref: 'SUP-1042', subject: "Je n'ai pas reçu ma confirmation", from: 'Sarah Lemoine', channel: 'Email', date: '2026-05-29', status: 'open', priority: 'normale' },
  { id: 'tk2', ref: 'SUP-1041', subject: 'Comment annuler une séance ?', from: 'Hugo Bonnet', channel: 'Chat', date: '2026-05-29', status: 'open', priority: 'basse' },
  { id: 'tk3', ref: 'SUP-1040', subject: 'Problème de paiement carte', from: 'Thomas Roux', channel: 'Email', date: '2026-05-28', status: 'pending', priority: 'haute' },
  { id: 'tk4', ref: 'SUP-1039', subject: 'Demande de facture', from: 'Claire Dubois', channel: 'Email', date: '2026-05-27', status: 'open', priority: 'basse' },
  { id: 'tk5', ref: 'SUP-1038', subject: 'Praticien injoignable', from: 'Antoine Faure', channel: 'Chat', date: '2026-05-26', status: 'resolved', priority: 'haute' },
  { id: 'tk6', ref: 'SUP-1037', subject: 'Modifier mon adresse email', from: 'Inès Garnier', channel: 'Email', date: '2026-05-25', status: 'closed', priority: 'basse' },
];

export const team = [
  { id: 'u1', name: 'Aïcha Benali', email: 'aicha@aura.fr', role: 'Administrateur', status: 'active', lastActive: "aujourd'hui", tone: 'violet' },
  { id: 'u2', name: 'Lucas Moreau', email: 'lucas@aura.fr', role: 'Modérateur', status: 'active', lastActive: "il y a 2h", tone: 'sky' },
  { id: 'u3', name: 'Émilie Fontaine', email: 'emilie@aura.fr', role: 'Support', status: 'active', lastActive: 'hier', tone: 'sage' },
  { id: 'u4', name: 'Raphaël Girard', email: 'raphael@aura.fr', role: 'Comptabilité', status: 'active', lastActive: 'il y a 3 jours', tone: 'gold' },
  { id: 'u5', name: 'Chloé Dupont', email: 'chloe@aura.fr', role: 'Modérateur', status: 'invited', lastActive: '—', tone: 'violet' },
];

export const roles = [
  { id: 'admin', name: 'Administrateur', members: 1, desc: 'Accès complet à tous les modules et réglages.', perms: ['Tout gérer', 'Finances', 'Équipe & rôles', 'Réglages système'] },
  { id: 'mod', name: 'Modérateur', members: 2, desc: 'Modération des contenus, avis, signalements et messages.', perms: ['Avis', 'Signalements', 'Messages', 'Profils'] },
  { id: 'support', name: 'Support', members: 1, desc: 'Gestion des tickets et assistance utilisateur.', perms: ['Tickets', 'Clients (lecture)', 'Réservations'] },
  { id: 'finance', name: 'Comptabilité', members: 1, desc: 'Paiements, remboursements, exports comptables.', perms: ['Paiements', 'Remboursements', 'Abonnements', 'Exports'] },
];

export const auditLog = [
  { id: 'a1', when: "il y a 12 min", who: 'Lucas Moreau', action: 'a masqué un avis', target: 'Avis #r7', kind: 'moderation' },
  { id: 'a2', when: 'il y a 1h', who: 'Aïcha Benali', action: 'a vérifié un praticien', target: 'Anaïs Lefèvre', kind: 'verification' },
  { id: 'a3', when: 'il y a 2h', who: 'Raphaël Girard', action: 'a émis un remboursement', target: 'TX-48211', kind: 'finance' },
  { id: 'a4', when: 'il y a 3h', who: 'Système', action: 'a détecté une tentative de paiement hors plateforme', target: 'Conversation #4821', kind: 'security' },
  { id: 'a5', when: 'hier', who: 'Émilie Fontaine', action: 'a clôturé un ticket', target: 'SUP-1038', kind: 'support' },
  { id: 'a6', when: 'hier', who: 'Aïcha Benali', action: 'a invité un membre', target: 'chloe@aura.fr', kind: 'system' },
  { id: 'a7', when: 'il y a 2 jours', who: 'Lucas Moreau', action: 'a suspendu un compte', target: 'Léa Marchand', kind: 'moderation' },
];

export const cercles = [
  { id: 'cr1', name: 'Cercle Aura — Paris', members: 184, posts: 320, lead: 'Camille Rossi', tone: 'violet', status: 'active' },
  { id: 'cr2', name: 'Cercle de femmes — Lyon', members: 96, posts: 142, lead: 'Camille Rossi', tone: 'sky', status: 'active' },
  { id: 'cr3', name: 'Praticiens du Sud-Ouest', members: 58, posts: 88, lead: 'Anaïs Lefèvre', tone: 'sage', status: 'active' },
  { id: 'cr4', name: 'Méditation quotidienne', members: 240, posts: 510, lead: 'Sylvain Boukhari', tone: 'gold', status: 'active' },
  { id: 'cr5', name: 'Chamanisme & nature', members: 41, posts: 63, lead: 'Mathieu Vernet', tone: 'sage', status: 'archived' },
];

export const promos = [
  { id: 'pr1', code: 'BIENVENUE15', type: '15%', uses: 1280, max: '∞', expiry: '31 déc. 2026', status: 'active' },
  { id: 'pr2', code: 'EQUINOXE25', type: '25 €', uses: 86, max: 200, expiry: '23 mars 2026', status: 'active' },
  { id: 'pr3', code: 'PLEINELUNE', type: '10%', uses: 42, max: 100, expiry: '14 avr. 2026', status: 'active' },
  { id: 'pr4', code: 'NOEL2025', type: '20%', uses: 530, max: 500, expiry: '25 déc. 2025', status: 'archived' },
];

export const subscriptions = [
  { id: 's1', practitionerName: 'Élodie Marceau', plan: 'Praticien Pro', price: 29, since: '2024-01-12', status: 'active', renews: '2026-06-12' },
  { id: 's2', practitionerName: 'Camille Rossi', plan: 'Praticien Pro', price: 29, since: '2023-09-23', status: 'active', renews: '2026-06-23' },
  { id: 's3', practitionerName: 'Thomas Berger', plan: 'Praticien Premium', price: 59, since: '2024-03-01', status: 'active', renews: '2026-06-01' },
  { id: 's4', practitionerName: 'Sylvain Boukhari', plan: 'Praticien Essentiel', price: 0, since: '2023-06-15', status: 'active', renews: '—' },
  { id: 's5', practitionerName: 'Pierre Cazeneuve', plan: 'Praticien Pro', price: 29, since: '2023-05-19', status: 'past_due', renews: '2026-05-19' },
];

export const adminNotifications = [
  { id: 'n1', title: 'Pic de réservations', body: '+38% de réservations cette semaine vs. la précédente.', when: 'il y a 1h', kind: 'success' },
  { id: 'n2', title: '4 praticiens en attente de vérification', body: 'La file de vérification dépasse le seuil de 3.', when: 'il y a 3h', kind: 'warning' },
  { id: 'n3', title: 'Litige prioritaire ouvert', body: 'LIT-204 — séance écourtée signalée par Léa Marchand.', when: 'hier', kind: 'danger' },
  { id: 'n4', title: 'Paiement Stripe reçu', body: 'Versement hebdomadaire aux praticiens effectué.', when: 'hier', kind: 'info' },
];

export const emailTemplates = [
  { id: 'em1', name: 'Confirmation de réservation', subject: 'Votre séance est confirmée ✦', updated: '2026-05-10', status: 'active' },
  { id: 'em2', name: 'Rappel 24h avant', subject: 'Votre séance, c\'est demain', updated: '2026-05-08', status: 'active' },
  { id: 'em3', name: 'Bienvenue', subject: 'Bienvenue dans le cercle Aura', updated: '2026-04-22', status: 'active' },
  { id: 'em4', name: 'Praticien vérifié', subject: 'Votre profil est vérifié 🌿', updated: '2026-04-19', status: 'active' },
  { id: 'em5', name: 'Demande d\'avis', subject: 'Comment s\'est passée votre séance ?', updated: '2026-03-30', status: 'draft' },
];

export const getClient = (id) => clients.find((c) => c.id === id);
export const getBooking = (id) => bookings.find((b) => b.id === id);
export const getTransaction = (id) => transactions.find((t) => t.id === id);
export const getTicket = (id) => tickets.find((t) => t.id === id);
export const getCercle = (id) => cercles.find((c) => c.id === id);
