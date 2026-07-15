/**
 * Platform commission rate (fraction of a booking's montant_brut kept by Aura, the rest
 * going to the praticien via Stripe Connect's application_fee_amount — see Plan 08f).
 *
 * Kept as a synchronous, dependency-free pair of module-level functions (not a service
 * method) because the booking hot path (RendezVousService.create(), Plan 08f) calls
 * getCommissionRate() synchronously while building a PaymentIntent — an async DB round
 * trip there would add latency for a value that changes rarely (an admin edits it from
 * admin/parametres/facturation a handful of times a year, not per booking). The real,
 * persisted source of truth is the platform_settings table (PlatformSetting entity); this
 * module holds an in-memory cache of its one row, warmed at boot and refreshed on every
 * admin write — see PlatformSettingsService (server/src/platform-settings/).
 *
 * Unit: a decimal fraction (0.15, not 15) end to end — the admin API and this module agree
 * on this unit; only the web admin/parametres/facturation page (which shows a percentage
 * input) converts, at its own presentation boundary.
 */
export const DEFAULT_COMMISSION_RATE = 0.15;

let currentRate = DEFAULT_COMMISSION_RATE;

export function getCommissionRate(): number {
  return currentRate;
}

/** Called by PlatformSettingsService.onModuleInit() and after every admin PUT. */
export function setCommissionRate(rate: number): void {
  currentRate = rate;
}
