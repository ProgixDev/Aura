import { CAPABILITIES, CAPABILITY_ORDER, hasCapability, ROLES } from './capabilities';

describe('capabilities', () => {
  it('defines exactly the 4 roles from the mock', () => {
    expect(ROLES).toEqual(['admin', 'moderateur', 'support', 'comptabilite']);
  });

  it('admin has all 11 capabilities', () => {
    expect(CAPABILITIES.admin.size).toBe(11);
    for (const cap of CAPABILITY_ORDER) expect(CAPABILITIES.admin.has(cap)).toBe(true);
  });

  it("moderateur matches the mock's checked columns exactly", () => {
    expect([...CAPABILITIES.moderateur].sort()).toEqual(
      ['avis_moderation', 'clients', 'dashboard', 'praticiens_verification', 'signalements_litiges'].sort(),
    );
  });

  it("support matches the mock's checked columns exactly", () => {
    expect([...CAPABILITIES.support].sort()).toEqual(
      ['clients', 'dashboard', 'reservations', 'tickets_support'].sort(),
    );
  });

  it("comptabilite matches the mock's checked columns exactly", () => {
    expect([...CAPABILITIES.comptabilite].sort()).toEqual(
      ['abonnements_promos', 'dashboard', 'paiements_remboursements'].sort(),
    );
  });

  it('hasCapability: admin always passes, other roles only pass their own capabilities', () => {
    expect(hasCapability('admin', 'reglages_systeme')).toBe(true);
    expect(hasCapability('moderateur', 'avis_moderation')).toBe(true);
    expect(hasCapability('moderateur', 'paiements_remboursements')).toBe(false);
    expect(hasCapability('support', 'reservations')).toBe(true);
    expect(hasCapability('support', 'signalements_litiges')).toBe(false);
    expect(hasCapability('comptabilite', 'paiements_remboursements')).toBe(true);
    expect(hasCapability('comptabilite', 'clients')).toBe(false);
  });

  it('defaults a null/undefined/unrecognized role to full admin access', () => {
    expect(hasCapability(null, 'reglages_systeme')).toBe(true);
    expect(hasCapability(undefined, 'equipe_roles')).toBe(true);
    expect(hasCapability('superadmin', 'reglages_systeme')).toBe(true);
  });
});
