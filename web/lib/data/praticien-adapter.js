// Adapter: backend Praticien rows -> the shape PractitionerCard / ProfileBody
// already render. Real fields map directly; fields with no backend source
// (photo, rating, online, experience.sessions, exchange…) are left absent
// rather than invented — see plan Architecture notes.
const DEFAULT_TONE = 'violet';

export function mapPraticien(row) {
  return {
    id: row.id,
    name: `${row.firstname} ${row.lastname}`.trim(),
    specialties: row.specialite ? [row.specialite] : [],
    extraSpecialty: null,
    city: row.ville,
    region: null,
    mode: row.mode,
    price: Number(row.tarif),
    duration: null,
    rating: 0,
    reviews: 0,
    level: row.niveau,
    verified: row.statut_verification === 'valide',
    online: false,
    novice: false,
    tone: DEFAULT_TONE,
    responseTime: null,
    bio: row.bio,
    approach: null,
    experience: { years: row.experience, sessions: undefined },
    exchange: null,
    photo: null,
    hero: null,
    gallery: [],
  };
}
