import { DEFAULT_COMMISSION_RATE, getCommissionRate, setCommissionRate } from './commission';

describe('commission', () => {
  afterEach(() => setCommissionRate(DEFAULT_COMMISSION_RATE));

  it('getCommissionRate returns the default rate before anything overrides it', () => {
    expect(getCommissionRate()).toBe(DEFAULT_COMMISSION_RATE);
  });

  it('DEFAULT_COMMISSION_RATE is a fraction between 0 and 1', () => {
    expect(DEFAULT_COMMISSION_RATE).toBeGreaterThan(0);
    expect(DEFAULT_COMMISSION_RATE).toBeLessThan(1);
  });

  it('setCommissionRate updates what getCommissionRate returns', () => {
    setCommissionRate(0.2);
    expect(getCommissionRate()).toBe(0.2);
  });
});
