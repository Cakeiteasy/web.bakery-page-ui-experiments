import { ACTIVE_BAKERY_STORAGE_KEY } from '../config/bakeries.config';
import { getActiveBakeryOption, getStoredBakeryKey, setStoredBakeryKey } from './active-bakery.util';

describe('active-bakery util', () => {
  beforeEach(() => {
    localStorage.removeItem(ACTIVE_BAKERY_STORAGE_KEY);
  });

  afterEach(() => {
    localStorage.removeItem(ACTIVE_BAKERY_STORAGE_KEY);
  });

  it('returns rosenborg by default when storage is empty', () => {
    expect(getStoredBakeryKey()).toBe('rosenborg');
    expect(getActiveBakeryOption().api.bakeryId).toBe(113);
  });

  it('stores and resolves maschmanns key', () => {
    setStoredBakeryKey('maschmanns');

    expect(getStoredBakeryKey()).toBe('maschmanns');
    expect(getActiveBakeryOption().api.bakeryId).toBe(531);
  });
});
