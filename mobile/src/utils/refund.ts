// Pure eligibility check for the "Demander un remboursement" action —
// mirrors the backend's own rule in server/src/remboursements/remboursements.service.ts
// (store(): paiement must be 'paid', and no existing non-terminal remboursement
// for that paiement — terminal statuses are 'refuse' and 'completed').
// Mirrors web/lib/refund.js so both clients agree on the same eligibility.
import type { PaymentRecord, Remboursement } from '@data/types';

const TERMINAL_REMBOURSEMENT_STATUSES = ['refuse', 'completed'];

export function canRequestRefund(
  paiement: PaymentRecord | null | undefined,
  remboursements: Remboursement[] = [],
): boolean {
  if (!paiement || paiement.statut !== 'paid') return false;
  return !remboursements.some(
    (r) => r.paiement_id === paiement.id && !TERMINAL_REMBOURSEMENT_STATUSES.includes(r.statut),
  );
}
