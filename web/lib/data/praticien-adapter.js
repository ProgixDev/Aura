// Adapter: backend Praticien rows -> the shape PractitionerCard / ProfileBody
// already render. Real fields map directly; rating/reviews come from the
// praticiens endpoints' attached rating + reviews_count (avg/count of
// published avis). photo/hero/gallery come from the praticiens.photo/hero/gallery
// columns (Supabase Storage URLs). Fields with no backend source (online,
// experience.sessions, exchange…) are left absent rather than invented —
// see plan Architecture notes.
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
    rating: row.rating ?? 0,
    reviews: row.reviews_count ?? 0,
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
    photo: row.photo ?? null,
    hero: row.hero ?? null,
    gallery: Array.isArray(row.gallery) ? row.gallery : [],
  };
}
