// Pure helpers for the échanges (barter) domain — no backend calls here.

/**
 * The client-facing "Proposer un échange" form only collects give/want/format/
 * delay/message (see compte/echanges), but the backend's CreateEchangeDto
 * requires a `sujet` (subject line). Rather than adding a field the product
 * spec doesn't ask for, synthesize a readable one from what the user gave us.
 */
export function buildEchangeSujet(propose, recherche) {
  const p = (propose || '').trim();
  const r = (recherche || '').trim();
  if (p && r) return `Échange : ${p} contre ${r}`.slice(0, 255);
  if (p) return `Je propose : ${p}`.slice(0, 255);
  if (r) return `Je recherche : ${r}`.slice(0, 255);
  return 'Échange';
}
