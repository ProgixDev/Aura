import { canRequestRefund } from './refund';

describe('canRequestRefund', () => {
  it('is false when the paiement is not paid', () => {
    expect(canRequestRefund({ id: 1, statut: 'en_attente' } as any, [])).toBe(false);
  });
  it('is true for a paid paiement with no remboursement rows', () => {
    expect(canRequestRefund({ id: 1, statut: 'paid' } as any, [])).toBe(true);
  });
  it('is false when a non-terminal remboursement already exists for it', () => {
    const rembs = [{ id: 9, paiement_id: 1, statut: 'en_attente' }] as any;
    expect(canRequestRefund({ id: 1, statut: 'paid' } as any, rembs)).toBe(false);
  });
  it('is true when the only remboursement for it is terminal (refuse/completed)', () => {
    const rembs = [{ id: 9, paiement_id: 1, statut: 'refuse' }] as any;
    expect(canRequestRefund({ id: 1, statut: 'paid' } as any, rembs)).toBe(true);
  });
  it('ignores remboursements tied to a different paiement', () => {
    const rembs = [{ id: 9, paiement_id: 2, statut: 'en_attente' }] as any;
    expect(canRequestRefund({ id: 1, statut: 'paid' } as any, rembs)).toBe(true);
  });
  it('handles a missing paiement gracefully', () => {
    expect(canRequestRefund(null, [])).toBe(false);
  });
});
