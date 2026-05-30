// Exchanges (troc de soins) — ported/expanded for /compte/echanges & admin/echanges.

export const exchanges = [
  { id: 'ex1', who: 'Élodie M.', role: 'Magnétiseuse', tone: 'violet', give: '1 soin énergétique', want: '1h yoga privé', tag: 'Soin contre service', mode: 'Présentiel', delay: 'sous 2 semaines', publishedAgo: 'il y a 2 jours', message: "Je cherche à reprendre une pratique régulière du yoga en échange de soins." },
  { id: 'ex2', who: 'Mathieu V.', role: 'Chamane', tone: 'sage', give: '1 bain sonore collectif', want: 'aide montage vidéo', tag: 'Soin contre service', mode: 'Peu importe', delay: 'flexible', publishedAgo: 'il y a 4 jours', message: "Besoin d'un coup de main pour monter mes vidéos de cérémonie." },
  { id: 'ex3', who: 'Anaïs L.', role: 'Énergéticienne', tone: 'violet', give: "1 lecture d'aura", want: 'séance ostéopathie', tag: 'Soin contre soin', mode: 'Présentiel', delay: 'sous 1 mois', publishedAgo: 'il y a 1 semaine', message: 'Échange entre praticiens, dans le respect mutuel.' },
  { id: 'ex4', who: 'Sylvain B.', role: 'Maître Reiki', tone: 'gold', give: '1 séance Reiki', want: 'cours de magnétisme', tag: 'Formation contre soin', mode: 'Présentiel', delay: 'flexible', publishedAgo: 'il y a 1 semaine', message: 'En apprentissage, je souhaite progresser en magnétisme.' },
  { id: 'ex5', who: 'Lila H.', role: 'Masseuse', tone: 'sage', give: '1 massage 1h', want: 'séance sophrologie', tag: 'Soin contre soin', mode: 'Présentiel', delay: 'sous 3 semaines', publishedAgo: 'il y a 2 semaines', message: 'Curieuse de découvrir la sophrologie.' },
  { id: 'ex6', who: 'Thomas B.', role: 'Coach', tone: 'violet', give: '1 séance coaching', want: 'shooting photo portrait', tag: 'Soin contre service', mode: 'Peu importe', delay: 'flexible', publishedAgo: 'il y a 3 semaines', message: "Je refais mon site et j'ai besoin de portraits pro." },
];

export const getExchange = (id) => exchanges.find((e) => e.id === id);
