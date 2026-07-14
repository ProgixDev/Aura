// Client-side preview of the server-authoritative discount computation in
// RendezVousService.create() (server/src/rendez-vous/rendez-vous.service.ts). Used only to
// show an estimated total before the booking is created — the tarif actually charged always
// comes back from the POST /api/rendez-vous response, never from this function.
export function computeDiscountedTarif(price, promo) {
  if (!promo) return price;
  return promo.type === 'pourcentage'
    ? Math.max(0, price * (1 - promo.valeur / 100))
    : Math.max(0, price - promo.valeur);
}
