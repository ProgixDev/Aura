// Conversations + chat — ported/expanded from the app for /compte/messages & admin.
import { practitioners } from './practitioners';

export const conversations = [
  { id: 'm1', practitionerId: 'p1', name: 'Élodie Marceau', photo: '/img/practitioners/p1-avatar.png', tone: 'violet', preview: 'Bonjour Sarah, avec plaisir 🙂 je vous propose…', when: '10:42', unread: true, online: true, kind: 'praticien' },
  { id: 'm2', practitionerId: 'p2', name: 'Mathieu Vernet', photo: '/img/practitioners/p2-avatar.png', tone: 'sage', preview: "Le bain sonore de samedi est complet — j'ouvre un…", when: 'hier', unread: false, online: false, kind: 'praticien' },
  { id: 'm3', practitionerId: 'p3', name: 'Camille Rossi', photo: '/img/practitioners/p3-avatar.png', tone: 'sky', preview: 'Vous avez bien fait de venir vers moi. On regarde…', when: 'lun.', unread: false, online: true, kind: 'praticien' },
  { id: 'm4', practitionerId: null, name: 'Cercle Aura — Paris', photo: null, tone: 'gold', preview: 'Marie a partagé une ressource dans le cercle.', when: '29 mars', unread: false, online: false, kind: 'cercle' },
];

export const sampleChat = [
  { id: 'x1', fromMe: false, text: 'Bonjour Sarah, avec plaisir 🙂', time: '10:38' },
  { id: 'x2', fromMe: false, text: "Je vous propose un premier échange pour comprendre votre besoin. C'est sans engagement.", time: '10:38' },
  { id: 'x3', fromMe: true, text: "Merci Élodie. J'ai des troubles du sommeil depuis quelques mois.", time: '10:40' },
  { id: 'x4', fromMe: false, text: 'Je comprends. Le magnétisme aide souvent sur ce terrain. Souhaitez-vous réserver une première séance ?', time: '10:41' },
  { id: 'x5', fromMe: false, text: 'Je vous propose ce créneau :', time: '10:42',
    proposal: { when: 'jeu. 12 juin · 14h00', durationMinutes: 75, mode: 'présentiel', price: 75 } },
];

export const getConversation = (id) => conversations.find((c) => c.id === id);
